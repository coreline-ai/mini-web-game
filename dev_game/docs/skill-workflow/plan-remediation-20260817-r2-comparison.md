# 스킬·계약 정합성 비교 — plan-remediation-20260817-r2

## 비교 대상
- `AGENTS.md` skill work mandatory gate / `dev_game/docs/skill-task-gate.md`
- 재작성된 `implement_20260817_155107.md` (이 task의 승인 대상)

## 대조

| 요구 | 반영 | 판정 |
|---|---|---|
| 이전 PASS 변경 시 supersede | drift가 난 원안 승인을 `-r2`가 명시적으로 supersede | MATCH |
| supersede가 이력을 지우지 않을 것 | `supersededDrift`에 바뀐 승인 경로가 기록됨 | MATCH |
| 상태 파일은 HEAD에 커밋 (Phase 0 앵커) | PASS 후 커밋, `verify`로 확인 | MATCH |
| 구현→문서→비교→독립 review→PASS 순서 | 상태 머신이 강제 (E_ORDER) | MATCH |
| 완료 조건의 실행 가능성 | "supersede하는 task 시작"이 실제로 실행됨 — 교착이던 것을 고침 | MATCH |

## 판정
`MATCH`
