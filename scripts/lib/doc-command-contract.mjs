// 문서 명령 검증 entrypoint — `check_skill_commands.mjs`가 SKILL.md의 명령을 볼 때 쓰는 창구.
//
// 이 파일은 얇아야 한다. **자기 규칙을 갖는 순간 계약이 둘이 되고, 그 둘이 어긋나는 것이
// 원래 결함이었다.** 그래서 판정은 전부 공용 `validateArgv`에 위임하고, 여기서는 leaf
// 프로세스를 실행하지 않는다는 것만 보장한다(문서 검사기가 게이트를 돌리면 재귀가 된다).
//
// parity harness가 이 entrypoint와 공용 검증기, 네 leaf의 실제 parseCliArgs를 같은 corpus로
// 대조한다. 여기서 공용 호출을 끊으면 `checker-parser-disconnected` 대조군이 RED를 낸다.

import { validateArgv, knownFlags } from '../../dev_game/generator/scripts/lib/cli-contract.mjs';

export const CONTRACT_SOURCE = 'dev_game/generator/scripts/lib/cli-contract.mjs';

/** 문서에서 뽑은 argv를 검증한다. 부작용 없음 — 어떤 프로세스도 띄우지 않는다. */
export function validateDocCommand(scriptKey, argv, contractsFile) {
  return validateArgv(scriptKey, argv, contractsFile);
}

/** 계약이 아는 플래그 이름. 문서에 없는 플래그를 찾는 데 쓴다. */
export function docKnownFlags(scriptKey, contractsFile) {
  return knownFlags(scriptKey, contractsFile);
}
