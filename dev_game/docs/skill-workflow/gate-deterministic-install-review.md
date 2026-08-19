# 독립 검토 — gate-deterministic-install

- reviewer: `production-pass-receipt-qa` (기계 판정) + 20개 게임 사전 점검
- 판정: `PASS`

## 검토자가 실제로 확인한 것

1. **결함이 커밋 이력에 남아 있다.** `4d475bf`의 diff가 게이트 실행이 지운 lockfile 21줄이다.
   추론이 아니라 저장소에 기록된 사실이다.
2. **연결이 성립한다.** lockfile은 canonical snapshot의 제외 목록(`dist`, `qa-captures`,
   `node_modules`)에 없다 — 즉 지문에 들어간다. 게이트가 그것을 바꾸면 영수증은 바뀐 상태를
   봉인하고, 트리가 정리되는 순간 stale이 된다.
3. **지뢰를 놓지 않았다.** 20개 게임 전부 `npm ci --dry-run`을 통과했다. 하나라도 lockfile이
   어긋나 있으면 그 게임의 게이트가 이 변경 때문에 실패했을 것이다 — 먼저 재고 나서 바꿨다.
4. **경계가 옳다.** lockfile 없는 즉석 스캐폴드에는 `install`이 남는다. `browser-smoke`가
   이 변경 뒤 완주해(`Browser smoke OK`) 그 경로가 동작함을 실행으로 보였다.
5. **되돌리면 RED다.** 배선 검사가 `['install', '--silent']`의 부재와 공용 계약 호출을 함께
   요구한다. 단위 대조군 2개가 헬퍼의 두 분기를 각각 단독으로 고정한다.

## 남는 위험

`npm ci`는 lockfile과 `package.json`이 어긋나면 실패한다. 그 경우 게이트는 QA가 아니라 설치
단계에서 멈춘다. 그것을 위험이 아니라 **원하는 신호**로 판단했다 — 어긋난 의존성으로 빌드한
dist에 영수증을 발급하는 것보다, 게이트가 거기서 멈추고 lockfile을 고치게 만드는 것이 낫다.
사전 점검으로 현재 20개 게임에는 그 상태가 없음을 확인했다.

행복 경로(게이트 완주 + 실행 후 lockfile 변경 0건)는 이 task가 PASS로 봉인된 뒤 확인한다.
