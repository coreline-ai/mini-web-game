# 스킬·계약 정합성 비교 — retire-legacy-pass

## 비교 대상
- `skills/game-factory/SKILL.md` / `skills/game-polish/SKILL.md` — 진입 판정
- `dev_game/generator/scripts/lib/production-pass-receipt.mjs` — 상태 정의(코드가 정본)
- `dev_game/docs/post-production-qa-contract.md` — 결함 분류와 검증 방법
- `AGENTS.md` — 스킬 작업 필수 게이트

## 대조

| 요구 | 실제 | 판정 |
|---|---|---|
| 두 스킬의 진입 판정은 `factory:production-pass-status` 출력과 일치해야 한다 | 코드 4상태, 문서 4상태. 문장에 남은 `legacy-pass`는 "2026-08-19 폐지"라는 이력 한 줄뿐 | MATCH |
| 라우팅을 바꾸려고 증거를 만들지 않는다 | 어떤 게임의 판정도 바꾸지 않았다 (실측 20개 전후 동일) | MATCH |
| 스킬 문서는 계약의 숫자를 재진술하지 않는다 | 상태 목록의 정본은 코드이고, 스킬은 그 결과로 갈라지는 라우팅만 적는다 | MATCH |
| 썩는 진술을 남기지 않는다 | 사라진 상태를 가리키던 참조 3곳(`skill_task_gate.mjs`, `production-gate.mjs` 주석, QA 최종 메시지)을 함께 갱신 | MATCH |
| 검사를 지워 통과시키지 않는다 | legacy 대조군을 지운 자리에 **폐지 증명 대조군**을 넣었다. 옛 자격 조건을 다 만족시키고 unknown을 요구한다 | MATCH |
| 읽는 코드가 없는 파일은 남기지 않는다 | `legacy-pass-allowlist.json` 삭제 | MATCH |
| 승인 범위 밖 편집 금지 | 7개 target 전부 `--allow`에 선언. `gate-marker-drift-exempt`의 범위를 건드리므로 `--supersede`로 선언 | MATCH |

## 스킬이 사용자에게 하는 말의 변화

이전: "영수증이 없어도 제도 이전 게임이면 polish가 가능하다(단, 현재성은 증명되지 않는다)."
이후: "영수증이 없으면 factory다. 예외는 없다."

두 번째 문장은 첫 번째보다 짧고, 지금 저장소의 사실과 정확히 같다 — 예외를 받을 수 있는
게임이 0개다.

## 판정
`MATCH`
