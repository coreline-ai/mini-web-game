# 02 · Technical Design — Sky Archer

## Engine & rendering
- Phaser 3 + Vite, logical canvas 390×844 (portrait), Scale.FIT + CENTER_BOTH.

## Scenes
Boot → Loading → Home → Game → Pause → GameOver. (Foundation shell 재사용)

## Game-specific systems (custom)
- **ArrowSystem** (`src/game/systems/ArrowSystem.js`): 궁수 위치에서 420ms 간격 자동 발사, 화살 풀(24) 재사용, 상향 속도 980. 화살×표적 / 화살×골든 불스아이 overlap 판정 소유.
  - `popTarget`: 표적 파열(+40) — fx_hit 버스트, 점수 팝, SFX.
  - `hitBonus`: 골든 불스아이(+80) — fx_collect 버스트, "BULLSEYE" 팝.
  - 화살 텍스처 부재 시 폴백 텍스처 생성(아트 전에도 항상 동작).
- **착지 실패 판정** (GameScene.update): 활성 표적 y가 궁수 라인+34를 넘으면 즉시 onHit(원힛 게임오버). 궁수-표적 직접 충돌도 동일.
- **Spawner 재사용**: hazards=풍선 표적(느린 낙하 130→330), collectibles=골든 불스아이.

## Foundation systems (shell)
StageManager(배경 3종 레벨 크로스페이드) · Juice(흔들림/플래시/버스트/점수팝) · LayoutRegistry(`__GAME_LAYOUT_BOUNDS__`, 씬 태그) · SaveData · AudioManager(뮤트 지속·pause 정지) · HudUI · player_run 4프레임 애니 + 기울기/바운스.

## Collision model
- arrow(축소 body 34%×85%) × target(원형) → 파열
- player(원형, hitbox 스케일 보정) × target → 실패
- target.y > landY → 실패 (실질 "미스" 판정)

## Data
`src/game/data/game-spec.json` 단일 소스(스폰/속도/점수/램프), ARCHERY 상수는 ArrowSystem 상단.

## State flow
Home→Game(자동발사 시작)→[Pause↔]→onHit→GameOver(score,coins)→Retry/Home. pauseWhenHidden 유지.
