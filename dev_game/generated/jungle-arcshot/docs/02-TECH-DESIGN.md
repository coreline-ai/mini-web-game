# 02 · Technical Design — Jungle Arc Shot

## Engine & rendering
Phaser 3 + Vite, 논리 캔버스 390×844, Scale.FIT + CENTER_BOTH. Arcade physics(화살만 중력).

## Scenes
Boot → Loading → Home → Game → Pause → GameOver. (Foundation shell 재사용)

## Game-specific systems (custom-loop — Spawner 미사용)
- **SlingshotAimSystem** (`src/game/systems/SlingshotAimSystem.js`)
  - 새총 입력: pointerdown 앵커 → 드래그 벡터 반대 방향 발사속도(powerScale 4.6, min 300/max 1250, 위쪽 반구 강제).
  - 궤적 미리보기: x(t)=vx·t+½·wind·t², y(t)=vy·t+½·g·t² 해석해로 점선 22스텝 렌더 + 고무줄 표시.
  - 발사: allowGravity(950)+setAcceleration(wind,0) — 미리보기와 동일 물리. 회전은 매 프레임 속도 벡터 추종.
  - 화살 소멸(화면 밖) 시 rounds.onArrowDone(pierce) — 관통 0이면 헛샷 사운드.
- **JungleRoundSystem** (`src/game/systems/JungleRoundSystem.js`)
  - roundConfig(n): 과일/풍선 수·화살 경제(⌈표적/2⌉+1)·바람(±30+16n, 교대)·드리프트(R4+).
  - 배치: 3열 세로 클러스터(관통 라인 유도)+풍선 랜덤. 과일 바운스/풍선 스웨이+상승.
  - **관통 판정 소유**: overlap에서 arrow._pierce+=1, 표적만 제거(화살은 계속 비행), 점수 = 기본점×n.
  - 클리어/화살소진/allclear(R10) 판정, WIND/ARROWS/ROUND HUD, ROUND 배너(발사 잠금).

## Collision model
arrow(중력+바람, 관통) × fruit/balloon(원형) → 제거+콤보. 플레이어 무피격. 지면 도달 화살 = 소멸.

## GameScene 오버라이드
Spawner 미생성. 생존 점수 0(elapsedMs만). preload로 fruit/balloon/arrow 로드. `__JUNGLE_DEBUG__.get()` — round/arrowsLeft/wind/fired/hits/pierceBest/targets[]/playerX,Y/over/reason (씬 종료 후 안전).

## State flow
Home→Game(R1 배너)→[Pause↔]→(화살소진|R10 올클리어)→GameOver(score,coins)→Retry/Home.
