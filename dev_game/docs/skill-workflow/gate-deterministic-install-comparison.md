# 스킬·계약 정합성 비교 — gate-deterministic-install

## 비교 대상
- `dev_game/generator/scripts/lib/production-pass-receipt.mjs` — canonical snapshot의 제외 목록
- `skills/game-factory/SKILL.md` — 게이트 실행 명령과 완료 판정
- `skills/game-polish/SKILL.md` — `pass`가 프로젝트 변경에 곧바로 `stale`이 된다는 서술
- `AGENTS.md` — 스킬 작업 필수 게이트

## 대조

| 요구 | 실제 | 판정 |
|---|---|---|
| 영수증은 QA가 검사한 상태를 봉인한다 | 게이트가 그 상태를 스스로 바꾸고 있었다 → 읽기 전용 설치로 닫았다 | MATCH |
| `stale`은 **프로젝트가 바뀌었다**는 뜻이어야 한다 | lockfile 변덕으로 생긴 stale은 거짓 신호였다. 이제 게임이 바뀔 때만 stale이다 | MATCH |
| 게이트는 반복 실행 가능해야 한다 | 같은 커밋에서 두 번 돌려도 트리가 같아야 한다 — install은 그것을 깼다 | MATCH |
| 없는 증거를 요구하는 검사를 만들지 않는다 | lockfile 없는 스캐폴드에는 `install`을 유지했다(`browser-smoke` 실행으로 확인) | MATCH |
| 조용한 fallback을 만들지 않는다 | fallback은 lockfile 유무 한 가지뿐이고 그 경계를 헬퍼 주석에 적었다 | MATCH |
| 검사를 지워도 통과하지 않게 한다 | 단위 대조군 2개 + 배선 검사 3개를 receipt QA에 추가 | MATCH |

## 스킬 문서 변경 없음

스킬이 부르는 명령(`factory:production-gate`)과 완료 기준은 그대로다. 바뀐 것은 그 명령이
저장소를 건드리지 않는다는 사실이며, 문서에 더할 절차가 없다.

## 판정
`MATCH`
