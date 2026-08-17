# 독립 적대적 검토 — `implement_20260816_220415`

- 검토일: 2026-08-17 KST
- 대상: 미커밋 작업 트리 (baseline `4f6d065`)
- 방식: 독립 에이전트 2개 — ⑴ 구현 주장 반증 ⑵ 기대 답을 모르는 blind routing + bounded task
- **판정: `BLOCKED`** — P0 3건 · P1 7건. 계획서 253행의 완료 조건 `P0/P1 0건` 미충족

## 0. 이 보고서의 증거 등급

| 표기 | 뜻 |
|---|---|
| **[재현됨]** | 검토 요청자가 직접 명령을 돌려 출력을 확인했다 |
| [에이전트] | 반증 에이전트가 실행했고, 요청자가 재현하지 않았다 |

이 구분을 두는 이유는 이 저장소가 여덟 회 검토에서 배운 것이다 — **읽어서 얻은 확신은 증거가
아니고, 남이 실행한 것을 내가 실행한 것처럼 적으면 그것도 증거가 아니다.**

## 1. 먼저 — 이번 변경의 개선은 실재한다

반증 시도가 실패한 항목이다. 기록해 둔다.

| | 확인 |
|---|---|
| **N-4 근본 해결** | `productionGateProfile`이 v2면 `buildDecision`과 무관하게 `custom-loop-full`. `custom-loop`/`hybrid`/`archetype-start` 셋 다 실행 확인 **[재현됨]**. 217/220 자기모순 제거 |
| **YAML 파싱 (K-1)** | 진짜 `safe_load`. 변경 전 같은 fixture에 돌리면 exit 0, 지금은 RED. `yaml` 모듈 부재 시 SKIP이 아니라 **RED** — fail-closed [에이전트] |
| **fixture 삭제 봉쇄** | 대조군 fixture를 비우면 RED. 이전 판의 fail-open이 막혔다 [에이전트] |
| **committed 경로 검사** | 주입 없이 실제 git에서 동작. 비정상 baselineHead도 fail-closed [에이전트] |
| **선행 계획 회귀 0** | `KEEP` 54건 중 **삭제 0건**. 3건 축약, 규범 문장은 잔존 [에이전트] |
| **`factory:qa` exit 0** | 전체 실행 확인, gate controls 1회 실행(재귀 없음) [에이전트] |
| **routing corpus 8/8** | 양방향(수용+배제) 전수 **[재현됨]** |

blind test는 8사례 중 4사례를 **description만으로** 깨끗하게 판정했고, factory↔polish 대칭 배제
문장을 "가장 잘 된 부분"으로 평가했다.

## 2. P0 — 새 게이트가 자기가 막겠다고 선언한 결함을 통과시킨다

### P0-1. PASS 영수증이 위조 가능하다 **[재현됨]**

게이트를 **한 번도 돌리지 않고** 영수증 JSON만 작성:

```
gateProfile = "나는-게이트를-돌린-적이-없다"
qaRunId     = null
generatedAt = "1999-01-01T00:00:00.000Z"
projectFingerprint = projectFingerprint(R)   ← 공개 함수로 계산

$ node lib/production-pass-receipt.mjs --project <forged>
{"ok": true, "reason": "production-demo PASS receipt is current"}   exit=0
```

`projectFingerprint`가 **공개 파일의 순수 sha256**이다. 서명도 비밀값도 없어 누구나 계산한다.
`verifyPassReceipt`(`:68-69`)는 `gateProfile`이 truthy이기만 하면 되고, `qaRunId: null`과
1999년 타임스탬프를 허용한다.

(첫 시도는 `fingerprint` 필드명을 틀려 `incomplete`로 막혔다. 필드를 정확히 채우면 통과한다.)

**수정 방향**: `qaRunId` 필수화 + `qa-captures/qa-session-report.json` 존재·runId 일치 검증.
`gateProfile`을 현재 spec의 프로필과 대조.

### P0-2. 게이트가 실패해도 영수증이 GREEN으로 남는다 [에이전트]

```
$ production-gate.mjs --project <game> --skip-foundation
  Production demo QA failed: - custom-loop captureMatrix file missing   GATE_EXIT=1
$ production-pass-receipt.mjs --project <game>
  ok: true | production-demo PASS receipt is current                    EXIT=0
```

영수증을 지우는 코드가 저장소 어디에도 없다(grep 0건). **게이트가 현재 실패 중인 게임이
`game-polish`로 라우팅된다.**

**수정 방향**: 게이트 진입 시 영수증 unlink. 성공 경로에서만 다시 쓴다.

### P0-3. 소유권 검사가 플래그 하나로 침묵 SKIP **[재현됨]**

```js
check_skill_conformance.mjs:358   if (args.statusFile) return [];   ← problem을 push하지 않는다
```

그리고 `check_skill_gate_controls.mjs`의 **conformance 대조군 17개가 전부 `--status-file`을
사용한다.** 실제 git 경로에 대한 자동 대조군은 **0개**다. 유일한 `committed-out-of-scope`조차
주입 브랜치만 검증한다.

[에이전트] 범위 밖 커밋이 있는 저장소에 빈 status 파일을 주면 `EXIT=0 "skill conformance: OK"`.

**수정 방향**: `statusFile`을 줬는데 `committedPaths`가 없으면 RED. 실제 git fixture로 committed
대조군 최소 2건 추가.

## 3. P1

| ID | 위치 | 문제 | 등급 |
|---|---|---|---|
| **P1-1** | `check_skill_commands.mjs:198,290` | 계약↔소스 대조가 **따옴표 substring grep**. `--project` 파싱 분기를 삭제해도 주석·상수에 문자열만 남으면 GREEN. 실제 명령은 `Unknown production-gate argument: --project`로 죽는다 — **이 게이트가 존재하는 이유인 결함 클래스** | [에이전트] |
| **P1-2** | `production-gate-profile.mjs:2` / `production-gate.mjs:214` | `schemaVersion === '2.0.0'` **정확 문자열 일치**. `'2.0'`·`'2.0.1'`·`'2.1.0'`·숫자 `2.0`이면 compatibility. **spec 파일이 없거나 이름이 바뀌면 `{}` → compatibility** — v2 게임이 캡처 QA를 건너뛴다 | [에이전트] |
| **P1-3** | `check_skill_gate_controls.mjs:49-145` | 지문 **교차 7건**. 의도한 결함만 다른 결함으로 바꿔치기하는 공격 4종 전부 GREEN. "36개 대조군"이 36개의 서로 다른 결함을 뜻하지 않는다 | [에이전트] |
| **P1-4** | `skill_task_gate.mjs` | **호출부 0개** (package.json 38 script·CI·설정 전부 grep 0). seal이 키 없는 `sha256(자기자신)`이라 손으로 쓴 상태 파일이 `verify` exit 0. 상태 파일 삭제(untracked)로 우회. **QA 검사 9개를 삭제해도 `16 assertions OK`** | [에이전트] |
| **P1-5** | `check_skill_drift.sh:266` | 트리거 배타성 검사는 **아직 정규식**. 같은 내용을 `description: >-` folded scalar로 쓰면 트리거가 비가시가 되어 `OK`. 같은 파일 위쪽에서 "정규식은 파싱 여부를 묻지 않는다"며 고친 그 결함이 100줄 아래 남아 있다 | [에이전트] |
| **P1-6** | `.../implement_20260816_220415/` | **`approved-plan.json`·`path-ownership.json` 부재** → `check_skill_conformance.mjs`의 소유권 블록 전체가 건너뛰어진다. **Phase 1이 만든 검사가 자기 계획에 한 번도 적용된 적이 없다.** 실행 시 `EXIT=1`(승인 파일 없음 + 판정 줄 귀속 없음 6건) | [에이전트] |
| **P1-7** | `dev_game/generated/*/.gitignore:4` | 영수증 경로가 **19/19 게임에서 gitignore**. 첫-PASS 경계가 비영속 로컬 파일이며 clone하면 사라진다 | **[재현됨]** |

## 4. 가장 실무적인 문제 — 지금 `game-polish`에 도달할 수 있는 게임이 0개다 **[재현됨]**

```
게임 19개 중 영수증 유효 0개
git check-ignore → dev_game/generated/keeper-last-light/.gitignore:4  qa-captures/
```

새 규칙은 "첫 PASS 영수증이 있어야 polish"인데, 영수증은 **gitignore되는 로컬 파일**이고 현재
아무 게임도 갖고 있지 않다. **모든 후보정 요청이 `game-factory`로 되돌아간다.**

blind test가 이것을 실제로 겪었다 — "지난주 완료된 게임, 음악 겹침"을 description 기준으로
polish로 판정했다가, SKILL이 지시하는 `factory:production-pass-status`를 돌리니 19/19 실패라
factory로 되돌렸다. **description 판단과 실행 결과가 정반대다.**

이건 코드 결함이라기보다 **설계 결정이 필요한 지점**이다.

| 선택지 | |
|---|---|
| A | 영수증을 추적 경로로 옮긴다 (`.gitignore` negation 또는 `qa-captures/` 밖) |
| B | 첫 PASS를 영수증이 아닌 다른 방식으로 기록한다 (커밋 태그·`qa-evidence/` 등) |
| C | 기존 19개 게임에 대한 마이그레이션 경로를 정한다 (게이트 재실행? 소급 발급?) |

C는 A·B 어느 쪽을 골라도 필요하다.

## 5. 문서 결함 — 지시받은 명령을 지시받은 문서에서 찾을 수 없다 [에이전트]

두 SKILL이 "개별 게이트는 `production-demo-quality-contract.md` §4가 단일 원본"이라고 한다.
그 문서 전체 grep 결과:

```
captured-state-qa · first-play-clarity-qa · input-hostility-qa
session-continuity-qa · docs-runtime-sync-qa      →  각 0회
```

그런데 `game-polish/SKILL.md` §5는 *"For class L fixes … run `factory:captured-state-qa` for DPR
evidence"*로 개별 실행을 지시한다. npm 스크립트는 실재하므로 **누락은 문서 쪽이다.**

**이 링크는 선행 계획(`implement_20260816_141036`) Phase 2·3에서 만들어졌고, 그때 목적지가
그 내용을 소유하는지 확인하지 않았다.** 같은 계열의 오류를 그 계획에서 세 번 지적받았는데
(G-1 위임 미추적 / H-2 목적지 오지목 / F-13·F-14 목적지 미소유) 하나가 남았다.

부수: `game-asset-creation/references/qa-and-failures.md`가 `fix_sprite_spacing.py`의 CLI를
존재하는 것처럼 기술하는데 그 스킬에는 `scripts/` 디렉터리 자체가 없다.

## 6. blind test가 찾은 스킬 문서 공백 — 18건 중 높음

| 스킬 | 공백 |
|---|---|
| factory | §3.5가 "씬 작성 전 `uiDirection.js` 선언"을 요구하는데 **씬을 만드는 `custom-shell` 템플릿이 그 파일을 만들지 않는다**(dry-run 22파일 실측) — 도구가 스킬이 강제하는 순서를 지킬 수 없다 |
| factory | 필수 워크플로 §4→§5→§6 **어디에도 아트 단계가 없다.** 아트는 "Fast path" 절에만 있어 "아트 직전"의 위치를 추론해야 한다 |
| polish | **결함 클래스 → 심각도 매핑표가 없다.** 심각도 2 이상은 §8이 세션 종료를 막으므로 결과가 달라진다 |
| polish | sweep 고정 "retry 5회" vs 사용자 보고 "10회" — 우선순위 규칙 없음 |
| polish | v1 게임 baseline 캡처 **도구·절차가 없다** (SKILL이 스스로 인정: *"there is no v1 capture-QA runner"*) |
| asset | **교정에도 설계 PASS가 선행하는가 — 세 문서가 불일치.** asset SKILL은 "위치와 무관하게 직접 실행", `ai-art-pipeline.md` 규칙 1은 "설계 PASS 뒤", motion SKILL은 "Even when frames are already approved" (조건 없음) |
| motion | **범위 안에서 어느 값을 고르는가의 규칙이 없다.** "hit stop 30-80ms"만 있고 "밋밋함 신고 → 상단" 같은 매핑이 없어, 30을 골라도 문서 위반이 아니지만 문제가 안 풀린다 |
| motion | `design/asset/runtime PASS`의 **정의와 기록처가 없다.** `review-standards.md`의 판정 어휘는 `Approve`/`Block` 둘뿐 |

blind test는 [8] 복합 요청의 **실행 순서를 문서에서 읽어냈다** — motion SKILL의 Cross-skill
sequence와 `ai-art-pipeline.md` 규칙 1이 이중으로 명시. 선행 계획의 N-2가 닫혔다.

다만 **[6] 새 시트 생성에서 비대칭이 남았다**: asset·motion 두 description이 `game-factory`를
지목하는데, **factory의 description에는 스프라이트 시트 생성 담당이라는 말이 한 글자도 없다.**
description만 읽는 라우터는 factory를 종착지로 고를 수 없다.

## 7. 요약

**개선은 실재하고 회귀는 없다.** N-4가 근본에서 닫혔고, YAML 파싱·fixture 봉쇄·committed 경로
검사가 새로 생겼으며, 선행 계획의 `KEEP` 54건이 그대로다.

그러나 세 축에서 **새 게이트가 자기 선언을 배신한다**:

1. CLI 계약이 결국 substring grep에 기대어 파싱 분기 삭제를 GREEN 처리한다
2. PASS 영수증이 위조 가능하고 게이트 실패 후에도 GREEN이라 factory↔polish 라우팅이 fail-open이다
3. 소유권 검사가 `--status-file` 하나로 침묵 SKIP되는데 **대조군 17개 전부가 그 플래그를 쓴다**

그리고 **이번 계획 자체가 `approved-plan.json` 없이 진행되어, Phase 1이 만든 검사가 자기
자신에게 한 번도 적용된 적이 없다.**

가장 먼저 결정이 필요한 것은 **영수증 gitignore**다 — 코드 수정이 아니라 설계 선택이며,
그것이 정해지기 전에는 `game-polish` 진입 경로 전체가 막혀 있다.
