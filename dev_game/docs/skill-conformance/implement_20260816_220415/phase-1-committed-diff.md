# Phase 1 — committed-diff 정합성 차단

- 상태: `PASS`
- baseline HEAD: `4f6d0654483c1e73398eb3d6cee0ce9d71aa729d`
- 주 파일: `scripts/check_skill_conformance.mjs`
- 허용 경로: 위 파일, 이 계획·증거, conformance fixture
- 금지 경로: 네 스킬·generator runtime·선행 승인 문서

## 작업 전 계약

- `approved-plan.json.baselineHead`부터 현재 HEAD까지의 committed path와 현재 dirty path를 합친다.
- committed·staged·unstaged·untracked 어느 상태에서도 같은 out-of-scope 경로는 RED다.
- 정상 committed allowed path는 GREEN이어야 한다.
- 시작 전에 존재한 `implement_20260816_215556.md`와 K-1 관련 변경은 이번 Phase가 편집하지 않는다.

## As-built

- `--committed-paths-file` fixture 입력을 추가했다.
- 실제 저장소에서는 승인 `baselineHead`가 `HEAD`의 조상인지 먼저 확인한다.
- `git diff --name-only --no-renames baselineHead..HEAD`와 현재 dirty path를 합쳐 같은
  allowlist로 검사한다. rename은 이전·새 경로를 모두 보기 위해 rename 감지를 끈다.
- synthetic status fixture는 기존대로 실제 git history 없이 동작하고, committed fixture는
  한 줄 한 경로 입력으로 독립 대조한다.

## 증거

- `node scripts/check_skill_gate_controls.mjs`: exit 0, 29종 전부 기대대로.
- `committed-out-of-scope`: `danger/secret.js (committed)` 사유로 exit 1.
- 실제 `/tmp` git 저장소 대조:
  - baseline 이후 `plan.md`, `conf/**`, `src/a.js` 커밋: exit 0.
  - 이어서 `danger/secret.js` 커밋: exit 1.
- 기존 dirty `out-of-scope-path`도 원래 지문으로 exit 1.

## 스킬·계약 대조

- 선행 계획의 `phase-start→phase-end delta`와 비소유 경로 불변 계약을 committed history까지
  기계화했다.
- dirty 여부가 바뀌어도 같은 경로가 같은 allowlist 판정을 받는다.
- 다이어트 스킬 내용과 generator runtime은 수정하지 않았다.

## 판정

- 판정: `PASS` — 자체 검증, 2026-08-16
