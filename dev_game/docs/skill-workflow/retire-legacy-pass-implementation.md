# 구현 기록 — retire-legacy-pass

## 무엇을 없앴나

라우팅 상태 `legacy-pass`를 걷어냈다. `factory:production-pass-status`는 이제 네 상태만 낸다.

```
pass     영수증이 현재 프로젝트와 일치        exit 0  → game-polish
stale    영수증이 있는데 프로젝트가 바뀌었다   exit 1  → game-factory
invalid  영수증이 깨졌거나 미검증 표식이 있다  exit 1  → game-factory
unknown  영수증이 없다                        exit 1  → game-factory
```

`POLISH_ELIGIBLE_STATES`는 `['pass']` 하나다.

## 왜 지금 없앨 수 있나 — 다리를 다 건넜다

`legacy-pass`는 영수증 제도 이전 게임을 위한 **일회성 다리**였고, 그 종료 조건이 설계에 이미
적혀 있었다: "다음 게이트 실행이 성공하면 pass로, 실패하면 미검증 표식이 남아 invalid로 바뀌며
영구히 사라진다."

동결 allowlist(`qa-evidence/legacy-pass-allowlist.json`)의 이력:

| 시점 | 목록 | 사건 |
|---|---|---|
| 2026-08-17 동결 | 15개 | 제도 이전 게임의 닫힌 집합 |
| 배치 1~4 | 1개 | 14개가 게이트를 통과해 실제 영수증을 벌고 목록에서 내려갔다 |
| 배치 5 | 1개 | 마지막 `iron-courier-last-line`은 게이트를 돌렸고 **통과하지 못했다** |

그래서 오늘 실측(2026-08-19)에서 `iron-courier-last-line`은 `invalid`다:

```
$ npm --prefix dev_game run factory:production-pass-status -- \
    --project dev_game/generated/iron-courier-last-line
state: invalid
reason: project carries PRODUCTION-DEMO-NOT-VERIFIED.json — the last build did not clear the gate
```

표식은 커밋돼 있다(9afe541). 즉 **legacy-pass를 받을 수 있는 게임이 0개**이고, 목록은 늘지
않으므로 앞으로도 0개다. 그 상태는 라우팅에 아무 일도 하지 않으면서 두 스킬에 분기 하나를
더 얹고 있었다.

기록해 둘 사실 하나: 이 게임이 게이트를 통과하지 못한 이유는 core projectile 8장이 최소 변
256px 미달이라는 것이다(`projectile-rifle` 350x85 등, 4장은 hf > 8도 함께). 그 결함은 이 task가
고치지 않는다 — 게임은 `invalid`로 남아 `game-factory`의 큐에 있고, 라우팅 판정은 그대로다.
legacy-pass가 있든 없든 그 게임은 polish에 들어갈 수 없다.

## 파일별 변경

| 파일 | 변경 |
|---|---|
| `lib/production-pass-receipt.mjs` | 5상태 → 4상태, `POLISH_ELIGIBLE_STATES=['pass']`, `legacyPassEvidence()`·`LEGACY_ALLOWLIST_RELATIVE` 삭제, verify의 legacy 분기 삭제, CLI help 갱신, **폐지 이력 주석 추가** |
| `production-pass-receipt-qa.mjs` | legacy 대조군 4개(allowlist/미등재/미커밋·stage/접두사) → 폐지 증명 대조군 1개로 교체. `allowlist()` 헬퍼 삭제 |
| `production-gate.mjs` | 표식을 남기는 이유 주석에서 "legacy-pass로 승격" → "unknown으로 희석" |
| `scripts/skill_task_gate.mjs` | 썩은 참조 1줄 갱신(legacy-pass 대신 영수증 판정의 같은 앵커) |
| `skills/game-factory/SKILL.md` | frontmatter + 진입 판정에서 legacy-pass 제거, "제도 이전 예외 없음" 명시 |
| `skills/game-polish/SKILL.md` | frontmatter + 라우팅 4상태로, 동결 목록 단락(6줄) 삭제 |
| `docs/qa-evidence/legacy-pass-allowlist.json` | 삭제 (읽는 코드가 없어졌다) |

## 대조군 — 폐지를 어떻게 증명하나

옛 자격 조건 **둘을 일부러 다 만족시키고** unknown을 요구한다. allowlist 파일을 fixture에
되살려 두는 것이 핵심이다 — 파일이 있어도 아무 코드가 읽지 않는다는 것이 증명 대상이다.

```
former legacy-pass shape: allowlist entry + committed evidence  → state=unknown, ok=false
```

이 대조군이 무너지면 "polish 진입은 게이트를 통과한 현재 영수증만"이라는 규칙에 예외가 되살아난다.

## 검증

```
$ node dev_game/generator/scripts/production-pass-receipt-qa.mjs
production PASS receipt QA OK: ... retired legacy-pass (allowlist entry + committed evidence must
stay unknown), fingerprint exclusivity, gate-start invalidation, gate/make wiring

$ npm --prefix dev_game run factory:qa      # skill-task-gate-verify 제외 전 단계 green
  skill-drift / skill-gate-controls / skill-task-gate-qa(40) / cli-parity / asset-plan-recover-qa
  ui-direction / validate / smoke / runtime-asset-delivery-test / asset-qa / imagegen-integrity-qa
  browser-smoke / completion-claim-qa / production-pass-receipt-qa / skill-commands  전부 exit 0
```

`factory:skill-task-gate-verify`는 이 task가 PASS로 봉인되기 전까지 빨갛다 —
`gate-marker-drift-exempt`의 승인 범위(`scripts/skill_task_gate.mjs`)를 이 task가 의도적으로
바꾸며 `--supersede`로 선언했기 때문이고, supersede는 PASS 시점에 효력을 갖는다.

## 라우팅 변화 (실측 20개)

```
이전: pass 16 / legacy-pass 0 / stale 0 / invalid 1 / unknown 3
이후: pass 16 /                stale 0 / invalid 1 / unknown 3
```

판정이 바뀐 게임은 **하나도 없다.** 상태 하나가 사라진 것이 전부다 — 그것이 지금 없애도
안전한 이유다.
