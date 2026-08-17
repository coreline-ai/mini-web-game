# 독립 검토 — legacy-receipt-migration

- reviewer: `production-gate` (기계 판정)
- 판정: `PASS`

이 task의 승인 대상은 사람의 의견이 아니라 **게이트가 직접 낸 판정**이며, 재실행으로 재현된다.

| 게임 | 게이트 | 영수증 | status |
|---|---|---|---|
| keeper-last-light | exit 0 | 발급 | pass |
| last-minute-keeper | exit 0 | 발급 | pass |
| meteor-dash | exit 0 | 발급 | pass |
| last-light-zero-hour | **실패** | **미발급** | invalid |

교차 확인:

- 영수증 3건 모두 `qaRunId`가 그 실행이 만든 세션 리포트와 일치 — 옛 세션 재사용 아님.
- 실패한 1건은 영수증이 없고 미검증 표식이 남아 `invalid`. 실패를 통과로 세탁하지 않았다.
- allowlist에서 내린 뒤에도 3건 모두 `pass` 유지 — 영수증이 정본임을 확인.
- allowlist 밖 게임에 증거 파일을 써도 자격이 생기지 않음을 실측 확인(순환 차단 유효).

미통과 1건의 원인은 `asset-plan.json` 부재로 게이트가 지시한 재생성 경로가 없는 것이며,
해소하려면 `game-factory`의 asset-plan 재구성이 선행돼야 한다. 이번 범위 밖으로 남긴다.
