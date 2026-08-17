# Phase 7 — 스킬 다이어트·전체 통합 검증

- 상태: `PASS`
- 허용 경로: factory/polish SKILL의 아래 세 서술 문장, 현재 계획 체크박스, 이 증거 문서
- 허용 축약 대상:
  1. factory 완료 목록 뒤 자동 게이트 비대상 네 항목의 세션 일화
  2. polish 결함 class 목록 중복의 역사 일화
  3. polish 측정기 대조군 규칙의 세션 일화
- 금지 경로: generator runtime, 검사기·fixture, asset/motion SKILL, 선행 Phase 증거

## 작업 전 계약

- 역사 일화만 제거하고 핵심 불변식·권위 문서·양성/음성 대조 요구는 보존한다.
- factory의 `실행 가능`과 `목적 달성` 구분, polish의 계약 단일 소유자, 측정기 양성/음성 대조를
  각각 한 문단 안에 남긴다.
- 축약 뒤 네 스킬 전체 구조·명령·라우팅·통합 QA를 다시 실행한다.
- 선행 미추적 계획 `implement_20260816_215556.md`의 hash가 기준값과 같은지 확인한다.

## 통합 대조에서 발견한 범위 결함과 선행 교정 계약

- `factory:qa`는 GREEN이었지만, 새 command/structure/conformance fixture와 갱신 inventory 일부가
  선행 승인 디렉터리 `implement_20260816_141036/` 아래에 있었다. 이는 계획의 선행 승인 산출물
  불변 규칙 위반이므로 그대로 PASS 처리하지 않는다.
- 다음 편집 전에 교정 범위를 이 절로 고정한다: 현재 계획의 `fixtures/**`와
  `command-inventory.json`을 새 정본으로 만들고, gate controls·command checker 기본 경로만 새
  정본으로 전환한다. 선행 디렉터리의 tracked 파일은 HEAD와 일치시키고 이번 작업에서 추가한
  untracked fixture는 제거한다.
- generator runtime·네 스킬 의미·선행 Phase 보고서는 건드리지 않는다. 이관 후 동일 35개
  대조와 전체 QA가 GREEN이어야 하며, 선행 디렉터리 diff는 0이어야 한다.

## As-built

- factory의 미자동 판정 네 항목은 항목명과 `실행 가능 ≠ 목적 달성` 불변식만 남겼다.
- polish는 결함 class의 단일 소유자와 측정기 known-good/known-bad 대조 요구만 남기고 세션
  일화를 제거했다. 세 문단의 의미 계약과 권위 문서 링크는 보존됐다.
- 새 fixture 파일 159개(34 case, unstaged 범위 대조 포함)와 command inventory를 현재
  계획 증거 디렉터리로 격리했다. gate controls와 command checker의 기본 경로도 함께 전환했다.
- 선행 승인 디렉터리의 tracked 변경과 이번 작업이 추가했던 untracked fixture를 모두 제거했다.
- staged(`M `)·unstaged(` M`)·committed 세 범위 밖 상태가 각각 자동 RED가 되도록 했다.

## 증거

- 최종 `npm --prefix dev_game run factory:qa`: exit 0. 36개 gate control, UI 방향, spec/smoke,
  runtime asset, asset QA, imagegen integrity, 두 browser smoke build, completion claim,
  production receipt, 9개 command 계약이 모두 통과했다.
- sandbox 내 첫 재실행은 임시 browser fixture의 `npm install` 네트워크 제한으로 exit 1이었다.
  같은 전체 QA를 네트워크 허용 환경에서 재실행해 exit 0을 확인했다.
- `check_skill_gate_controls.mjs`: 36종(음성 4/양성 32) 전부 기대대로.
- `quick_validate.py`: 4/4 PASS. drift `--skip-user`, doc constants, JSON parse, Node syntax,
  Markdown link/resource audit, `git diff --check`: 모두 exit 0.
- 선행 승인 디렉터리 `git status --short`: 출력 0. 선행 미추적 계획 SHA-256:
  `bcb0d4527a31955c5eaa3414ec7001b1938c22cd4152e795ff984a3651656b76`로 기준과 동일.

## 계획 대조

- Phase 1~6은 각 증거 문서가 `수정 → 실행 결과 → 계약 대조 → 자체 PASS`를 가진다.
- 실제 변경 경로는 계획 범위인 검사기, generator 완료 게이트, 네 프로젝트 스킬, 파이프라인
  문서, 현재 계획·증거뿐이다. 선행 승인 산출물은 최종 diff에서 제외됐다.
- 통합 중 발견한 선행 승인 디렉터리 오염은 새 규칙 부재가 아니라 기존 불변 규칙을 놓친
  실행 오류다. 교훈 분류는 `existing-reference`; 새 Dev Lesson을 만들지 않는다.
- 기존 완료 게임에 영수증이 없으면 한 번 factory production gate를 통과하기 전까지 factory로
  라우팅된다. 사용자 전역 스킬 설치는 계획 제외 범위라 갱신·검사하지 않았다.
- 독립 reviewer 승인은 주장하지 않는다. 이 문서의 PASS는 구현 세션 자체 검증이다.

## 판정

- 판정: `PASS` — issuer: implementation self-review, 2026-08-16 KST
- 미해결 P0/P1: 0건
