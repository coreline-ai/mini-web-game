#!/usr/bin/env node
// check_skill_gate_controls.mjs — 스킬 게이트 3종의 음성·양성 대조를 한 번에 돌린다.
//
// 계약 §0.1: 새 검사기의 출력이 증거로 인정되려면 음성 대조(정상 입력에서 GREEN)와
// 양성 대조(알려진 결함 입력에서 RED)를 모두 통과해야 한다. 재현 가능성은 정확성이 아니다.
//
// 그 대조를 한 번 돌리고 결과를 대화에 남기는 것으로는 부족하다. 다음 사람이 검사기를
// 고칠 때 대조가 여전히 성립하는지 확인할 방법이 있어야 한다. 그래서 대조군 자체를
// 실행 가능한 산출물로 고정한다.
//
// 여기서 RED가 나면 fixture가 아니라 **검사기**를 의심할 것. fixture는 의도적으로 결함이
// 들어 있는 입력이고, 그 입력에서 GREEN이 나오는 것이 진짜 사고다.
//
// ── 종료 코드만 보면 이 harness 자신이 fail-open이다 ─────────────────────────
// 첫 판은 `exit === expect`만 봤다. 독립 검토(2026-08-16)가 그걸 뚫었다 — fixture 디렉터리를
// 지우면 검사기가 "그런 경로 없음"으로 죽어서 exit 1이 되고, harness는 그걸 "양성 대조
// 기대대로 ✓"로 셌다. 양성 fixture 16개를 **전부 지워도** `19개 대조군 전부 기대대로`가
// 출력됐다.
//
// 즉 §0.1 증거를 만드는 도구가 알려진 결함 입력에서 GREEN이었다. 그래서 지금은 셋을 본다.
//   1. fixture 경로가 실재하는가 (없으면 대조가 성립하지 않는다)
//   2. 종료 코드가 기대와 같은가
//   3. **실패 사유가 의도한 결함과 같은가** — 지문(expect 문자열)을 대조한다
// 다른 이유로 죽은 RED는 통과가 아니다. 그게 이 harness를 뚫은 구멍이었다.
// ─────────────────────────────────────────────────────────────────────────────

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIX = path.join(ROOT, 'dev_game', 'docs', 'skill-conformance', 'implement_20260816_220415', 'fixtures');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage:
  node scripts/check_skill_gate_controls.mjs

check_skill_commands / check_skill_drift / check_skill_conformance 세 검사기의
음성·양성 대조를 fixture로 전부 돌리고 기대 종료 코드와 대조한다.`);
  process.exit(0);
}

// expect: 0 = 음성 대조(통과해야 함), 1 = 양성 대조(막아야 함)
// expectText: 양성 대조가 **그 결함 때문에** 죽었는지 확인하는 지문. 음성 대조는 null.
const CONTROLS = [];

const commandsDir = path.join(FIX, 'commands');
for (const [name, expect, expectText] of [
  ['ok', 0, null],
  ['missing-required-flag', 1, '누락: --project'],
  ['unknown-script', 1, '등록돼 있지 않다'],
  ['leftover-placeholder', 1, '치환되지 않은 자리표시자'],
  // 지문은 배타적이어야 한다. 한 번 `command inventory 미충족`에서 `검사된 명령 0개`로
  // 바꿨는데, **둘 다 leftover-placeholder도 내는 공유 문자열**이라 교차가 그대로였다.
  // 공유 문자열을 다른 공유 문자열로 바꾸고 교차 매칭을 다시 돌리지 않은 것이 원인이다.
  // 아래는 두 fixture의 requiredFlags가 달라서 실제로 배타적인 지문이다(3회차 실측).
  ['responsibility-removed', 1, '--project --require-gpt-imagegen 형태의 명령이 없다'],
  ['unsupported-flag', 1, '미지원 플래그: --turbo-mode'],
  ['hidden-required-flag', 1, '누락: --token'],
]) {
  const argv = ['scripts/check_skill_commands.mjs',
    '--skills-root', path.join(commandsDir, name, 'skills'),
    '--inventory', path.join(commandsDir, name, 'inventory.json')];
  const needs = [path.join(commandsDir, name, 'skills'), path.join(commandsDir, name, 'inventory.json')];
  if (name === 'hidden-required-flag') {
    argv.push('--package', path.join(commandsDir, name, 'package.json'),
      '--contracts', path.join(commandsDir, name, 'contracts.json'));
    needs.push(path.join(commandsDir, name, 'package.json'), path.join(commandsDir, name, 'contracts.json'));
  }
  CONTROLS.push({
    gate: 'commands', name, expect, expectText,
    needs,
    argv,
  });
}

const structDir = path.join(FIX, 'structure');
for (const [name, expect, expectText] of [
  ['ok', 0, null],
  ['broken-frontmatter', 1, 'fence가 없거나 닫히지 않았다'],
  ['unparseable-frontmatter', 1, 'YAML로 파싱되지 않는다'],
  ['unparseable-openai-yaml', 1, 'agents/openai.yaml: YAML로 파싱되지 않는다'],
  ['empty-description', 1, 'description이 비어 있다'],
  ['missing-openai-yaml', 1, 'agents/openai.yaml이 없다'],
  ['incomplete-openai-yaml', 1, 'interface.default_prompt가 없거나'],
  ['missing-skill-token', 1, 'interface.default_prompt가 $demo-skill을 명시하지 않는다'],
  ['short-description-length', 1, 'interface.short_description은 25~64자여야 한다'],
  ['name-mismatch', 1, 'name이 디렉터리와 다르다'],
]) {
  CONTROLS.push({
    gate: 'structure', name, expect, expectText, bash: true,
    needs: [path.join(structDir, name, 'skills')],
    argv: ['scripts/check_skill_drift.sh', '--skills-root', path.join(structDir, name, 'skills')],
  });
}

const motionDir = path.join(ROOT, 'skills', 'game-feel-motion-skill');
const motionValidator = path.join(motionDir, 'scripts', 'validate_spritesheet_manifest.py');
for (const [name, fixture, expect, expectText] of [
  ['valid-manifest', 'valid-spritesheet-manifest.json', 0, '[OK] spritesheet manifest passed'],
  ['invalid-manifest', 'invalid-spritesheet-manifest.json', 1, '[FAIL] id must be string'],
]) {
  const fixturePath = path.join(motionDir, 'assets', 'fixtures', fixture);
  CONTROLS.push({
    gate: 'motion-validator', name, expect, expectText, bin: 'python3',
    needs: [motionValidator, fixturePath],
    argv: [motionValidator, fixturePath],
  });
}

const confDir = path.join(FIX, 'conformance');
for (const [name, expect, expectText] of [
  ['ok', 0, null],
  ['plan-body-changed', 1, 'normalized hash 불일치'],
  ['evidence-missing', 1, '템플릿 자리표시자가 남아 있다'],
  ['prior-not-approved', 1, '선행 미승인 상태에서'],
  ['out-of-scope-path', 1, '범위 밖 변경: danger/secret.js'],
  ['unstaged-out-of-scope', 1, '범위 밖 변경: danger/secret.js'],
  ['committed-out-of-scope', 1, '범위 밖 변경: danger/secret.js (committed)'],
  ['missing-section', 1, '필수 절'],
  ['no-reports', 1, '보고서가 하나도 없다'],
  ['prior-approved-artifact-modified', 1, '이전 PASS가 무효'],
  ['orphan-manifest', 1, '고아 승인 기록'],
  ['self-issued-pass', 1, 'PASS에 발급자 귀속이 없다'],
  ['chain-link-decoy', 1, '정본 경로가 아니다'],
  ['attributed-line-elsewhere', 1, '귀속이 없다'],
  ['duplicate-phase-report', 1, '보고서가 2개다'],
  ['self-referential-manifest', 1, '자기 자신을 담고 있다'],
  ['chain-link-missing', 1, '사슬 링크가 없다'],
]) {
  // committed delta는 **항상** 명시적으로 선언한다. 변경이 없는 fixture는 빈 파일을 준다.
  // 선언을 생략하면 검사기가 committed 범위 검사를 끈 채 통과하던 구멍이 있었다.
  CONTROLS.push({
    gate: 'conformance', name, expect, expectText,
    needs: [path.join(confDir, name, 'plan.md'), path.join(confDir, name, 'conf'),
      path.join(confDir, name, 'committed-paths.txt')],
    argv: ['scripts/check_skill_conformance.mjs',
      '--plan', path.join(confDir, name, 'plan.md'),
      '--conformance-dir', path.join(confDir, name, 'conf'),
      '--repo-root', path.join(confDir, name),
      '--status-file', path.join(confDir, name, 'status.txt'),
      '--committed-paths-file', path.join(confDir, name, 'committed-paths.txt')],
  });
}

// 양성 대조: status만 주입하고 committed delta를 선언하지 않으면 RED여야 한다.
// 통과하는 `ok` fixture를 그대로 쓰되 선언만 뺀다 — 다른 이유로 붉어질 여지를 없앤다.
CONTROLS.push({
  gate: 'conformance', name: 'status-file-without-committed-paths', expect: 1,
  expectText: '--status-file은 --committed-paths-file과 함께 써야 한다',
  needs: [path.join(confDir, 'ok', 'plan.md'), path.join(confDir, 'ok', 'conf')],
  argv: ['scripts/check_skill_conformance.mjs',
    '--plan', path.join(confDir, 'ok', 'plan.md'),
    '--conformance-dir', path.join(confDir, 'ok', 'conf'),
    '--repo-root', path.join(confDir, 'ok'),
    '--status-file', path.join(confDir, 'ok', 'status.txt')],
});

// ── 실제 git 대조군 ──────────────────────────────────────────────────────────
// 위 17개는 전부 status/committed를 주입하는 synthetic fixture다. 즉 **CI에서 실제로 도는
// 경로 — `git status`와 `git diff baselineHead..HEAD` — 를 검증하는 대조군이 0개였다.**
// 주입 경로만 초록이고 실전 경로는 한 번도 실행되지 않는 상태였으므로, 여기서 진짜 저장소를
// 만들어 두 갈래(범위 안 커밋 → GREEN, 범위 밖 커밋 → RED)를 돌린다.
const gitRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'conformance-git-'));
function git(cwd, ...argv) {
  const r = spawnSync('git', ['-c', 'user.email=gate@fixture', '-c', 'user.name=gate',
    '-c', 'commit.gpgsign=false', ...argv], { cwd, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${argv.join(' ')} 실패: ${r.stderr || r.stdout}`);
  return (r.stdout || '').trim();
}
function buildGitFixture(name, outOfScope, opts = {}) {
  const dir = path.join(gitRoot, name);
  fs.cpSync(path.join(confDir, 'ok'), dir, { recursive: true });
  fs.rmSync(path.join(dir, 'status.txt'), { force: true });
  fs.rmSync(path.join(dir, 'committed-paths.txt'), { force: true });
  // 승인서는 baseline 커밋 이후에 sha를 적어야 하므로 conf/를 상시 허용으로 둔다.
  const ownPath = path.join(dir, 'conf', 'path-ownership.json');
  const ownership = JSON.parse(fs.readFileSync(ownPath, 'utf8'));
  ownership.alwaysAllowed = [...new Set([...(ownership.alwaysAllowed || []), 'conf/'])];
  fs.writeFileSync(ownPath, `${JSON.stringify(ownership, null, 2)}\n`);
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'baseline');
  const baseline = git(dir, 'rev-parse', 'HEAD');
  const approvalPath = path.join(dir, 'conf', 'approved-plan.json');
  const approval = JSON.parse(fs.readFileSync(approvalPath, 'utf8'));
  // baselineHead가 HEAD의 조상이 아니면(승인되지 않은 rebase·기준선 교체) 변경 범위를
  // 증명할 수 없다. 그 가드는 실제 git 경로에서만 도달하므로 여기서만 걸 수 있다.
  approval.baselineHead = opts.badBaseline || baseline;
  fs.writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`);
  // Phase 1 소유 경로 안에서의 실제 커밋. 여기까지는 GREEN이어야 한다.
  // 이미 승인된 `src/a.js`는 건드리지 않는다 — 고치면 Phase 1의 PASS가 무효가 되어
  // 이 대조군이 **범위 검사가 아닌 다른 이유로** 붉어진다(실측으로 한 번 그렇게 됐다).
  fs.writeFileSync(path.join(dir, 'src', 'b.js'), 'export const b = 1;\n');
  if (outOfScope) {
    fs.mkdirSync(path.join(dir, 'danger'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'danger', 'secret.js'), 'export const leak = 1;\n');
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'phase 1 work');
  // 작업 트리를 더럽힌 채 남긴다 — 실제 `git status` 경로를 검증하는 유일한 대조군이다.
  // 앞선 두 fixture는 전부 커밋해 트리가 깨끗했고, 그래서 dirty 검사를 통째로 꺼도
  // 39개 대조군 전부가 초록이었다(독립 검토 실측).
  if (opts.dirty) {
    fs.mkdirSync(path.join(dir, 'danger'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'danger', 'secret.js'), 'export const leak = 2;\n');
  }
  return dir;
}
for (const [name, outOfScope, expect, expectText, opts] of [
  ['real-git-in-scope', false, 0, null, {}],
  ['real-git-committed-out-of-scope', true, 1, '범위 밖 변경: danger/secret.js (committed)', {}],
  ['real-git-dirty-out-of-scope', false, 1, '범위 밖 변경: danger/secret.js', { dirty: true }],
  ['real-git-baseline-not-ancestor', false, 1, '조상이 아니다',
    { badBaseline: '0123456789012345678901234567890123456789' }],
]) {
  const dir = buildGitFixture(name, outOfScope, opts);
  CONTROLS.push({
    gate: 'conformance', name, expect, expectText,
    needs: [path.join(dir, 'plan.md'), path.join(dir, '.git')],
    argv: ['scripts/check_skill_conformance.mjs',
      '--plan', path.join(dir, 'plan.md'),
      '--conformance-dir', path.join(dir, 'conf'),
      '--repo-root', dir],
  });
}

// 양성 대조: `phase-0-*.md`로 이름 지으면 보고서는 존재하므로 "보고서가 없다"를 통과하고
// currentPhase가 0이 되어 경로 소유권 검사 전체(dirty + committed)가 침묵 SKIP된다.
{
  const dir = path.join(gitRoot, 'phase-zero');
  fs.cpSync(path.join(confDir, 'ok'), dir, { recursive: true });
  fs.renameSync(path.join(dir, 'conf', 'phase-1-a.md'), path.join(dir, 'conf', 'phase-0-a.md'));
  fs.writeFileSync(path.join(dir, 'status.txt'), '?? danger/secret.js\n');
  fs.writeFileSync(path.join(dir, 'committed-paths.txt'), 'danger/committed-leak.js\n');
  CONTROLS.push({
    gate: 'conformance', name: 'phase-zero-report-name', expect: 1,
    expectText: 'Phase 번호는 1부터다',
    needs: [path.join(dir, 'plan.md'), path.join(dir, 'conf', 'phase-0-a.md')],
    argv: ['scripts/check_skill_conformance.mjs',
      '--plan', path.join(dir, 'plan.md'),
      '--conformance-dir', path.join(dir, 'conf'),
      '--repo-root', dir,
      '--status-file', path.join(dir, 'status.txt'),
      '--committed-paths-file', path.join(dir, 'committed-paths.txt')],
  });
}

// fixture가 통째로 사라지면 대조군 0개로 공허하게 통과한다. 그것부터 막는다.
if (!fs.existsSync(FIX)) {
  console.error(`gate controls failed: fixture 디렉터리가 없다 — ${FIX}`);
  process.exit(1);
}

const failures = [];
let lastGate = null;
for (const c of CONTROLS) {
  if (c.gate !== lastGate) {
    console.log(`\n== ${c.gate} ==`);
    lastGate = c.gate;
  }
  const kind = c.expect === 0 ? '음성' : '양성';

  // (1) fixture가 실재하는가. 없으면 검사기는 "경로 없음"으로 죽고, 종료 코드만 보면
  // 그게 양성 대조 통과로 보인다. 그 구멍이 이 harness를 뚫었다.
  const missing = (c.needs || []).filter((p) => !fs.existsSync(p));
  if (missing.length) {
    failures.push(`${c.gate}/${c.name}: fixture가 없다 — ${missing.join(', ')}\n`
      + '    fixture 없이 나온 RED는 대조가 아니다');
    console.log(`  ${c.name.padEnd(34)} fixture 없음 ✗`);
    continue;
  }

  const opts = { cwd: ROOT, encoding: 'utf8', timeout: 30_000 };
  const bin = c.bin || (c.bash ? 'bash' : process.execPath);
  const r = spawnSync(bin, c.argv, opts);

  // (2) spawn 실패·timeout·signal은 결과를 읽을 수 없다는 뜻이다. 통과가 아니다.
  if (r.error || r.signal || typeof r.status !== 'number') {
    failures.push(`${c.gate}/${c.name}: 검사기를 실행하지 못했다 — `
      + `${r.error?.message || `signal=${r.signal}`}`);
    console.log(`  ${c.name.padEnd(34)} 실행 실패 ✗`);
    continue;
  }

  // (3) 종료 코드와 **실패 사유**를 함께 본다.
  const output = `${r.stdout || ''}${r.stderr || ''}`;
  const codeOk = r.status === c.expect;
  const textOk = !c.expectText || output.includes(c.expectText);
  const ok = codeOk && textOk;
  const mark = ok ? '기대대로 ✓' : (codeOk ? '사유 불일치 ✗' : '기대와 다름 ✗');
  console.log(`  ${c.name.padEnd(34)} ${kind} 대조  exit=${r.status}  ${mark}`);
  if (!codeOk) {
    failures.push(`${c.gate}/${c.name}: ${kind} 대조 실패 (기대 exit=${c.expect}, 실제 ${r.status})\n`
      + `    ${output.split('\n').filter(Boolean).slice(-2).join('\n    ')}`);
  } else if (!textOk) {
    failures.push(`${c.gate}/${c.name}: 종료 코드는 맞지만 **다른 이유로** 실패했다.\n`
      + `    기대한 사유: "${c.expectText}"\n`
      + `    실제 출력: ${output.split('\n').filter(Boolean).slice(-2).join(' / ')}`);
  }
}

fs.rmSync(gitRoot, { recursive: true, force: true });

console.log('');
if (failures.length) {
  console.error('gate controls failed:');
  for (const f of failures) console.error(`- ${f}`);
  console.error('\nfixture가 아니라 검사기를 먼저 의심할 것 (계약 §0.1).');
  process.exit(1);
}
console.log(`gate controls OK: ${CONTROLS.length}개 대조군 전부 기대대로 `
  + `(음성 ${CONTROLS.filter((c) => c.expect === 0).length} / 양성 ${CONTROLS.filter((c) => c.expect === 1).length})`);
