# Phase 2 구현 증거 — CLI 파서·문서 계약 단일화

- 일자: `2026-08-17`
- 대상: `dev_game/generator/scripts/cli-contracts.json`, `lib/cli-contract.mjs`(신규),
  `make-game.mjs`, `production-gate.mjs`, `codex-imagegen.mjs`, `lib/production-pass-receipt.mjs`,
  `scripts/lib/doc-command-contract.mjs`(신규), `scripts/check_cli_parity.mjs`(신규),
  `scripts/check_skill_commands.mjs`
- 커밋: `443f4f2`

## 재현된 결함

```
skills/game-factory/SKILL.md 의 "--mode custom-loop-full" → "--mode turbo"

$ node scripts/check_skill_commands.mjs --skills-root <copy>
  skill commands: OK (9개 명령이 인자 계약을 통과, 대상 게임 bullseye-rush)
  exit=0

$ node dev_game/generator/scripts/production-gate.mjs --project x --mode turbo
  --mode must be compatibility|custom-loop-full
  exit=1
```

계약이 담던 것: `requiredAll`, `requiredOneOf`, `knownFlags`(이름만).
담지 않던 것: arity, type, enum. 그리고 **실제 leaf 파서 중 이 계약을 import 하는 것이 0개**였다.
검사기만 읽는 손으로 유지하는 사본이었으므로 어긋나도 아무도 몰랐다.

## 구현

1. **계약 schemaVersion 2.** 플래그마다 `arity`·`type`·`enum`.
2. **`lib/cli-contract.mjs`** — `validateArgv` / `assertArgv`, 안정적 오류 code
   (`E_UNKNOWN_FLAG`, `E_MISSING_VALUE`, `E_BAD_ENUM`, `E_BAD_INTEGER`, `E_MISSING_REQUIRED`,
   `E_MISSING_ONE_OF`). 부작용 없음 — 프로세스를 띄우지 않으므로 문서 검사기가 써도 재귀가 없다.
3. **네 leaf가 부팅 시 `assertArgv`를 자기 파싱보다 먼저 부른다.** 각자 `parseCliArgs`와
   `CLI_CONTRACT_ID`를 export하고, `isMainModule` 가드로 import 시 실행되지 않는다.
4. **문서 검사기는 `scripts/lib/doc-command-contract.mjs`를 통해 같은 검증기에 위임한다.**
   이 파일이 자기 규칙을 갖는 순간 계약이 둘이 되고, 그 둘이 어긋나는 것이 원래 결함이다.
5. **`check_cli_parity.mjs`** — 하나의 corpus를 `shared / leaf / checker` 세 갈래에 넣고
   accept·reject와 **오류 code**까지 대조한다. corpus는 손으로 쓴 경계 케이스에 더해
   **계약에서 자동 생성**한다(enum마다 전 값·오답·값 누락). 손으로 나열하면 반드시 빠지는
   것이 생긴다 — 실제로 `--gate`의 정상값이 빠져 있었다. 그리고 계약이 값을 **잃는** 반대
   방향은 leaf 소스의 `must be a|b|c` 문구와 대조해 잡는다. `factory:qa` 체인에 있다.

## Attempt ledger

| # | 대상 | 결과 | 조치 |
|---|---|---|---|
| 1 | 계약 v2 + leaf 4개 배선 + parity 21건 | OK | — |
| 2 | `production-gate.mjs` import 시 게이트가 실행됨 | parity 실패 | 본문을 `isMainModule` 가드로 감쌈 |
| 3 | 독립 검토: corpus가 **이미 통과하는 것만** 시험 (P2) | 계약 오류를 못 잡음 | corpus 21 → 35건 |
| 4 | 확장한 corpus가 즉시 실제 발산 4건 검출 | 아래 참조 | 계약·leaf 양쪽 수정 |
| 5 | 재검토: 35건에도 `--gate` **정상값이 없었다** — 손으로 나열해서 생긴 누락 | 발산 비가시 | corpus를 계약에서 **자동 생성**(76건). enum마다 전 값 + 오답 + 값 누락을 만든다 |
| 6 | 자동 생성은 계약 **안의** 값만 본다 → 계약이 값을 잃으면 여전히 비가시 | 반대 방향 누락 | leaf 소스의 `--flag must be a\|b\|c` 문구를 읽어 계약이 그 집합을 포함하는지 대조 |

**4번에서 나온 진짜 결함들** — Phase 2가 막으려던 바로 그 종류다.

- `--from` enum이 계약 `gate` vs 파서 `qa`. 문서의 `--from gate`가 통과하고 런타임이 죽었다.
- `--only`가 계약엔 자유 문자열, 파서엔 `all|backgrounds|sprites|ui|fx|wire`.
- `-h`가 계약에 없어 **HEAD에서 되던 `-h`가 새로 깨졌다**(`make-game`, `codex-imagegen`).
- `production-gate`의 `splitArgs`가 `-h`를 미지원으로 거부 → 계약과 leaf 불일치.
- `--project --turbo-mode`가 "project 값이 --turbo-mode"로 삼켜져 미지원 플래그 검사가 무력화.
- 소스 스캐너가 긴 플래그만 훑어 계약의 `-h`를 "소스에 없다"고 오신고.

## 결함 주입 검증

| 되돌린 것 | 결과 |
|---|---|
| leaf가 `assertArgv` 호출을 잃음 | `check_cli_parity` ✗ 5행 (`leaf=E_LEAF_ONLY`/`null`) |
| 검사기가 공용 검증기 대신 자기 규칙 | `check_cli_parity` ✗ 13행 (`checker=null`) |
| 계약에서 `--mode` enum 삭제 | `check_cli_parity` ✗ (`shared=null checker=null`) |
| `--from` enum을 다시 `gate`로 | `factory:make/from-valid` ✗ |
| 값 자리 판정을 옛 방식으로 | `factory:make/value-eats-flag` ✗ |
| 파서에서 `demo → artifact-contract-only` 매핑 제거 | `factory:make/enum --gate=demo` ✗ |
| 계약 enum에서 `full`(기본값) 제거 | `factory:make --gate: 소스가 받는 값이 계약에 없다 — full` |

## 남은 한계

- 계약값은 파서에서 **자동 추출한 것이 아니라 대조해 적은 것**이다. corpus 자동 생성과 소스
  `must be` 대조가 양방향 어긋남을 잡지만, 그 대조는 파서가 오류 문구를 그 형식으로 낼 때만
  성립한다. 형식이 다른 새 파서를 추가하면 그 플래그는 덮이지 않는다.
