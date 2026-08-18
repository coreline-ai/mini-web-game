# 스킬·계약 정합성 비교 — gate-marker-drift-exempt

## 비교 대상
- `AGENTS.md` — 스킬 작업 필수 게이트
- `skills/game-factory/SKILL.md` — 첫 PASS 경계와 게이트 실행 명령
- `skills/game-polish/SKILL.md` — `factory:production-pass-status` 라우팅
- `dev_game/generator/scripts/lib/production-pass-receipt.mjs` — 미검증 표식의 소유자

## 대조

| 요구 | 실제 | 판정 |
|---|---|---|
| 완료는 `factory:production-gate`를 실제로 돌려 영수증을 버는 것 | 봉인 범위 안의 게임에서는 그 명령이 완주 불가능했다 → 이 수정으로 실행 가능해진다 | MATCH |
| 라우팅을 바꾸려고 증거를 만들지 않는다 | 영수증·표식의 판정 로직은 건드리지 않았다. 바뀐 것은 task 게이트의 스냅샷 범위뿐 | MATCH |
| 미검증 표식은 지문이 아니라 별도의 invalid 조건이다 (receipt lib) | task 게이트도 같은 판단을 따른다 — 흔적은 승인 내용이 아니다 | MATCH |
| 승인 범위 밖 편집 금지 | `--allow`는 게이트 스크립트 2개 + 증거 3개. iron-courier의 커밋된 표식을 만나 `E_SCOPE`가 났고, 범위를 넓히는 대신 **구현을 좁혔다** | MATCH |
| PASS는 커밋된 사실이어야 한다 | 상태 파일과 구현을 같은 커밋에 둔다 | MATCH |
| 검사를 지워도 통과하지 않게 한다 | `EXPECTED_ASSERTIONS` 33 → 40으로 함께 올렸다 | MATCH |

## 스킬 문서 변경 없음

이 task는 스킬이 **지시하는 절차를 실행 가능하게** 만든다. 절차 자체는 바뀌지 않으므로
`skills/**`의 문장은 수정하지 않았다. 스킬이 시키는 명령(`factory:production-gate`)의 결과만
"봉인된 게임에서 항상 실패"에서 "정상 판정"으로 바뀐다.

## 판정
`MATCH`
