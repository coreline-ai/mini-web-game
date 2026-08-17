# Project Agent Rules

## Mandatory gate for skill work

This rule applies to edits under `skills/**`, project skill links/metadata, skill validation scripts,
and development plans whose purpose is to change a skill workflow.

Before the first target-file edit, start exactly one task:

```bash
node scripts/skill_task_gate.mjs start \
  --task-id <lowercase-task-id> \
  --implementer <agent-id> \
  --target <implementation-file-or-directory> \
  --allow <target-file-or-directory> \
  --allow <implementation-evidence.md> \
  --allow <skill-comparison.md> \
  --allow <review-evidence.md>
```

The only normal order is:

```text
PLANNED → IMPLEMENTED → DOCUMENTED → SKILL_COMPARED → REVIEWED → PASS
```

Use the gate for every transition. Do not edit `.state.json` files by hand.

```bash
node scripts/skill_task_gate.mjs advance --task-id <id> --to IMPLEMENTED
node scripts/skill_task_gate.mjs advance --task-id <id> --to DOCUMENTED \
  --evidence <implementation-evidence.md>
node scripts/skill_task_gate.mjs advance --task-id <id> --to SKILL_COMPARED \
  --evidence <skill-comparison.md> --comparison MATCH
node scripts/skill_task_gate.mjs advance --task-id <id> --to REVIEWED \
  --evidence <review-evidence.md> --reviewer <different-agent-id>
node scripts/skill_task_gate.mjs advance --task-id <id> --to PASS
node scripts/skill_task_gate.mjs verify --task-id <id>
```

Rules:

- Never start the next task while one is not PASS.
- Never edit a path that was not declared with `--allow`; revert and restart instead of expanding
  the criterion after editing.
- `--target` is the implementation subset of `--allow`; evidence-only changes cannot satisfy
  `IMPLEMENTED`.
- Documentation, skill comparison, and independent review use three different non-empty files.
- The reviewer ID must differ from the implementer ID.
- A PASS task is sealed. A later task that intentionally changes its approved scope must declare
  `--supersede <old-task-id>` at `start`, before editing.
- If `verify` or a later `start` reports `E_PASS_DRIFT`, stop. Do not update the stored hash to fit
  the change.

The gate introduced by `implement_20260816_230033.md` applies to subsequent tasks. That bootstrap
was not retroactively protected by the gate it created.
