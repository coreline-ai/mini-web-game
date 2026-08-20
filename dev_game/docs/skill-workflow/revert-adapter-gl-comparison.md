# 스킬·계약 정합성 비교 — revert-adapter-gl

## 비교 대상
- `dev_game/docs/post-production-qa-contract.md` §0.1(대조군 없는 측정은 증거가 아니다), K-2
- `skills/game-polish/SKILL.md` — 재캡처로 증명한다, 결함을 known gap으로 낮추지 않는다
- 커밋 7226b4f·0b5a784 (되돌리는 대상)

## 대조

| 요구 | 실제 | 판정 |
|---|---|---|
| 증거 없는 변경을 유지하지 않는다 | 이득 미측정 + 회귀 1건 측정 → 되돌린다 | MATCH |
| 인과는 대조군으로 확정한다 | 파일 불변, 환경변수만 바꿔 A/B (3/3 vs 1/3) | MATCH |
| 측정된 개선은 지키다 | 생성기 도구의 ANGLE 전환(22/22)은 유지 | MATCH |
| 봉인된 범위는 supersede로 바꾼다 | `skybreak-adapter-gl-r3`을 supersede로 선언 | MATCH |
| 남는 문제를 숨기지 않는다 | 혼재와 "어댑터를 옮기려면 무엇이 더 필요한지"를 기록 | MATCH |
| 게임 로직·아트 불변 | 되돌린 것은 어댑터의 브라우저 실행 인자뿐 | MATCH |

## 판정
`MATCH`
