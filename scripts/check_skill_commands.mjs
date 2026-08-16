#!/usr/bin/env node
// check_skill_commands.mjs — 스킬 문서에 적힌 명령이 실제로 실행 가능한지 검사한다.
//
// 왜 필요한가. 외부 전문가 검토(2026-08-16)가 `game-polish` SKILL.md의 자산 재생성 명령이
// 즉시 `Missing required --project <dir>`로 죽는다는 것을 찾아냈다. 문서에 적힌 명령을
// 아무도 실행해 보지 않았기 때문이다.
//
// 이 검사는 명령을 **끝까지 실행하지 않는다.** 이미지 생성은 자산당 수십 초가 걸리고 외부
// 호스트를 부른다. 대신 스크립트가 **인자를 받아들이는지**만 본다 — 필수 인자 누락, 알 수
// 없는 플래그, 존재하지 않는 스크립트 경로가 이 단계에서 전부 드러난다. 실제로 문제였던
// 것도 정확히 그 계층이었다.
//
// 검사 대상은 스킬 문서의 인라인 코드/펜스 안에 있는 `npm --prefix dev_game run factory:*`
// 형태의 명령이다. 예시용 자리표시자(<game-id> 등)는 실재하는 값으로 치환해서 돌린다.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS = path.join(ROOT, 'skills');
const GENERATED = path.join(ROOT, 'dev_game', 'generated');

// 자리표시자를 실재하는 값으로 바꾼다. 없는 게임을 가리키면 "명령이 틀렸다"와 "대상이
// 없다"를 구분할 수 없어 검사가 무의미해진다.
function pickGameId() {
  const dirs = fs.existsSync(GENERATED)
    ? fs.readdirSync(GENERATED).filter((n) => fs.existsSync(path.join(GENERATED, n, 'package.json')))
    : [];
  return dirs[0] || 'poop-dodge';
}
const GAME_ID = pickGameId();

const SUBSTITUTIONS = [
  [/<game-id>/g, GAME_ID],
  [/<asset-id>/g, 'stage-1'],
  [/<dir>/g, `generated/${GAME_ID}`],
];

function extractCommands(md) {
  const out = [];
  // 인라인 코드와 펜스 블록 양쪽에서 찾는다.
  for (const m of md.matchAll(/`([^`\n]*npm --prefix dev_game run factory:[^`\n]*)`/g)) out.push(m[1].trim());
  for (const block of md.matchAll(/```[a-z]*\n([\s\S]*?)```/g)) {
    for (const line of block[1].split('\n')) {
      const t = line.trim();
      if (t.startsWith('npm --prefix dev_game run factory:')) out.push(t);
    }
  }
  return [...new Set(out)];
}

function tokenize(line) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(line)) !== null) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

// 검사기 자기 시험 (계약 §0.1). 토큰화가 깨지면 모든 결과가 오탐이므로 먼저 확인한다.
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

// 스크립트를 인자 없이 실행해 필수 플래그를 알아낸다. 인자 검증은 어떤 작업보다 먼저
// 일어나므로 파일을 쓰거나 외부 호스트를 부르지 않는다.
const requiredCache = new Map();
function requiredFlagsOf(script) {
  if (requiredCache.has(script)) return requiredCache.get(script);
  const r = spawnSync('npm', ['--prefix', 'dev_game', 'run', script, '--silent'],
    { cwd: ROOT, encoding: 'utf8', timeout: 15_000 });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const flags = new Set();
  for (const m of out.matchAll(/Missing required (--[a-z-]+)/g)) flags.add(m[1]);
  for (const m of out.matchAll(/Required:\s*((?:--[a-z-]+[^\n]*))/g)) {
    for (const f of m[1].matchAll(/--[a-z-]+/g)) flags.add(f[0]);
  }
  const list = [...flags];
  requiredCache.set(script, list);
  return list;
}

// usage 텍스트에서 지원 플래그를 뽑는다. 실행이 아니라 --help 출력만 읽으므로 부작용이 없다.
const knownCache = new Map();
function knownFlagsOf(script) {
  if (knownCache.has(script)) return knownCache.get(script);
  const r = spawnSync('npm', ['--prefix', 'dev_game', 'run', script, '--silent', '--', '--help'],
    { cwd: ROOT, encoding: 'utf8', timeout: 15_000 });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const flags = [...new Set([...out.matchAll(/(--[a-z][a-z-]+)/g)].map((m) => m[1]))];
  knownCache.set(script, flags);
  return flags;
}

const problems = [];
let checked = 0;

for (const skill of fs.readdirSync(SKILLS)) {
  const file = path.join(SKILLS, skill, 'SKILL.md');
  if (!fs.existsSync(file)) continue;
  const md = fs.readFileSync(file, 'utf8');

  for (const raw of extractCommands(md)) {
    let cmd = raw;
    for (const [re, val] of SUBSTITUTIONS) cmd = cmd.replace(re, val);
    // 아직 자리표시자가 남아 있으면 실행할 수 없다 — 검사 대상에서 뺀다(오탐 방지).
    if (/<[a-z-]+>/i.test(cmd)) continue;

    // 따옴표를 인식해 토큰화한다. 공백으로 그냥 쪼개면 `--name "My Game"`이 세 토큰이 되어
    // 스크립트가 "Unknown argument"로 죽고, 문서가 멀쩡한데 검사가 실패한다 — 실제로 첫
    // 실행에서 그렇게 오탐이 났다(계약 §0.1: 도구를 먼저 의심할 것).
    const args = tokenize(cmd.replace(/^npm --prefix dev_game run /, '')).filter((a) => a !== '--');
    const script = args[0];
    const rest = args.slice(1);
    checked += 1;

    // 스크립트에게 **필수 인자가 무엇인지 직접 물어본다**(인자 없이 실행 → 즉시 에러).
    // 이 방식이어야 원래 결함을 잡는다. --help를 붙이면 인자 검증 **전에** 종료해 버려서,
    // --project가 빠진 명령도 통과했다(실측: 양성 대조 실패). 계약 §0.1 — 도구가 결함
    // 상태에서 RED가 되는지 먼저 확인할 것.
    const required = requiredFlagsOf(script);
    const missing = required.filter((flag) => !rest.includes(flag));
    if (missing.length) {
      problems.push(`${skill}/SKILL.md\n    명령: ${raw}\n    누락: ${missing.join(', ')} `
        + `(스크립트가 필수로 선언)`);
    }

    // **명령을 실제로 실행하지 않는다.** 처음에는 알 수 없는 플래그를 잡겠다고 인자를 그대로
    // 넘겨 실행했는데, 그러다 `factory:make`가 generated/my-game을 만들고 `factory:imagegen`이
    // bullseye-rush의 배경을 재생성했다 — 검사기가 저장소를 바꿔 버렸다. 검사는 관찰이지
    // 변경이 아니다. 알 수 없는 플래그는 스크립트의 usage 텍스트와 대조해서 본다.
    const known = knownFlagsOf(script);
    if (known.length) {
      const used = rest.filter((a) => a.startsWith('--'));
      const strays = used.filter((f) => !known.includes(f));
      if (strays.length) {
        problems.push(`${skill}/SKILL.md\n    명령: ${raw}\n    미지원 플래그: ${strays.join(', ')}`);
      }
    }
  }
}

if (problems.length) {
  console.error('skill commands check failed — 문서에 적힌 명령이 실행되지 않는다:');
  for (const p of problems) console.error(`- ${p}`);
  console.error('\n문서의 명령은 복사해서 쓰라고 적는 것이다. 돌지 않으면 문서가 아니라 오답이다.');
  process.exit(1);
}
console.log(`skill commands: OK (${checked}개 명령이 인자 파싱을 통과, 대상 게임 ${GAME_ID})`);
