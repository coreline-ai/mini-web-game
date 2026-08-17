# Phase 0 구현 증거 — 게이트 강제화와 seal 무결성

- 일자: `2026-08-17`
- 대상: `scripts/skill_task_gate.mjs`, `scripts/skill_task_gate_qa.mjs`,
  `scripts/check_skill_gate_controls.mjs`, `dev_game/package.json`
- 커밋: `443f4f2`

## 재현된 결함

```
$ grep -rn "skill_task_gate" --exclude-dir=.git .
  → AGENTS.md 산문, 자기 문서, 자기 QA. npm script 0건, CI 0건

$ node -e '<손으로 상태 파일 작성, 게이트 미실행>'
$ node scripts/skill_task_gate.mjs verify --task-id forged-task --repo <fixture>
  [SKILL_TASK_GATE:OK] forged-task PASS
  exit=0

$ git status --short   # 상태 파일 위치
  ?? dev_game/          ← untracked. 지우면 승인 이력이 사라진다

$ node scripts/skill_task_gate_qa.mjs
  skill task gate QA OK: 16 assertions   ← 개수를 세기만 하고 대조하지 않는다
```

`stateSeal`은 키 없는 `sha256(자기 자신)`이다. 봉인이 아니라 체크섬이며 누구나 계산할 수 있다.

## 구현

1. **PASS는 HEAD에 커밋된 사실이어야 한다.** `assertPassCommitted`가 `git show HEAD:<path>`의
   바이트와 작업 트리 바이트를 대조한다. 로컬 저장소에는 위조자가 못 가지는 비밀이 없으므로
   서명으로는 닫히지 않는다. git을 앵커로 쓰면 위조에 커밋이 필요하고, 커밋은 이력에 남는다.
   실패 code: `E_PASS_UNCOMMITTED`(HEAD에 없음), `E_PASS_MODIFIED`(커밋 뒤 편집).
2. **커밋된 상태 파일 삭제 차단.** `assertNoDeletedStates`가 `git ls-tree -r HEAD`의 목록과
   디스크를 대조한다(`E_STATE_DELETED`). `start`와 `verify` 양쪽 진입에서 부른다.
3. **빈 범위 PASS 차단.** `allowedPaths`가 비면 `scopedSnapshot`이 전부 걸러내 drift가 영원히
   나지 않는다. 커밋만 하면 되는 가장 값싼 위조였다(독립 검토 발견). `allowedPaths`와
   `approvedSnapshot`을 **각각** 검사한다(`E_EMPTY_SCOPE`).
4. **QA 자기검증.** `EXPECTED_ASSERTIONS = 27`. 개수를 세기만 하면 대조군을 지워도 "OK"가 나온다.
5. **배선.** `factory:skill-task-gate-qa`를 `factory:qa` 체인에 넣고, 체인에서 빠지는 것 자체를
   `check_skill_gate_controls.mjs`가 RED로 만든다.

## Attempt ledger

| # | 대상 | 결과 | 조치 |
|---|---|---|---|
| 1 | seal git 앵커 + 삭제 차단 + 개수 assert | 27 assertions OK | — |
| 2 | 독립 검토: `.gitignore`가 상태 파일을 무시 → **PASS 도달 불가** (P0) | 자기 모순 | `.gitignore` 규칙 제거. 커밋 `350fc9c`의 결정과 Phase 0이 서로를 막았다 |
| 3 | 독립 검토: 빈 범위 PASS가 영구 통과 (P1) | 위조 성립 | 두 검사 추가 |
| 4 | 자체 발견: 빈 범위 대조군이 두 검사 중 하나만 증명 | 대조군 결함 | fixture 분리(`empty-allow` / `empty-snapshot`) |

## 결함 주입 검증

| 되돌린 것 | 결과 |
|---|---|
| `assertPassCommitted` 제거 | `normal/verify-before-commit`, `forged/verify`, `forged/blocks-next-start`, `normal/post-commit-edit` ✗ |
| `assertNoDeletedStates` 제거 | `deleted/start-after-delete` ✗ |
| `allowedPaths` 검사 제거 | `empty-allow/verify` ✗ |
| `approvedSnapshot` 검사 제거 | `empty-snapshot/verify` ✗ |
| QA 대조군 2개 삭제 | `대조군 개수가 27개가 아니다 (실제 25개)` |
| `factory:qa`에서 gate QA 제거 | `gate controls failed: 체인에 factory:skill-task-gate-qa가 없다` |

## 남은 한계

- PASS 위조는 **닫히지 않고 문턱만 올랐다.** 커밋 권한이 있는 사람은 여전히 위조할 수 있다.
  다만 그 흔적이 이력에 남아 검토 가능해졌다. 진짜로 닫으려면 CI 발급 서명이 필요하다.
- 상태 파일은 이제 추적된다. 크기(수백 KB)는 `baselineSnapshot` 때문이며, 그것이 승인 범위의
  증거이므로 무시할 수 없다.
