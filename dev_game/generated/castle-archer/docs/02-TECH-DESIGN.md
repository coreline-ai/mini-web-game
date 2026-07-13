# 02 · Technical Design — Castle Archer

## Engine & rendering
Phaser 3 + Vite, 논리 캔버스 390×844 (portrait), Scale.FIT + CENTER_BOTH.

## Scenes
Boot → Loading → Home → Game → Pause → GameOver. (Foundation shell 재사용)

## Game-specific systems (custom)
- **AimShotSystem** (`src/game/systems/AimShotSystem.js`)
  - pointerdown/move: 궁수(고정) 기준 조준각 계산, 위쪽 반구(-168°~-12°) 클램프, 점선 조준선+레티클 렌더, 궁수 기울기 피드백.
  - pointerup: 조준 방향으로 화살 발사(속도 1080, 쿨다운 170ms), 발사 시 사격 사이클 애니 1회+반동 트윈.
  - 화살 풀(24) 재사용, 화면 밖 자동 회수, 텍스처 부재 시 폴백 텍스처(아트 전에도 동작).
- **WaveGateSystem** (`src/game/systems/WaveGateSystem.js`)
  - 성문 HP 3 (상단 중앙 하트 HUD, ui_heart 폴백 그래픽). 몬스터가 성벽 라인(playerY-6) 돌파 시 -1, 0이면 GameScene.onHit(함락).
  - configureNewMonsters(): 신규 스폰 회전 제거(걷는 몬스터), 매 5번째 방패병 지정(hp2, shield_goblin 텍스처/틴트, 1.12배).
  - onArrowHitMonster(): 명중 판정 소유 — 방패 파괴(+10)→일반 텍스처 복귀, 처치 +30, 크리티컬(수평 중심 ±16% 정조준) ×2 판정+팝.
  - 물약: 화살 사격(onPotionShot) 또는 궁수 접수(collectPotion) → +50 & 성문 HP+1(최대 3).
  - 웨이브 배너/보너스: spawner 레벨 동기화, WAVE N 트윈 배너 + +100×(N-1).

## Foundation systems (shell 재사용)
Spawner(스폰 흐름 재사용 — hazards=진군 고블린, collectibles=물약) · StageManager(cover-fit 배경 3종 크로스페이드) · Juice(흔들림/플래시/버스트/팝) · LayoutRegistry(`__GAME_LAYOUT_BOUNDS__`: score/level/pause/gate-hp/wave) · SaveData · AudioManager · HudUI.

## Collision model
- arrow(축소 body 34%×85%) × goblin(원형) → 방패/처치 판정 (WaveGateSystem 소유)
- arrow × potion → 회복
- goblin.y > 성벽 라인 → damageGate(-1), goblin × archer 접촉 → 동일 (원힛 아님)
- archer × potion → 회복

## GameScene 오버라이드 (Foundation 대비)
- 드래그→이동 제거: 입력은 AimShotSystem이 소유(조준). 궁수 X 고정(center), 대기 바운스만.
- player_run 애니를 repeat:0 사격 사이클로 재정의(발사 시 재생, 완료 후 frame0).
- onHit()=성문 함락 전용(직접 충돌 즉사 제거). `LoadingScene`이 `gameKeys.js`의 중앙 런타임 PNG 목록을 프리로드하며, `GameScene`은 별도 late preload를 하지 않는다.
- `window.__CASTLE_DEBUG__.get()` QA 훅: fired/kills/headshots/shieldBreaks/breaches/heals/gateHp/wave/score/over.

## Data
`src/game/data/game-spec.json` 단일 소스(스폰/속도/점수/램프). CASTLE(조준·화살)·GATE(HP·점수·방패 주기) 상수는 각 시스템 상단.

## State flow
Home→Game(조준 대기)→[Pause↔]→성문 HP 0→onHit→GameOver(score,coins)→Retry/Home. pauseWhenHidden 유지, 일시정지 시 조준선 정리.
