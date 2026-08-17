#!/usr/bin/env node
// check_skill_commands.mjs — 스킬 문서에 적힌 factory 명령이 실제 인자 계약과 맞는지 검사한다.
//
// 왜 필요한가. 외부 전문가 검토(2026-08-16)가 `game-polish` SKILL.md의 자산 재생성 명령이
// 즉시 `Missing required --project <dir>`로 죽는다는 것을 찾아냈다. 문서에 적힌 명령을
// 아무도 실행해 보지 않았기 때문이다.
//
// ── 이 검사는 어떤 하위 프로세스도 띄우지 않는다 ─────────────────────────────
// 이전 판은 "인자를 받아들이는지 보려면 돌려 봐야 한다"고 생각해 `npm run <script>`를
// spawnSync로 실행했다. 두 가지가 동시에 무너졌다.
//
//   1. 재귀 — 문서에 `npm --prefix dev_game run factory:qa`가 있고, `factory:qa` 체인은
//      `factory:skill-commands`를 포함한다. 즉 이 검사가 자기 자신을 다시 불렀다.
//   2. fail-open — 그 호출은 15초 timeout으로 죽었는데 `spawnSync`의 error/status/signal을
//      아무도 보지 않았다. 출력이 비어 "필수 플래그 없음"이 되고 그대로 GREEN이 됐다.
//
//   실측: `time node scripts/check_skill_commands.mjs` → real 30.69s (= 15s timeout × 2),
//   그러고도 `OK (7개 명령이 인자 파싱을 통과)`.
//
//   **실패했기 때문에 통과한 것이다.** 그리고 이 검사는 factory:qa 완료 체인 안에 있다.
//
// 그래서 지금은 스크립트 소스를 **읽어서** 인자 계약을 뽑는다. 같은 정보이고 부작용이 없다.
// 하위 프로세스가 없으므로 재귀·timeout·npm 부재·좀비 프로세스가 구조적으로 불가능하다.
// (계획 implement_20260816_141036 §명령 검사기 안전 계약)
// ─────────────────────────────────────────────────────────────────────────────
//
// 검사 항목
//   · 문서의 명령이 부르는 npm script가 package.json에 등록돼 있는가
//   · 그 script가 선언한 필수 플래그를 명령이 전부 넘기는가
//   · 명령이 script가 모르는 플래그를 넘기지 않는가
//   · 치환되지 않은 placeholder가 남아 있지 않은가 (남으면 RED, skip 아님)
//   · command inventory의 **책임**이 전부 문서에 남아 있는가
//
// 검사하지 않는 것: 다이어트 품질. 명령 총수는 판정 기준이 아니다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateDocCommand, docKnownFlags } from './lib/doc-command-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_INVENTORY = path.join(ROOT, 'dev_game', 'docs', 'skill-conformance',
  'implement_20260816_220415', 'command-inventory.json');
const DEFAULT_CONTRACTS = path.join(ROOT, 'dev_game', 'generator', 'scripts', 'cli-contracts.json');
// 판정은 공용 계약에 위임한다. 검사기가 자기 규칙을 가지면 계약이 둘이 되고, 그 둘이
// 어긋나는 것이 원래 결함이었다(문서의 `--mode turbo`가 통과하고 실제 파서는 throw).

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--skills-root') args.skillsRoot = argv[++i];
    else if (a === '--inventory') args.inventory = argv[++i];
    else if (a === '--package') args.pkg = argv[++i];
    else if (a === '--contracts') args.contracts = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage:
  node scripts/check_skill_commands.mjs [--skills-root <dir>] [--inventory <json>]
       [--package <json>] [--contracts <json>]

스킬 문서의 factory 명령이 실제 인자 계약과 맞는지 정적으로 검사한다. 하위 프로세스를 띄우지
않는다. --skills-root로 fixture 디렉터리를 주입해 양성 대조를 돌릴 수 있다.`);
  process.exit(0);
}

const args = parseArgs(process.argv.slice(2));
const SKILLS = path.resolve(args.skillsRoot || path.join(ROOT, 'skills'));
const PKG = path.resolve(args.pkg || path.join(ROOT, 'dev_game', 'package.json'));
const INVENTORY = path.resolve(args.inventory || DEFAULT_INVENTORY);
const CONTRACTS = path.resolve(args.contracts || DEFAULT_CONTRACTS);
const DEV_GAME = path.dirname(PKG);
const GENERATED = path.join(DEV_GAME, 'generated');

const problems = [];

// 읽기는 전부 fail-closed다. 못 읽으면 "문제 없음"이 아니라 문제다.
function readOrFail(file, label) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    problems.push(`${label}을 읽을 수 없다: ${file}\n    ${err.message}`);
    return null;
  }
}

// ── 검사기 자기 시험 (계약 §0.1) ──────────────────────────────────────────────
// 토큰화가 깨지면 모든 결과가 오탐이므로 먼저 확인한다.
function tokenize(line) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(line)) !== null) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}
{
  const got = tokenize('factory:make -- --name "My Game" --out generated/x');
  const want = ['factory:make', '--', '--name', 'My Game', '--out', 'generated/x'];
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    console.error('skill commands check failed: 토큰화 자기 시험 실패');
    console.error(`  기대: ${JSON.stringify(want)}`);
    console.error(`  실제: ${JSON.stringify(got)}`);
    process.exit(1);
  }
}

// ── placeholder ───────────────────────────────────────────────────────────────
// 예시용 자리표시자는 실재하는 값으로 바꾼다. 없는 게임을 가리키면 "명령이 틀렸다"와
// "대상이 없다"를 구분할 수 없다. 지도에 없는 자리표시자가 남으면 skip이 아니라 RED다 —
// skip은 검사받지 않은 명령을 통과로 세는 길이다.
function pickGameId() {
  try {
    const dirs = fs.readdirSync(GENERATED)
      .filter((n) => fs.existsSync(path.join(GENERATED, n, 'package.json')));
    return dirs[0] || null;
  } catch {
    return null;
  }
}
const GAME_ID = pickGameId() || 'poop-dodge';
const PLACEHOLDERS = new Map([
  ['<game-id>', GAME_ID],
  ['<id>', GAME_ID],
  ['<dir>', `generated/${GAME_ID}`],
  ['<path>', `generated/${GAME_ID}`],
  ['<asset-id>', 'stage-1'],
]);

function substitute(cmd) {
  let out = cmd;
  for (const [token, value] of PLACEHOLDERS) out = out.split(token).join(value);
  const leftover = out.match(/<[^>\s]+>/g);
  return { out, leftover: leftover ? [...new Set(leftover)] : [] };
}

// ── npm script 해석 ───────────────────────────────────────────────────────────
const pkgRaw = readOrFail(PKG, 'package.json');
let scripts = {};
if (pkgRaw !== null) {
  try {
    scripts = JSON.parse(pkgRaw).scripts || {};
  } catch (err) {
    problems.push(`package.json을 파싱할 수 없다: ${err.message}`);
  }
}

const contractRaw = readOrFail(CONTRACTS, 'CLI contracts');
let cliContracts = {};
if (contractRaw !== null) {
  try {
    const parsed = JSON.parse(contractRaw);
    cliContracts = parsed.scripts || {};
    if (!parsed.schemaVersion || !Object.keys(cliContracts).length) {
      problems.push('CLI contracts에 schemaVersion 또는 scripts가 없다');
    }
  } catch (err) {
    problems.push(`CLI contracts를 파싱할 수 없다: ${err.message}`);
  }
}

// 하나의 npm script는 두 종류다.
//   · node 실행형  "node generator/scripts/x.mjs"  → 소스를 읽어 인자 계약을 뽑는다
//   · 집합형       "npm run a && npm run b"        → 구성원이 전부 등록돼 있는지만 본다
function classify(name) {
  const value = scripts[name];
  if (typeof value !== 'string') return { kind: 'missing' };
  if (/\bnpm run\b/.test(value)) {
    const members = [...new Set([...value.matchAll(/npm run ([a-z0-9:_-]+)/g)].map((m) => m[1]))];
    return { kind: 'aggregate', members };
  }
  const node = /^\s*node\s+(\S+)/.exec(value);
  if (node) return { kind: 'node', file: path.resolve(DEV_GAME, node[1]) };
  return { kind: 'opaque', value };
}

// 소스에서 인자 계약을 뽑는다. 이 저장소의 스크립트는 두 패턴으로 선언한다.
//   required : `Missing required --project <dir>` / `Required: --project <dir> --url <u>`
//   known    : parse 루프의 `a === '--flag'` 문자열 리터럴
const contractCache = new Map();
function argContractOf(file) {
  if (contractCache.has(file)) return contractCache.get(file);
  let src;
  try {
    src = fs.readFileSync(file, 'utf8');
  } catch (err) {
    const bad = { error: err.message, required: [], known: [] };
    contractCache.set(file, bad);
    return bad;
  }
  const required = new Set();
  for (const m of src.matchAll(/Missing required (--[a-z][a-z0-9-]*)/g)) required.add(m[1]);
  for (const m of src.matchAll(/Required:\s*([^\n'"`]*)/g)) {
    for (const f of m[1].matchAll(/--[a-z][a-z0-9-]*/g)) required.add(f[0]);
  }
  const known = new Set();
  // 긴 플래그와 **단일 대시 별칭**(`-h`)을 모두 본다. 긴 것만 훑던 판은 계약이 선언한 `-h`를
  // "소스에 없는 플래그"로 신고했다 — 실제로는 네 leaf 모두 `-h`를 처리한다.
  for (const m of src.matchAll(/['"](--[a-z][a-z0-9-]*|-[a-z])['"]/g)) known.add(m[1]);
  const contract = { error: null, required: [...required], known: [...known] };
  contractCache.set(file, contract);
  return contract;
}

// ── 문서에서 명령을 뽑는다 ────────────────────────────────────────────────────
function extractCommands(md) {
  const out = [];
  for (const m of md.matchAll(/`([^`\n]*npm --prefix dev_game run factory:[^`\n]*)`/g)) out.push(m[1].trim());
  for (const block of md.matchAll(/```[a-z]*\n([\s\S]*?)```/g)) {
    for (const line of block[1].split('\n')) {
      const t = line.trim().replace(/\s+#.*$/, ''); // 줄 끝 주석 제거
      if (t.startsWith('npm --prefix dev_game run factory:')) out.push(t);
    }
  }
  return [...new Set(out)];
}

let skillDirs = [];
try {
  skillDirs = fs.readdirSync(SKILLS).filter((n) => fs.existsSync(path.join(SKILLS, n, 'SKILL.md')));
} catch (err) {
  problems.push(`skills 루트를 읽을 수 없다: ${SKILLS}\n    ${err.message}`);
}
if (!problems.length && !skillDirs.length) {
  problems.push(`skills 루트에 SKILL.md를 가진 디렉터리가 하나도 없다: ${SKILLS}`);
}

const perSkill = new Map();
const seen = []; // {skill, script, flags}
let checked = 0;

for (const skill of skillDirs) {
  const md = readOrFail(path.join(SKILLS, skill, 'SKILL.md'), `${skill}/SKILL.md`);
  if (md === null) continue;
  const raws = extractCommands(md);
  perSkill.set(skill, raws.length);

  for (const raw of raws) {
    const { out: cmd, leftover } = substitute(raw);
    if (leftover.length) {
      problems.push(`${skill}/SKILL.md\n    명령: ${raw}\n    `
        + `치환되지 않은 자리표시자: ${leftover.join(', ')} — 검사할 수 없는 명령은 통과가 아니다`);
      continue;
    }

    const tokens = tokenize(cmd.replace(/^npm --prefix dev_game run /, '')).filter((a) => a !== '--');
    const script = tokens[0];
    const flags = tokens.slice(1).filter((a) => a.startsWith('--'));
    checked += 1;
    seen.push({ skill, script, flags });

    const info = classify(script);
    if (info.kind === 'missing') {
      problems.push(`${skill}/SKILL.md\n    명령: ${raw}\n    `
        + `${script}가 dev_game/package.json에 등록돼 있지 않다`);
      continue;
    }
    if (info.kind === 'aggregate') {
      for (const member of info.members) {
        if (typeof scripts[member] !== 'string') {
          problems.push(`${skill}/SKILL.md\n    명령: ${raw}\n    `
            + `${script} 체인이 부르는 ${member}가 등록돼 있지 않다`);
        }
      }
      if (flags.length) {
        problems.push(`${skill}/SKILL.md\n    명령: ${raw}\n    `
          + `${script}는 집합 명령이라 플래그(${flags.join(', ')})를 검증할 수 없다`);
      }
      continue;
    }
    if (info.kind === 'opaque') {
      problems.push(`${skill}/SKILL.md\n    명령: ${raw}\n    `
        + `${script}의 실행 형태를 해석할 수 없다: ${info.value}`);
      continue;
    }

    const contract = argContractOf(info.file);
    if (contract.error) {
      problems.push(`${skill}/SKILL.md\n    명령: ${raw}\n    `
        + `${script}의 소스를 읽을 수 없다 (${info.file}): ${contract.error}`);
      continue;
    }
    const declared = cliContracts[script];
    if (!declared || !declared.flags
      || !Array.isArray(declared.requiredAll) || !Array.isArray(declared.requiredOneOf)) {
      problems.push(`${skill}/SKILL.md\n    명령: ${raw}\n    `
        + `${script}의 명시적 CLI contract가 없다 — 오류 문구에서 필수 인자를 추측하지 않는다`);
      continue;
    }
    const declaredFlags = new Set(docKnownFlags(script, CONTRACTS));
    const sourceMissing = [...declaredFlags].filter((f) => !contract.known.includes(f));
    if (sourceMissing.length) {
      problems.push(`${script} CLI contract가 소스와 어긋난다. 소스에서 찾을 수 없는 플래그: `
        + sourceMissing.join(', '));
    }
    const badRequired = [
      ...declared.requiredAll,
      ...declared.requiredOneOf.flat(),
    ].filter((f) => !declaredFlags.has(f));
    if (badRequired.length) {
      problems.push(`${script} CLI contract의 required 플래그가 knownFlags에 없다: `
        + [...new Set(badRequired)].join(', '));
    }
    // 에러 문구에서 찾은 required는 보조 교차검사일 뿐, 판정 정본은 명시적 contract다.
    const undeclaredRequired = contract.required.filter((f) => !declared.requiredAll.includes(f)
      && !declared.requiredOneOf.some((group) => group.includes(f)));
    if (undeclaredRequired.length) {
      problems.push(`${script} 소스가 필수라고 말하지만 CLI contract에 없는 플래그: `
        + undeclaredRequired.join(', '));
    }
    // 값과 enum까지 **공용 검증기**로 본다. 이름만 보던 판은 `--mode turbo`를 통과시켰다.
    const verdict = validateDocCommand(script, tokens.slice(1), CONTRACTS);
    for (const error of verdict.errors) {
      const label = { E_UNKNOWN_FLAG: '미지원 플래그', E_MISSING_REQUIRED: '누락',
        E_MISSING_ONE_OF: '누락', E_MISSING_VALUE: '값 누락',
        E_BAD_ENUM: '잘못된 값', E_BAD_INTEGER: '잘못된 값' }[error.code] || error.code;
      problems.push(`${skill}/SKILL.md\n    명령: ${raw}\n    ${label}: ${error.message}`);
    }
  }
}

// ── command inventory ─────────────────────────────────────────────────────────
// 다이어트는 중복 명령을 지워도 된다. 지우면 안 되는 것은 **책임**이다.
// 총수가 아니라 책임 단위로 본다 — 총수 하한만 두면 정당한 중복 제거가 RED가 된다.
const invRaw = readOrFail(INVENTORY, 'command inventory');
let inventory = null;
if (invRaw !== null) {
  try {
    inventory = JSON.parse(invRaw);
  } catch (err) {
    problems.push(`command inventory를 파싱할 수 없다: ${err.message}`);
  }
}
if (inventory) {
  const entries = Array.isArray(inventory.commands) ? inventory.commands : null;
  if (!entries || !entries.length) {
    problems.push('command inventory에 commands 배열이 없다 — 지켜야 할 책임이 정의되지 않았다');
  } else {
    for (const entry of entries) {
      const declared = cliContracts[entry.script];
      const contractUnknown = (entry.requiredFlags || [])
        .filter((f) => declared && !docKnownFlags(entry.script, CONTRACTS).includes(f));
      if (contractUnknown.length) {
        problems.push(`command inventory ${entry.id}가 CLI contract에 없는 플래그를 요구한다: `
          + contractUnknown.join(', '));
      }
      const hit = seen.some((s) => s.skill === entry.skill && s.script === entry.script
        && (entry.requiredFlags || []).every((f) => s.flags.includes(f)));
      if (!hit) {
        problems.push(`command inventory 미충족: ${entry.id}\n    `
          + `${entry.skill}에 \`${entry.script}\`${(entry.requiredFlags || []).length ? ` ${entry.requiredFlags.join(' ')}` : ''} 형태의 명령이 없다\n    `
          + `책임: ${entry.responsibility}`);
      }
    }
    // 공허 통과 방지 보조 assert. 품질 판정이 아니다.
    if (checked < entries.length) {
      problems.push(`검사된 명령 ${checked}개 < inventory 항목 ${entries.length}개 — `
        + '문서에서 명령이 통째로 사라졌을 때 공허하게 통과하는 것을 막는 보조 검사다');
    }
  }
}

// ── 보고 ──────────────────────────────────────────────────────────────────────
if (problems.length) {
  console.error('skill commands check failed — 문서에 적힌 명령이 인자 계약과 맞지 않는다:');
  for (const p of problems) console.error(`- ${p}`);
  console.error('\n문서의 명령은 복사해서 쓰라고 적는 것이다. 돌지 않으면 문서가 아니라 오답이다.');
  process.exit(1);
}

const counts = [...perSkill.entries()].map(([s, n]) => `${s}=${n}`).join(' ');
console.log(`skill commands: OK (${checked}개 명령이 인자 계약을 통과, 대상 게임 ${GAME_ID})`);
console.log(`  스킬별 명령 수: ${counts}`);
console.log('  명령 수 0은 결함이 아니다. 다른 스킬의 명령으로 그 스킬의 품질을 증명하지 않는다.');
