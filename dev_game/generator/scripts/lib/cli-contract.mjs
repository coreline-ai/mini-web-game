import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// CLI 인자 계약 — 문서에 적힌 명령과 실제 파서가 같은 규칙을 쓰게 하는 단일 출처.
//
// ── 왜 필요한가 ──────────────────────────────────────────────────────────────
// 이전 계약(`cli-contracts.json` v1)은 `requiredAll` / `requiredOneOf` / `knownFlags`만 담았다.
// **플래그의 값도 enum도 담지 않았고, 실제 leaf 파서 중 이 계약을 읽는 것은 0개였다** —
// 검사기만 읽는 손으로 유지하는 사본이었다. 실측(2026-08-17):
//
//   skills/game-factory/SKILL.md 의 `--mode custom-loop-full` → `--mode turbo` 로 바꿔도
//     node scripts/check_skill_commands.mjs        → exit 0 "9개 명령이 인자 계약을 통과"
//     node .../production-gate.mjs --mode turbo    → --mode must be compatibility|custom-loop-full
//
// 문서는 복사해서 쓰라고 적는 것이다. 돌지 않으면 문서가 아니라 오답이다.
//
// ── 무엇을 보장하는가 ────────────────────────────────────────────────────────
// leaf CLI는 부팅 시 `assertArgv`를 **자기 파싱보다 먼저** 부른다. 문서 검사기는 같은
// `validateArgv`로 문서의 명령을 본다. 그래서 둘의 accept/reject가 정의상 일치한다.
// 실제로 일치하는지는 `scripts/check_cli_parity.mjs`가 같은 argv corpus를 공용 검증기와
// 네 leaf의 실제 parse entrypoint에 모두 넣어 확인한다 — 계약만 고치고 leaf 연결을 끊으면
// 그 harness가 RED를 낸다.
//
// 오류 code는 **안정적**이어야 한다. parity는 accept/reject뿐 아니라 code까지 대조하므로,
// 여기 문자열을 바꾸면 corpus 기대값도 함께 바꿔야 한다.

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CONTRACTS_FILE = path.resolve(HERE, '..', 'cli-contracts.json');

let cache = null;

export function loadContracts(file) {
  file = file || DEFAULT_CONTRACTS_FILE;
  if (cache && cache.file === file) return cache.data;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (data.schemaVersion !== 2 || !data.scripts) {
    throw new Error(`CLI contracts schemaVersion 2가 아니다: ${file}`);
  }
  cache = { file, data };
  return data;
}

export function contractFor(scriptKey, file) {
  const contract = loadContracts(file).scripts[scriptKey];
  if (!contract) throw new Error(`CLI contract에 없는 script다: ${scriptKey}`);
  return contract;
}

/** 계약이 아는 플래그 이름. 검사기의 knownFlags 대조에 쓴다. */
export function knownFlags(scriptKey, file) {
  return Object.keys(contractFor(scriptKey, file).flags);
}

function checkValue(flag, spec, value) {
  if (spec.type === 'integer') {
    if (!/^-?\d+$/.test(value)) {
      return { code: 'E_BAD_INTEGER', message: `${flag} 값은 정수여야 한다: ${value}` };
    }
    return null;
  }
  if (spec.type === 'enum') {
    if (!spec.enum.includes(value)) {
      return { code: 'E_BAD_ENUM', message: `${flag} 값은 ${spec.enum.join('|')} 중 하나여야 한다: ${value}` };
    }
    return null;
  }
  if (!value.length) return { code: 'E_MISSING_VALUE', message: `${flag} 값이 비어 있다` };
  return null;
}

/**
 * argv를 계약으로 검증한다. **부작용이 없다** — 파일도 만들지 않고 프로세스도 띄우지 않는다.
 * 문서 검사기와 leaf가 같은 함수를 쓰기 때문에 재귀 없이 동일 판정을 얻는다.
 */
export function validateArgv(scriptKey, argv, file) {
  const contract = contractFor(scriptKey, file);
  const errors = [];
  const seen = [];
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const spec = contract.flags[token];
    if (!spec) {
      // 값 자리가 아니라 진짜 미지원 플래그일 때만 문제다.
      errors.push({ code: 'E_UNKNOWN_FLAG', message: `미지원 플래그: ${token}` });
      continue;
    }
    seen.push(token);
    if (spec.arity === 0) continue;
    const value = argv[i + 1];
    // 다음 토큰이 `--`로 시작하면 값이 아니라 플래그다. **아는 플래그만** 그렇게 보던 판은
    // `--project --turbo-mode`를 "project 값이 --turbo-mode"로 받아들여, 미지원 플래그 검사가
    // 통째로 무력화됐다(독립 검토 실측). 모르는 `--토큰`도 값으로 삼키지 않는다.
    if (value === undefined || value.startsWith('--')) {
      errors.push({ code: 'E_MISSING_VALUE', message: `${token} 값이 없다` });
      continue;
    }
    i += 1;
    const bad = checkValue(token, spec, value);
    if (bad) errors.push(bad);
  }

  // --help는 다른 필수 조건을 면제한다. 실제 leaf도 그렇게 동작한다.
  if (!seen.includes('--help') && !seen.includes('-h')) {
    for (const flag of contract.requiredAll || []) {
      if (!seen.includes(flag)) errors.push({ code: 'E_MISSING_REQUIRED', message: `필수 플래그 누락: ${flag}` });
    }
    for (const group of contract.requiredOneOf || []) {
      if (!group.some((flag) => seen.includes(flag))) {
        errors.push({ code: 'E_MISSING_ONE_OF', message: `${group.join(' 또는 ')} 중 하나가 필요하다` });
      }
    }
  }
  return { ok: errors.length === 0, errors, seen };
}

/** leaf 부팅 경로용. 계약 위반이면 stable code와 함께 throw한다. */
export function assertArgv(scriptKey, argv, file) {
  const result = validateArgv(scriptKey, argv, file);
  if (result.ok) return result;
  const error = new Error(`${scriptKey}: ${result.errors.map((e) => e.message).join('; ')}`);
  error.cliContract = { scriptKey, errors: result.errors };
  throw error;
}

/**
 * 이 모듈이 스크립트로 직접 실행됐는가.
 *
 * `path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)`로 비교하면 **심볼릭
 * 링크로 부를 때 거짓**이 된다 — argv[1]은 링크 경로, import.meta.url은 실경로이기 때문이다.
 * 그러면 main 블록이 통째로 건너뛰어져 **아무 출력 없이 exit 0**이 된다. 게이트가 조용히
 * 성공한 척하는 것이 가장 나쁜 실패 모드다. 이 저장소는 `.claude/skills/*`가 전부 심볼릭
 * 링크라 링크 호출이 특수한 상황도 아니다. 그래서 양쪽을 realpath로 정규화한다.
 */
export function isMainModule(metaUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  const self = fileURLToPath(metaUrl);
  const real = (value) => { try { return fs.realpathSync(value); } catch { return path.resolve(value); } };
  return real(entry) === real(self);
}
