# Parcel Sort Rush — Adversarial Review

## 의심: 기존 dodge 게임의 스킨 변경 아닌가?

판정: custom-loop 구현 필요. 단순 회피 게임이면 실패다.

## 통과 조건

- 플레이어 캐릭터가 아니라 “택배 오브젝트”를 직접 조작해야 한다.
- 목표가 피하기가 아니라 “정확한 목적지 분류”여야 한다.
- 잘못된 목적지/미분류가 서로 다른 실패로 처리되어야 한다.
- 하단/측면 슈트가 게임 목표로 동작해야 한다.
- 점수는 회피가 아니라 정분류/콤보에서 증가해야 한다.

## 구현 후 확인

- `SortingSystem`이 스폰/분류/미스 판정을 담당한다.
- `Parcel` 엔티티가 drag target이다.
- `GameScene`은 정분류 이벤트로 score를 올린다.
- browser smoke에서 실제 drag-to-bin으로 score 증가를 확인한다.


## production-demo 보강 후 재검토

단순 이름/스킨 변경이면 실패다. 이번 버전은 `ConveyorSystem`, `SortingSystem`, `Parcel` drag target, 4개 sorting chute, rush event, production PNG/OGG 전용 에셋, layout registry를 갖는다. 특히 manifest가 공통/공유/복사 에셋을 금지하고 모든 runtime asset을 `parcel-sort-rush` 전용으로 선언하므로 placeholder reskin 위험을 자동 QA에서 차단한다.
