# 개발 계획 검토 — 스킬 전문가 검토 지적 수정

검토 일시: `2026-08-16 KST`

검토 대상:

- `docs/prompts/implement-skill-review-fixes-2026-08-16.md`
- `docs/project-skills-expert-review-2026-08-16.md`
- 현재 작업 트리의 `make-game.mjs`, `completion-claim-qa.mjs`, `package.json`

## 결론

**수정 후 승인**이 적절하다. 다섯 작업의 우선순위와 범위 구분은 타당하지만, 현재 문서는
구현 프롬프트이지 저장소 규약을 충족하는 개발 계획서는 아니다. 특히 완료 판정 회귀 테스트,
문서 명령 smoke, 전수 게이트가 현재 표현대로면 거짓 양성 또는 비결정적 결과를 만들 수 있다.

## 잘된 점

- 외부 검토의 스킬 범위 5건과 루트/인프라 범위를 분리했다.
- S1-01을 최우선으로 두고 음성·양성 대조군을 완료 조건에 포함했다.
- `full`만 완료를 선언하고 불완전 표식을 남기거나 제거하는 상태 전이를 명시했다.
- 각 작업에 관찰 사실, 수정 방향, 완료 조건이 있어 구현자가 의도를 복원하기 쉽다.
- 푸시 금지, 게이트 실패 시 미완료 보고 등 운영 안전 규칙이 명확하다.

## 필수 수정 사항

| ID | 심각도 | 위치 | 검토 의견 | 계획서 수정안 |
|---|---|---|---|---|
| R1 | 차단 | 47~50행 | 새 `implement_*.md` 작성이 선행 조건인데 현재 새 계획 파일 없이 구현 변경이 이미 시작됐다. 프롬프트 자체에도 Phase, 예상 변경 파일, 과거 교훈 조회, 이슈 기록란이 없다. | 지금 상태를 중단점으로 기록한 새 계획 파일을 만들고 실제 변경 상태로 체크박스를 초기화한다. `dev_lesson.py find` 결과 `0 match`도 기록한다. |
| R2 | 차단 | 106~118행 | “문법 오류가 기본 경로에서 차단”을 어떻게 비재귀적으로 검증할지 정의되지 않았다. `factory:qa` 안의 테스트가 `make-game` 기본 full 경로를 다시 실행하면 `production-gate → factory:qa` 재귀가 생긴다. 반대로 소스 정규식 검사는 실제 차단을 증명하지 못한다. | 완료 정책을 순수 함수/주입 가능한 runner로 분리해 기본 라우팅·완료 문구·marker 상태를 단위 검증한다. 문법 오류는 `production-gate --skip-foundation` 또는 독립 build fixture로 실제 RED를 확인하고, provenance 변조는 strict artifact gate로 확인한다. |
| R3 | 차단 | 238~244행 | 전수 루프는 실패해도 마지막 `echo`가 성공해 전체 종료 코드가 0이고, stderr를 버려 원인을 남기지 않는다. 또한 로컬의 ignored 게임 3종까지 포함해 현재는 19개지만 추적 manifest는 16개라 깨끗한 checkout에서 대상 수가 달라진다. | 큐레이션 대상의 단일 원본을 정하고 pass/fail을 집계하는 Node runner로 교체한다. 실패가 하나라도 있으면 exit 1, 게임별 로그 보존, 기대 개수는 동적으로 출력한다. |
| R4 | 높음 | 169~175행 | “4개 스킬 문서의 모든 실행 예를 실제 실행”은 범위가 과도하고 완료 불가능하다. 예에는 `<game-id>` placeholder, `npm install`, 종료하지 않는 `npm run dev`, 실제 이미지 생성·장시간 브라우저 작업이 섞여 있다. 두 스킬은 실행용 bash 예가 거의 없다. | 명령 inventory를 먼저 만들고 `offline executable`, `help/argument contract`, `syntax-only`, `external/long-running excluded`로 분류한다. 이번 결함 명령은 fixture로 실제 실행하되 외부 생성·dev server 예는 정적 검증한다. |
| R5 | 높음 | 142~150행 | 저장소 안에는 `quick_validate.py`가 없다. 존재하는 파일은 사용자 Codex 시스템 스킬 아래의 범용 frontmatter validator이며 project manifest 테스트 경로가 아니다. | project-local fixture/test runner를 `skills/game-feel-motion-skill` 또는 `scripts/` 아래 추가하고 `factory:qa`/`check_skill_drift.sh` 중 한 곳에 명시적으로 연결한다. 시스템 스킬 파일은 수정하지 않는다. |
| R6 | 높음 | 203~206행 | “중복 트리거 키워드가 없다”는 측정 불가능하고 공통어 `game`, `sprite`, `QA` 때문에 문자 그대로 달성할 수도 없다. 키워드 비중복이 올바른 라우팅을 보장하지도 않는다. | 네 스킬별 양성/음성 요청 corpus를 정의한다. 신규 생성, 기존 결함 수정, 픽셀 보존 재배치, 모션 설계 요청에서 담당/비담당 경계가 description에 명시되는지를 검증한다. 금지 문구는 소수의 충돌 phrase만 검사한다. |
| R7 | 높음 | 42~45행 | 고정된 `Co-Authored-By: Claude Opus 5`는 실제 작업자가 다를 때 거짓 저자 표시가 된다. | 실제 기여자만 기록하거나 자동 co-author 요구를 제거한다. |
| R8 | 중간 | 10~14행 | 원본 검토에는 S1 2건, S2 6건, S3 2건으로 총 10건이 있다. 본문도 5건+5건이라고 쓰면서 “9건”이라고 적었다. | `결함 10건`으로 정정한다. |
| R9 | 중간 | 220~226행 | `git check-ignore`만으로는 tracked/allowlisted/untracked를 모두 구분하지 못한다. tracked 파일은 기본적으로 출력되지 않는다. | `git ls-files --error-unmatch` → `git check-ignore -v` → `git status --short --untracked-files=all` 순서의 판정 예를 문서화한다. |
| R10 | 중간 | 142~144행 | 스키마 적용 범위와 의존성 정책이 불명확하다. 검증기 docstring은 spritesheet/VFX를 말하지만 계획은 spritesheet schema만 지목한다. | spritesheet만 지원할지 VFX도 지원할지 확정한다. 새 `jsonschema` 의존성을 넣지 않으려면 표준 라이브러리 기반 동등 검사를 명시하고, 두 schema의 type/const/enum/bounds fixture를 고정한다. |

## 권장 Phase 재구성

### Phase 0. 계획·계약 고정

- 새 `dev_game/dev-plan/implement_<timestamp>.md` 작성
- 대상 파일, 제외 범위, 의존성 금지/허용, 교훈 검색 결과 기록
- 현재 시작된 변경을 계획 체크박스와 일치시킴

### Phase 1. 완료 정책과 테스트 가능성

- gate 이름/별칭/default, strict provenance, marker 상태 전이를 하나의 정책 단위로 분리
- 음성 대조: 정상 fixture GREEN
- 양성 대조: syntax fixture build RED, receipt tamper strict gate RED
- `artifact-contract-only`는 문법 오류를 잡는 게이트가 아님을 명시하고 완료 문구를 금지
- fixture가 없을 때 테스트를 SKIP 성공시키지 말고 CI에서는 실패하도록 함

### Phase 2. manifest validator

- schema 지원 범위 확정
- 타입, const/enum, bool-number 배제, 경계값 검사
- 유효 fixture와 필드별 무효 fixture를 project-local runner에 연결

### Phase 3. 문서 명령과 라우팅 계약

- 실행 예 inventory 및 smoke 등급 분류
- `game-polish`의 `--project` 누락 명령 실제 fixture 검증
- 네 frontmatter의 양성/음성 routing matrix 검토

### Phase 4. generated 추적 정책

- 두 SKILL 문구를 tracked/ignored/untracked 3상태로 정정
- 실제 저장소 상태를 구분하는 명령 예 검증

### Phase 5. 통합 검증

- `factory:qa`, skill drift, doc constants, UI direction
- 선언된 대상 집합 전수 gate: 동적 total/pass/fail + nonzero failure
- 대표 custom-loop full gate와 보존된 로그
- 모든 결과를 계획서 체크박스와 최종 표에 반영

## 승인 기준

다음이 계획서에 반영되면 구현 진행을 승인할 수 있다.

- R1~R7 해결
- 전수 검증 runner가 실패를 실제 종료 코드로 전달
- 완료 판정 테스트가 소스 정규식이 아니라 실행 행위를 검증
- 외부 서비스·장기 실행 예와 CI smoke의 경계를 명시
- 체크박스 상태가 현재 작업 트리와 일치

## 확인 기록

- 외부 검토 항목 수: `10`
- 로컬 manifest 보유 게임: `19`
- Git 추적 manifest: `16`
- Git 추적 generated 파일: `2,108`
- Dev Lesson 검색: `LESSON_SEARCH_COMPLETE: 0 match(es)`

