# 01 · Game Design Document — Sky Archer

## Concept
Move the archer with one thumb while arrows auto-fire upward — pop descending balloon targets before they land. An inverted-dodge vertical shooting arcade.

- **Core fantasy:** 축제의 명사수 — 하늘에서 내려오는 풍선 표적을 전부 쏘아 떨어뜨린다.
- **Control:** `drag` 하나 — 궁수의 좌우 위치가 곧 조준선이며, 화살은 420ms마다 자동 발사된다.
- **Win/lose:** 최대한 오래·많이 파열. 풍선 표적이 지면(궁수 라인)에 닿거나 궁수와 충돌하면 즉시 실패(원힛).

## 30-second core loop
1. 드래그로 낙하 중인 **풍선 표적** 아래에 조준선을 맞춘다.
2. 자동 발사 화살이 표적을 **파열**(+40, 파열 FX·점수 팝).
3. **골든 불스아이**를 저격하면 보너스(+80, BULLSEYE 연출).
4. 난이도 램프(14s)마다 낙하 속도·동시 표적 증가 → 조준 우선순위 판단 압박.
5. 표적 착지 = 게임오버 → 점수/최고점 → 원탭 재도전.

## Difficulty
- 1분: 느린 단발 풍선 — 전부 맞출 수 있는 여유.
- 5분: 빠른 다중 스폰 — 어떤 표적을 포기할지 강제 선택, 화면 전역 트래킹.

## Scoring
생존 6/s + 표적 파열 40 + 골든 불스아이 80. 최고점 localStorage 저장.

## Entities & content
Archer(4프레임 런/호버 시트) · Arrow(projectile) · Balloon Target(hazard) · Golden Bullseye(collectible) · 파열/보너스 FX 2종 · 스테이지 배경 3종(새벽 활터→노을 축제→폭풍 밤, 레벨 3마다 크로스페이드 전환).

## Differentiation
dodge 계열의 **역전**: 낙하물을 피하는 게 아니라 **맞혀 없앤다**. 조준(위치)과 화망(발사 주기)이 만드는 리듬이 코어 재미이며, ArrowSystem·명중 판정·착지 실패가 커스텀 구현이다.
