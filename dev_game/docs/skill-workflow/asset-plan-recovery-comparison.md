# 스킬·계약 정합성 비교 — asset-plan-recovery

## 대조

| 요구 | 실제 | 판정 |
|---|---|---|
| 나쁜 아트는 **재생성**한다 (patch-around 금지) | 재생성 명령의 전제조건을 복원해 실행 가능하게 함 | MATCH |
| 스킬은 실행 가능한 명령만 지시한다 | 전제조건(asset-plan 필요, 프롬프트 소실 가능)을 두 SKILL.md에 명시 | MATCH |
| placeholder/임의 생성 아트 금지 | 빈 프롬프트 생성 차단 — 보일러플레이트 이미지가 production 자산이 되는 경로를 막음 | MATCH |
| provenance는 실제 생성 근거를 기록한다 | 프롬프트 없는 생성을 막아 근거 없는 provenance를 원천 차단 | MATCH |
| 기획 문서를 임의로 덮어쓰지 않는다 | `productionize` 조언 제거 — 그것이 docs/01~05를 다시 쓴다 | MATCH |
| 결함을 known gap으로 낮추지 않는다 | 프롬프트 소실을 fail-closed(exit 1)로 보고, 조용히 통과시키지 않음 | MATCH |

## 스킬 문서 변경

- `game-polish`: targeted 재생성 명령 뒤에 전제조건 3줄 — asset-plan 필요, `factory:asset-plan-recover`,
  프롬프트 소실 시 작성 필요, `productionize` 금지.
- `game-factory`: 같은 내용을 production-demo 표준 절에 추가.

두 스킬이 같은 전제조건을 말하며, 트리거 배타성 검사를 통과한다(`check_skill_drift.sh` exit 0).

## 판정
`MATCH`
