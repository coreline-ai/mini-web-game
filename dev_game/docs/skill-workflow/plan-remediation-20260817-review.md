# 독립 적대적 계획 최종 검토 — plan-remediation-20260817

- reviewer: `process-scope-adversary`
- 최종 검토일: `2026-08-17 KST`
- 대상: `dev_game/dev-plan/implement_20260817_155107.md`
- 대조: `AGENTS.md`, `dev_game/docs/skill-task-gate.md`, `dev-plan-generator/SKILL.md`,
  최종 implementation/comparison evidence
- gate 확인: `plan-remediation-20260817`은 `REVIEWED`, 현재 scope verify는 GREEN
- **최종 판정: `APPROVE` — P0 0건, P1 0건**

이 승인은 개발 계획이 Phase 1을 시작할 수 있다는 뜻이며, 아직 Phase 1~3 구현이나 production
결과가 PASS했다는 뜻은 아니다.

## 이전 차단 항목 폐쇄 확인

| 항목 | 최종 확인 | 판정 |
|---|---|---|
| 구현 target과 evidence/계획 혼합 | 계획·evidence는 allow-only, 코드·harness·fixture만 target | CLOSED |
| fixture `/**` literal | 모든 fixture가 gate가 해석하는 literal directory 경로 | CLOSED |
| exact allow 미고정 | Phase별 반복 `--allow` 인자가 전체 경로로 선기록됨 | CLOSED |
| supersede 뒤 앞 seal 유실 | 다음 Phase allow가 직전 allowedPaths 전체를 누적하고 집합 assert | CLOSED |
| allow-only drift | 이전 approvedSnapshot raw hash 비교와 현재 target/evidence 예외가 구분됨 | CLOSED |
| 계획 checkbox normalization | Phase별 소유 marker, token-only 정규화, superseded raw plan SHA 비교, marker/body/이전 checkbox RED | CLOSED |
| leaf runtime parser wiring | 네 leaf의 실제 parse entrypoint·boot path·contract provenance 대조 | CLOSED |
| 문서 checker wiring | checker validation/shared parser/leaf 3자 parity와 checker-disconnected RED | CLOSED |
| canonical snapshot 집합 | 프로젝트 regular file 전체, 생성 output 명시 제외, add/delete/rename·path+bytes record hash | CLOSED |
| symlink content false-green | 제외 디렉터리 밖 symlink를 snapshot 생성 단계에서 stable-code RED | CLOSED |
| receipt marker/TOCTOU | gate 시작 invalidation, QA 시작·종료·writer 직전 동일 digest, marker 별도 RED | CLOSED |
| 끝없는 수정 | SHA Attempt ledger, 같은 fixture 2회 뒤 non-PASS BLOCKED, 사용자 승인 전 재개 금지 | CLOSED |

## 적대적 실행 가능성 확인

- Phase 1~3 task-id, 직전 supersede, 구현-only target, 누적 allow, 세 개의 서로 다른 evidence 경로가
  편집 전에 확정됐다.
- Phase 1 allow는 계획 task allow 전체를 포함하고, Phase 2·3 allow도 직전 Phase allow 전체를
  실제 목록으로 carry-forward한다.
- 계획 marker는 HTML comment sentinel로 각 한 번씩 존재한다. 현재 Phase 소유 checkbox token만
  `[ ]`로 정규화한 bytes를 직전 state의 plan raw SHA와 비교하므로 이전 checkbox·본문 변경을 새
  기준 hash로 소급 세탁할 수 없다.
- Phase 2는 문서 checker가 leaf 프로세스를 실행하지 않아 재귀를 막으면서도, 독립 harness가 합성
  문서 validation·공용 parser·네 leaf 실제 entrypoint에 같은 argv corpus를 적용한다.
- Phase 3 snapshot은 QA 생성 출력과 receipt/marker 경계를 분리했고, 동일 matcher/record builder를
  QA 시작·종료·writer·verify가 공유한다. symlink는 target 문자열만 봉인하지 않고 fail-closed다.
- 각 Phase는 RED exit와 stable 오류 지문, 독립 review, gate PASS·verify 전에는 다음 Phase로 갈 수
  없다. 같은 결함의 반복 수정도 Attempt ledger와 사용자 승인 endpoint로 제한된다.
- 제외 범위와 잔여 리스크는 해결된 것으로 표현하지 않았으며 새 구현 Phase나 관련 없는 기능이
  추가되지 않았다.

## 최종 의견

원래 P1과 두 번째 경계 P1의 보정이 서로 회귀하지 않았고, 새 P0/P1은 발견되지 않았다.
`implement_20260817_155107.md`를 최종 개발 계획으로 승인하며 **Phase 1 착수 가능**으로 판정한다.
