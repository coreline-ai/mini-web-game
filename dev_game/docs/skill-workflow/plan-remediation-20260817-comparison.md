# 스킬·계약 정합성 비교 — plan-remediation-20260817

## 비교 대상

- `AGENTS.md`의 skill work mandatory gate
- `dev_game/docs/skill-task-gate.md`
- `dev-plan-generator`의 신규 계획·Phase 체크박스·QA·Dev Lesson 규칙
- 적대 검토에서 재현된 세 기술 결함
  - conformance staged rename/path boundary false-green
  - command checker와 실제 CLI parser 불일치 false-green
  - production PASS receipt fingerprint/marker/TOCTOU false-green
- 사용자 요구: 같은 수정을 반복하지 말고 세 가지를 체계적으로 차단

## 대조표

| 요구 | 계획 반영 | 판정 |
|---|---|---|
| 첫 편집 전 gate start | 계획 파일 편집 전에 `plan-remediation-20260817`을 시작 | MATCH |
| 한 번에 active task 하나 | 공통 규칙과 고정 supersede 사슬로 직렬화 | MATCH |
| 작업별 고정 범위 | Phase 1~3에 task-id·구현-only target·exact 누적 allow·evidence를 선기록 | MATCH |
| 구현→문서→비교→독립 review→PASS | 각 Phase 완료 조건과 공통 진행 규칙에 명시 | MATCH |
| 이전 PASS 변경 시 supersede | 직전 task supersede와 이전 allowedPaths 누적·hash 불변 assert를 함께 요구 | MATCH |
| 문서/비교/review 파일 분리 | Phase마다 서로 다른 세 evidence 경로 사용 | MATCH |
| 계획서 기본 구조 | 목적·범위·제외·참조·Phase·QA·완료 조건·잔여 리스크 포함 | MATCH |
| Dev Lesson 검색 | 지정 tree 검색 완료, 0 match와 disposition 기록 | MATCH |
| false-green 3건 차단 | rename, CLI 계약, receipt snapshot을 각기 독립 Phase로 고정 | MATCH |
| 끝없는 수정 방지 | 같은 fixture 두 번 실패 시 BLOCKED, Phase 3 뒤 독립 재검토 전 추가 금지 | MATCH |
| 과거 결과 소급 세탁 방지 | 과거 계획 소급 PASS와 역사 재작성 명시 제외 | MATCH |
| 자동 검사와 의미 판정 분리 | RED 대조군과 독립 reviewer를 모두 완료 조건으로 사용 | MATCH |

## 범위 정합성

- 계획 작성 task의 구현 target은 새 계획 파일 1개뿐이다.
- 이번 task에서 Phase 1~3 구현 파일이나 기존 계획은 수정하지 않았다.
- 후속 Phase의 예상 파일은 계획에만 선언했으며 실제 gate start 전에는 편집하지 않는다.
- 제외 항목은 완료로 표현하지 않고 잔여 리스크로 유지했다.

## 최초 독립 검토 보정 대조

| 최초 P1 | 보정 결과 | 판정 |
|---|---|---|
| allow 미기재·literal glob·계획 target | 모든 Phase에 exact allow, literal directory, 구현-only target 명시 | MATCH |
| supersede 뒤 앞 seal 유실 | allowedPaths 누적, carried allow-only hash·normalized plan 불변 assert | MATCH |
| leaf runtime wiring 미검증 | 네 leaf parity corpus와 disconnected mutation RED 추가 | MATCH |
| snapshot path-set 불명확 | 전체 입력 include, 생성 출력 exclude, add/delete/rename·record hash 고정 | MATCH |
| BLOCKED endpoint 비감사 | SHA 기반 Attempt ledger, non-PASS 유지, 사용자 승인 재개 조건 고정 | MATCH |

## 두 번째 경계 재검토 보정 대조

| 재검토 P1 | 보정 결과 | 판정 |
|---|---|---|
| normalized plan hash 기준·소유 불명확 | Phase별 stable marker, token-only normalization, superseded raw SHA 비교 고정 | MATCH |
| checker wiring이 parity에서 누락 | checker/shared/leaf 3자 matrix와 checker-disconnected RED 추가 | MATCH |
| symlink target bytes false-green | canonical input symlink를 snapshot 생성 단계에서 stable-code RED | MATCH |

## 판정

`MATCH`

이 계획은 세 재현 결함을 서로 다른 순차 gate로 고정하고, 각 단계의 적대 대조와 독립 review가
끝나기 전 다음 단계로 넘어가지 않게 한다. 계획 자체의 PASS는 후속 구현 성공을 의미하지 않으며,
Phase 1 착수 가능 상태만 의미한다.
