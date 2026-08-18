#!/usr/bin/env node
// check_cli_parity.mjs — 공용 계약과 네 leaf CLI의 실제 parse entrypoint가 같은 판정을 내는지
// 같은 argv corpus로 대조한다.
//
// ── 왜 필요한가 ──────────────────────────────────────────────────────────────
// 계약 파일만 고치고 leaf가 그걸 안 쓰면, 문서 검사기는 초록인데 실제 명령은 죽는다. 그게
// 이 저장소에서 실측된 결함이다(2026-08-17): `cli-contracts.json`을 읽는 leaf가 0개였고,
// `--mode turbo`가 든 SKILL.md가 `check_skill_commands` exit 0을 받았다.
//
// 그래서 세 갈래를 대조한다.
//   1. shared   — lib/cli-contract.mjs 의 validateArgv
//   2. leaf     — 각 leaf가 export하는 실제 parseCliArgs (부팅 경로가 쓰는 바로 그 함수)
//   3. checker  — check_skill_commands.mjs 가 문서 명령을 볼 때 쓰는 validation entrypoint
// 셋의 accept/reject와 **오류 code**가 전부 일치해야 한다. leaf가 공용 entrypoint 연결을
// 잃으면(`runtime-parser-disconnected`) 여기서 RED가 난다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateArgv, contractFor } from '../dev_game/generator/scripts/lib/cli-contract.mjs';
import { validateDocCommand } from './lib/doc-command-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const S = path.join(ROOT, 'dev_game', 'generator', 'scripts');

const LEAVES = [
  { id: 'factory:make', module: path.join(S, 'make-game.mjs') },
  { id: 'factory:production-gate', module: path.join(S, 'production-gate.mjs') },
  { id: 'factory:imagegen', module: path.join(S, 'codex-imagegen.mjs') },
  { id: 'factory:production-pass-status', module: path.join(S, 'lib', 'production-pass-receipt.mjs') },
  { id: 'factory:asset-plan-recover', module: path.join(S, 'asset-plan-recover.mjs') },
  { id: 'factory:sign-pass-receipt', module: path.join(S, 'sign-pass-receipt.mjs') },
];

// 정상 / 값 누락 / 잘못된 enum / 잘못된 정수 / 미지원 플래그 / 필수 누락
//
// corpus에는 **공용 검증기가 이미 거부하는 것만** 담으면 안 된다. 그러면 leaf 연결이 끊긴 것은
// 잡아도 **계약 자체가 틀린 것**은 못 잡는다. 독립 검토가 실측으로 그걸 뚫었다: `--from`의
// enum을 gate로 잘못 적어 둔 채 corpus가 `--from`을 한 번도 건드리지 않아, 문서의
// `--from gate`가 통과하고 런타임이 죽는 상태가 그대로 남아 있었다.
// 그래서 **모든 enum 플래그의 정상값과 오답값**, 그리고 `--help`/`-h` 별칭을 전부 넣는다.
// 필수 인자를 채운 최소 argv. 자동 생성 케이스의 바탕이다.
const BASE = {
  'factory:make': ['--name', 'x'],
  'factory:production-gate': ['--project', 'x'],
  'factory:imagegen': ['--project', 'x'],
  'factory:production-pass-status': ['--project', 'x'],
  'factory:asset-plan-recover': ['--project', 'x'],
  'factory:sign-pass-receipt': ['--receipt', 'x'],
};

/**
 * 계약에서 케이스를 **자동 생성**한다. 손으로 나열하던 판은 `--gate`의 정상값을 한 번도
 * 넣지 않아, 계약과 파서가 어긋나도 parity가 초록이었다(독립 재검토 실측). 새 enum을
 * 추가하면 그 값들도 자동으로 덮이므로 같은 누락이 반복되지 않는다.
 */
function derivedCases(scriptKey) {
  const contract = contractFor(scriptKey);
  const base = BASE[scriptKey];
  const cases = [];
  for (const [flag, spec] of Object.entries(contract.flags)) {
    if (spec.enum) {
      for (const value of spec.enum) {
        cases.push({ name: `enum ${flag}=${value}`, argv: [...base, flag, value], expect: null });
      }
      cases.push({ name: `enum ${flag}=<invalid>`, argv: [...base, flag, '__no_such_value__'],
        expect: 'E_BAD_ENUM' });
    }
    if (spec.arity === 1) {
      // base에서 이 플래그를 **값과 함께** 뺀다. 이름만 빼면 남은 값이 미지원 플래그로 잡혀
      // 대조군이 의도한 결함(값 누락)이 아니라 다른 이유로 붉어진다.
      const without = [];
      for (let i = 0; i < base.length; i += 1) {
        if (base[i] === flag) { i += 1; continue; }
        without.push(base[i]);
      }
      cases.push({ name: `value-position ${flag}`, argv: [...without, flag], expect: 'E_MISSING_VALUE' });
    }
  }
  return cases;
}

const CORPUS = {
  'factory:make': [
    { name: 'valid', argv: ['--name', 'My Game', '--out', 'generated/x'], expect: null },
    { name: 'missing-value', argv: ['--name'], expect: 'E_MISSING_VALUE' },
    { name: 'bad-enum', argv: ['--name', 'x', '--gate', 'turbo'], expect: 'E_BAD_ENUM' },
    { name: 'bad-integer', argv: ['--name', 'x', '--stages', 'three'], expect: 'E_BAD_INTEGER' },
    { name: 'unknown-flag', argv: ['--name', 'x', '--turbo-mode'], expect: 'E_UNKNOWN_FLAG' },
    { name: 'missing-one-of', argv: ['--out', 'generated/x'], expect: 'E_MISSING_ONE_OF' },
    { name: 'from-valid', argv: ['--name', 'x', '--from', 'qa'], expect: null },
    { name: 'from-invalid', argv: ['--name', 'x', '--from', 'gate'], expect: 'E_BAD_ENUM' },
    { name: 'help-long', argv: ['--help'], expect: null },
    { name: 'help-short', argv: ['-h'], expect: null },
    { name: 'value-eats-flag', argv: ['--name', '--turbo-mode'], expect: 'E_MISSING_VALUE' },
  ],
  'factory:production-gate': [
    { name: 'valid', argv: ['--project', 'dev_game/generated/x', '--mode', 'custom-loop-full'], expect: null },
    { name: 'missing-value', argv: ['--project'], expect: 'E_MISSING_VALUE' },
    { name: 'bad-enum', argv: ['--project', 'x', '--mode', 'turbo'], expect: 'E_BAD_ENUM' },
    { name: 'bad-integer', argv: ['--project', 'x', '--port', 'abc'], expect: 'E_BAD_INTEGER' },
    { name: 'unknown-flag', argv: ['--project', 'x', '--turbo-mode'], expect: 'E_UNKNOWN_FLAG' },
    { name: 'missing-required', argv: ['--mode', 'compatibility'], expect: 'E_MISSING_REQUIRED' },
    { name: 'mode-compatibility', argv: ['--project', 'x', '--mode', 'compatibility'], expect: null },
    { name: 'help-short', argv: ['-h'], expect: null },
    { name: 'value-eats-flag', argv: ['--project', '--turbo-mode'], expect: 'E_MISSING_VALUE' },
  ],
  'factory:imagegen': [
    { name: 'valid', argv: ['--project', 'x', '--skip-existing', '--id', 'hero'], expect: null },
    { name: 'missing-value', argv: ['--project', '--skip-existing'], expect: 'E_MISSING_VALUE' },
    { name: 'bad-integer', argv: ['--project', 'x', '--timeout', 'soon'], expect: 'E_BAD_INTEGER' },
    { name: 'unknown-flag', argv: ['--project', 'x', '--turbo-mode'], expect: 'E_UNKNOWN_FLAG' },
    { name: 'missing-required', argv: ['--skip-existing'], expect: 'E_MISSING_REQUIRED' },
    { name: 'only-valid', argv: ['--project', 'x', '--only', 'sprites'], expect: null },
    { name: 'only-invalid', argv: ['--project', 'x', '--only', 'turbo'], expect: 'E_BAD_ENUM' },
    { name: 'help-short', argv: ['-h'], expect: null },
    { name: 'value-eats-flag', argv: ['--project', '--turbo-mode'], expect: 'E_MISSING_VALUE' },
  ],
  'factory:asset-plan-recover': [
    { name: 'valid', argv: ['--project', 'x'], expect: null },
    { name: 'missing-required', argv: ['--force'], expect: 'E_MISSING_REQUIRED' },
  ],
  'factory:sign-pass-receipt': [
    { name: 'valid', argv: ['--receipt', 'x'], expect: null },
    { name: 'missing-required', argv: [], expect: 'E_MISSING_REQUIRED' },
  ],
  'factory:production-pass-status': [
    { name: 'valid', argv: ['--project', 'x'], expect: null },
    { name: 'missing-value', argv: ['--project'], expect: 'E_MISSING_VALUE' },
    { name: 'unknown-flag', argv: ['--project', 'x', '--force'], expect: 'E_UNKNOWN_FLAG' },
    { name: 'missing-required', argv: [], expect: 'E_MISSING_REQUIRED' },
    { name: 'help-short', argv: ['-h'], expect: null },
    { name: 'value-eats-flag', argv: ['--project', '--force'], expect: 'E_MISSING_VALUE' },
  ],
};

function firstCode(errors) { return errors.length ? errors[0].code : null; }

/** leaf의 실제 parseCliArgs를 부른다. leaf 고유 파서가 더 엄격하면 여기서 드러난다. */
async function leafVerdict(leaf, argv) {
  const mod = await import(leaf.module);
  if (typeof mod.parseCliArgs !== 'function') {
    return { code: 'E_NO_ENTRYPOINT', detail: `${leaf.id}: parseCliArgs를 export하지 않는다` };
  }
  if (mod.CLI_CONTRACT_ID !== leaf.id) {
    return { code: 'E_CONTRACT_ID', detail: `${leaf.id}: CLI_CONTRACT_ID가 ${mod.CLI_CONTRACT_ID}다` };
  }
  try { mod.parseCliArgs(argv); return { code: null }; }
  catch (error) {
    return { code: error.cliContract ? error.cliContract.errors[0].code : 'E_LEAF_ONLY', detail: error.message };
  }
}

// ── 반대 방향의 발산 ─────────────────────────────────────────────────────────
// 자동 생성 케이스는 **계약 안의 값만** 시험한다. 그래서 계약이 값을 잃으면(파서는 여전히
// 받는데 계약이 거부) 아무 케이스도 그 값을 건드리지 않아 초록이다(실측). leaf 소스의
// `--flag must be a|b|c` 문구에서 파서 쪽 집합을 읽어, 계약이 그 집합을 **포함**하는지 본다.
// (계약이 더 클 수는 있다 — `--gate`의 `demo`처럼 검증 전에 매핑되는 별칭이 있다.)
const enumMismatch = [];
for (const leaf of LEAVES) {
  const source = fs.readFileSync(leaf.module, 'utf8');
  const contract = contractFor(leaf.id);
  for (const match of source.matchAll(/(--[a-z][a-z0-9-]*) must be ([a-z0-9|-]+)/g)) {
    const [, flag, joined] = match;
    const fromSource = joined.split('|').filter(Boolean);
    const declared = contract.flags[flag]?.enum;
    if (!declared) {
      enumMismatch.push(`${leaf.id} ${flag}: 소스는 ${fromSource.join('|')} 를 강제하는데 계약에 enum이 없다`);
      continue;
    }
    const missing = fromSource.filter((value) => !declared.includes(value));
    if (missing.length) {
      enumMismatch.push(`${leaf.id} ${flag}: 소스가 받는 값이 계약에 없다 — ${missing.join(', ')}`);
    }
  }
}

const failures = [...enumMismatch];
const ALL = Object.fromEntries(LEAVES.map((leaf) =>
  [leaf.id, [...CORPUS[leaf.id], ...derivedCases(leaf.id)]]));
for (const leaf of LEAVES) {
  for (const item of ALL[leaf.id]) {
    const shared = firstCode(validateArgv(leaf.id, item.argv).errors);
    const checker = firstCode(validateDocCommand(leaf.id, item.argv).errors);
    const leafResult = await leafVerdict(leaf, item.argv);
    const label = `${leaf.id}/${item.name}`;
    if (shared !== item.expect) failures.push(`${label}: shared=${shared} 기대=${item.expect}`);
    if (checker !== item.expect) failures.push(`${label}: checker=${checker} 기대=${item.expect}`);
    if (leafResult.code !== item.expect) {
      failures.push(`${label}: leaf=${leafResult.code} 기대=${item.expect}\n    ${leafResult.detail || ''}`);
    }
  }
}

if (failures.length) {
  console.error('CLI parity failed:');
  for (const f of failures) console.error(`- ${f}`);
  console.error('\n계약만 고치고 leaf 연결을 잃으면 문서는 초록인데 실제 명령이 죽는다.');
  process.exit(1);
}
const total = Object.values(ALL).reduce((n, list) => n + list.length, 0);
console.log(`CLI parity OK: leaf ${LEAVES.length}개 × corpus ${total}건, `
  + '(계약에서 자동 생성한 enum 전수 포함) shared/leaf/checker 세 갈래의 accept·reject와 오류 code가 전부 일치');
