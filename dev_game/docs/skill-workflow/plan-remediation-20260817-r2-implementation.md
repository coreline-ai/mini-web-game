# 구현 증거 — plan-remediation-20260817-r2

- task: `plan-remediation-20260817-r2` (supersedes `plan-remediation-20260817`)
- 일자: `2026-08-17`

## 이 task가 존재하는 이유

`plan-remediation-20260817`은 **원안 계획서**를 승인했다. 그 뒤 계획서를 재작성했으므로
그 PASS는 `E_PASS_DRIFT`가 됐다 — 게이트가 옳았고, 상태가 실제로 낡았다.

그런데 해소하려던 순간 **게이트 자체가 교착**임이 드러났다: `start --supersede X`가 X를
supersede하기 *전에* 검증해서 죽는다. drift가 난 PASS가 모든 새 작업을 막고, 그 유일한
해소 수단까지 막았다.

```
$ node scripts/skill_task_gate.mjs start ... --supersede plan-remediation-20260817
[SKILL_TASK_GATE:E_PASS_DRIFT] plan-remediation-20260817 PASS 이후 승인 범위가 변경됐다
exit=1        ← 문서에 적은 해결책이 실행 불가능했다
```

## 구현

`scripts/skill_task_gate.mjs`:

1. supersede 대상을 **검증 전에** 확정하고 검증 대상에서 제외한다. 대상이 PASS 상태인지는
   여전히 확인한다(`E_SUPERSEDE`).
2. supersede로 넘어가는 drift는 **지우지 않고 기록한다** — 새 상태 파일의 `supersededDrift`에
   어떤 승인 경로가 바뀐 채 대체됐는지 남는다. 조용히 넘어가면 승인 이력이 세탁된다.
3. supersede 없는 `start`는 여전히 `E_PASS_DRIFT`로 막힌다(회귀 확인).

계획서(`implement_20260817_155107.md`)에는 gate task 사슬 절을 추가해 원안 승인 → drift →
supersede의 경위를 남겼다.

## 결함 주입 검증 (skill_task_gate_qa.mjs, 27 → 31 assertions)

| 되돌린 것 | 결과 |
|---|---|
| supersede 예외 제거 (교착 부활) | `drifted/supersede-start-allowed` ✗ |
| drift 기록 제거 | `drifted/drift-recorded` ✗ |
| (회귀) supersede 없는 start | `drifted/plain-start-blocked` — `E_PASS_DRIFT` 유지 ✓ |

## 실행 기록

```
[SKILL_TASK_GATE:SUPERSEDE_DRIFT] plan-remediation-20260817의 승인 범위가 바뀐 채로 대체된다:
  dev_game/dev-plan/implement_20260817_155107.md
[SKILL_TASK_GATE:OK] plan-remediation-20260817-r2 PLANNED — 구현 1개 / 허용 4개
```
