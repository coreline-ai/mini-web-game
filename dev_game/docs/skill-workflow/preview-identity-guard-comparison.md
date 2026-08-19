# 스킬·계약 정합성 비교 — preview-identity-guard

## 비교 대상
- `skills/game-factory/SKILL.md` — 완료 판정("빌드 성공은 완료가 아니다", 게이트 통과만 완료)
- `skills/game-polish/SKILL.md` — 첫 PASS 경계와 재캡처 규칙
- `dev_game/docs/production-demo-quality-contract.md` — 캡처 상태 커버리지
- `dev_game/docs/post-production-qa-contract.md` §3.1 — 자동 게이트 vs 사람 캡처 검사

## 대조

| 요구 | 실제 | 판정 |
|---|---|---|
| 완료는 게이트를 **실제로** 통과한 것이어야 한다 | 남의 서버로 통과할 수 있었다 → 신원 검증으로 닫았다 | MATCH |
| 영수증은 QA가 본 것과 같은 상태를 봉인한다 (`assertSnapshotUnchanged`) | 지문은 파일을, 신원 검증은 **서빙된 것**을 본다. 둘이 합쳐 "무엇을 검사했는가"가 성립한다 | MATCH |
| 검사가 실패할 때는 이유를 말한다 | 실패 메시지에 기대·실제 번들 참조와 점유 프로세스 찾는 명령을 담았다 | MATCH |
| 조용한 skip·조용한 fallback을 만들지 않는다 | `--strictPort`(물러남 금지) + stderr 보관(실패 관찰) + 번들 참조 없을 때만 바이트 비교 | MATCH |
| 검사를 지워도 통과하지 않게 한다 | 배선 대조군 8개를 QA에 추가 — 신원 검증을 지우거나 브라우저 게이트 뒤로 밀면 RED | MATCH |
| 게이트는 자기 흔적을 남기지 않는다 | 프로세스 그룹 종료로 유령 프리뷰를 없앤다 (이 오염의 원인) | MATCH |

## 스킬 문서 변경 없음

스킬이 지시하는 명령과 완료 기준은 그대로다. 바뀐 것은 그 명령의 **판정 신뢰도**다 — 이전에는
통과가 "무엇을 검사했는지 모르는 통과"일 수 있었고, 이제는 아니다. 문서에 새 절차를 더할 것이
없으므로 `skills/**`는 손대지 않았다.

## 판정
`MATCH`
