# 스킬·계약 정합성 비교 — legacy-receipt-migration-b2

| 요구 | 실제 | 판정 |
|---|---|---|
| 게이트 실패는 미통과로 보고, 완료로 쓰지 않는다 | `iron-courier-last-line` 미통과, 영수증 미발급 | MATCH |
| 결함을 known gap으로 낮추지 않는다 | 재생성 경로 부재를 사유로 명시, 낮추지 않음 | MATCH |
| 영수증은 게이트 통과로만 발급 | 4건 모두 게이트 exit 0 후 발급 | MATCH |
| 영수증을 번 게임은 allowlist에서 내린다 | 4건 내림, 상태 `pass` 유지 확인 | MATCH |
| 승인 범위 변경은 supersede로만 | `E_PASS_DRIFT` 후 명시적 supersede | MATCH |

라우팅: pass 8 / legacy-pass 8 / unknown 2 / invalid 1 — 19개 중 16개가 `game-polish` 진입 가능.

## 판정
`MATCH`
