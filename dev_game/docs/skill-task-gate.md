# Skill Task Gate

스킬 작업을 한 번에 하나씩 끝내기 위한 저장소 로컬 상태 머신이다.

## 차단하는 세 가지

| 위험 | 차단 방식 | 오류 코드 |
|---|---|---|
| 단계 건너뛰기 | 현재 상태의 정확한 다음 상태만 허용 | `E_ORDER` |
| 미선언 파일 수정 | 시작 snapshot과 현재 파일 hash 차이를 allowlist와 대조 | `E_SCOPE` |
| PASS 후 승인 범위 수정 | PASS 시 범위 snapshot을 seal하고 `verify`·다음 `start`에서 재검증 | `E_PASS_DRIFT` |

추가로 미완료 작업이 있으면 두 번째 작업을 시작할 수 없다(`E_ACTIVE_TASK`).

## 상태 순서

```text
PLANNED → IMPLEMENTED → DOCUMENTED → SKILL_COMPARED → REVIEWED → PASS
```

- `DOCUMENTED`: 구현 내용과 실제 실행 결과를 기록한 파일이 필요하다.
- `SKILL_COMPARED`: 별도 파일에서 적용 SKILL·권위 계약과 비교하고 `MATCH`여야 한다.
- `REVIEWED`: implementer와 다른 reviewer ID 및 별도 검토 파일이 필요하다.
- `PASS`: 허용 범위의 현재 파일 hash를 승인 snapshot으로 고정한다.

## 시작

allowlist에는 구현 대상과 세 증거 파일을 처음부터 정확히 선언한다.

```bash
node scripts/skill_task_gate.mjs start \
  --task-id skill-example-001 \
  --implementer codex-worker-a \
  --target skills/example/SKILL.md \
  --allow skills/example/SKILL.md \
  --allow dev_game/docs/skill-workflow/skill-example-001-implementation.md \
  --allow dev_game/docs/skill-workflow/skill-example-001-comparison.md \
  --allow dev_game/docs/skill-workflow/skill-example-001-review.md
```

상태 파일은 `dev_game/docs/skill-workflow/<task-id>.state.json`에 원자적으로 기록된다. 직접
편집하거나 hash를 현재 변경에 맞춰 다시 쓰지 않는다.

## 진행

```bash
node scripts/skill_task_gate.mjs advance --task-id skill-example-001 --to IMPLEMENTED

node scripts/skill_task_gate.mjs advance --task-id skill-example-001 --to DOCUMENTED \
  --evidence dev_game/docs/skill-workflow/skill-example-001-implementation.md

node scripts/skill_task_gate.mjs advance --task-id skill-example-001 --to SKILL_COMPARED \
  --evidence dev_game/docs/skill-workflow/skill-example-001-comparison.md \
  --comparison MATCH

node scripts/skill_task_gate.mjs advance --task-id skill-example-001 --to REVIEWED \
  --evidence dev_game/docs/skill-workflow/skill-example-001-review.md \
  --reviewer skill-reviewer-b

node scripts/skill_task_gate.mjs advance --task-id skill-example-001 --to PASS
node scripts/skill_task_gate.mjs verify --task-id skill-example-001
```

비교가 `MATCH`가 아니면 `SKILL_COMPARED`로 진행하지 않는다. 현재 허용 범위 안에서 구현을
고치고 문서·대조를 다시 수행한다.

## 이미 PASS한 범위를 의도적으로 다시 바꿀 때

이전 PASS가 아직 유효한 상태에서 새 작업을 먼저 시작하고 supersede를 선언한다.

```bash
node scripts/skill_task_gate.mjs start \
  --task-id skill-example-002 \
  --implementer codex-worker-c \
  --supersede skill-example-001 \
  --target skills/example/SKILL.md \
  --allow skills/example/SKILL.md \
  --allow <new-implementation-evidence.md> \
  --allow <new-comparison.md> \
  --allow <new-review.md>
```

선언 전에 파일을 바꾸면 이전 PASS의 `E_PASS_DRIFT`로 다음 작업 시작이 차단된다.

## 검사기 자체 QA

```bash
node --check scripts/skill_task_gate.mjs
node --check scripts/skill_task_gate_qa.mjs
node scripts/skill_task_gate_qa.mjs
```

QA는 정상 순서, 단계 건너뛰기, 두 번째 active task, 미선언 파일, PASS 후 변경을 임시 Git
저장소에서 실행한다. 종료 코드뿐 아니라 오류 지문도 함께 확인한다.

## 범위 한계

- Git이 추적하거나 `--exclude-standard`에서 보이는 저장소 파일을 대상으로 한다.
- 보안 서명 시스템이 아니라 작업 절차의 우발적·임의적 우회를 fail-closed로 막는 로컬 게이트다.
- 이 게이트 생성 이전 작업의 순서를 소급 증명하지 않는다.
