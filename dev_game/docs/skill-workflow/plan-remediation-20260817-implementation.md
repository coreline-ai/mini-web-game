# 계획 작성 구현 증거 — plan-remediation-20260817

## 작업 결과

- 새 계획: `dev_game/dev-plan/implement_20260817_155107.md`
- gate task: `plan-remediation-20260817`
- 구현 범위: 개발 계획 문서 1개 작성
- 기존 개발 계획과 스킬·검사 스크립트는 변경하지 않았다.

## 계획에 고정한 다음 작업

1. `p1-conformance-rename`: staged rename과 경로 prefix 우회를 fail-closed로 차단
2. `p1-cli-contract`: 실제 CLI parser와 문서 명령 검사의 구조화 계약 단일화
3. `p1-receipt-snapshot`: QA 전후 동일 snapshot 검증과 PASS receipt 무결성 보장

각 작업은 앞 task의 PASS·verify 후에만 별도 gate task로 시작하며, 구현·문서·비교·독립 review
증거를 분리한다. Phase 3 뒤에는 남은 P0/P1만 다시 검토하고, 검토 결과 없이 네 번째 수정
Phase를 자동으로 추가하지 않는다.

## 명시적 제외·유보

- 과거 계획의 소급 PASS와 역사 재작성
- legacy receipt migration
- asset↔motion 라우팅 문구와 추가 스킬 다이어트
- 사용자 전역 스킬 재설치
- PyYAML 및 browser-smoke 환경 정리
- 생성 게임의 gameplay·아트·밸런스 변경

이 항목들은 완료 처리하지 않고 계획의 `잔여 리스크 / 후속 과제`에 유지했다.

## 계획 작성 전 확인

- Dev Lesson 검색 root: 현재 저장소
- 검색 tree: `scripts`, `skills`, `dev_game/generator`, `dev_game/docs`
- 결과: `LESSON_SEARCH_COMPLETE`, `0 match`, 경고 없음
- disposition: 기존 적용 lesson 없음. 이번 세 결함의 재현 사례를 각 Phase의 RED fixture로 고정

## 검증

- 계획에 목적·범위·제외 범위·참조·진행 규칙·Phase별 gate 범위·구현 태스크·자체 테스트·완료
  조건·잔여 리스크를 기록했다.
- Phase별 task-id, supersede 사슬, 구현-only target, exact allow 및 서로 다른 세 evidence 경로를
  편집 전에 명시했다.
- `git diff --check`: 통과
- 실제 Phase 1~3 구현은 시작하지 않았다.

## 독립 검토 후 계획 보정

최초 독립 검토는 P1 5건으로 `BLOCKED`였다. Phase 1을 시작하지 않고 같은 계획 작성 task의 허용
범위 안에서 다음만 보정했다.

1. fixture의 literal `/**`를 제거하고 구현 target과 누적 exact allow를 분리했다. 계획과 evidence는
   allow-only로 내려 계획 체크박스만으로 `IMPLEMENTED`가 되지 않게 했다.
2. Phase 1→2→3의 allow를 누적하고 superseded allowedPaths 포함·allow-only hash 불변 assert를
   완료 조건으로 추가했다.
3. 네 leaf CLI의 실제 parse entrypoint parity corpus와 `runtime-parser-disconnected` RED를 추가했다.
4. receipt canonical snapshot을 전체 프로젝트 입력 포함, 생성 output 명시 제외, path+bytes record
   hash, 추가·삭제·rename 처리까지 고정했다.
5. 시도 ledger와 2회 실패 뒤 non-PASS 유지, 사용자 승인 전 재개 금지 endpoint를 정의했다.

분류는 `plan-only`다. 구현 결함이 발생한 것이 아니며 이 리뷰 파일과 계획에 재발 방지 조건이 이미
고정되어 별도 Dev Lesson은 생성하지 않았다.

두 번째 재검토의 경계 P1 3건도 Phase 착수 전에 같은 계획 task에서 보정했다.

1. Phase별 stable checkbox marker를 열거하고, 현재 Phase marker token만 `[ ]`로 정규화한 SHA를
   superseded state의 raw plan SHA와 비교한다. marker 누락·중복·이전 checkbox·본문 drift는 RED다.
2. CLI parity를 `합성 문서 checker validation → shared parser → 네 leaf parse entrypoint` 3자로
   확장하고 `checker-parser-disconnected` mutation RED를 추가했다.
3. canonical input 경로의 symlink는 link 문자열만 hash하지 않고 snapshot 생성 단계에서 전부
   fail-closed RED로 거부한다.
