# 스킬·계약 정합성 비교 — contract-k2-cause-known

## 비교 대상
- `dev_game/docs/post-production-qa-contract.md` §0(비협상 원칙), §0.1(계측 검증), K-2
- `skills/game-polish/SKILL.md` — "결함을 known gap으로 낮추지 않는다"
- `dev_game/generator/scripts/lib/browser-boot-diagnostics.mjs` — 확정 근거를 만든 계측

## 대조

| 요구 | 실제 | 판정 |
|---|---|---|
| 계약은 썩는 진술을 남기지 않는다 | 답이 나온 "미확정"을 확정으로 갱신했다 | MATCH |
| 확정은 값으로 뒷받침한다 | 실패 시점 진단과 9/10 vs 22/22 측정치를 본문에 인용 | MATCH |
| 지시는 실행 가능해야 한다 | "계측하라"에 남길 다섯 값을 명시 — 없으면 다시 추측으로 돌아간다 | MATCH |
| 닫지 않은 것을 닫았다고 적지 않는다 | 게임 어댑터의 같은 하드코딩을 "아직 남은 곳"으로 명시 | MATCH |
| 코드와 문서가 어긋나지 않는다 | 기본 경로·복귀 스위치 이름이 `browserLaunchArgs()` 구현과 일치 | MATCH |

## 판정
`MATCH`
