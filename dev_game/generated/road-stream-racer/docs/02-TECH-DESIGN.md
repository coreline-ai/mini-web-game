# 02 · Technical Design — Road Stream Racer

## Engine & rendering
- Phaser 3 + Vite, logical canvas 1080×1920 (portrait).
- Scale.FIT + CENTER_BOTH; safe-area aware HUD.

## Scenes
Boot → Loading → Home → Countdown → Game → Pause → Crash → GameOver.

## Systems
- **RoadSegmentSystem:** 1080×640 road images scroll downward and recycle upward.
- **LaneInputSystem:** pointer/keyboard lane selection with smoothed car movement.
- **TrafficPatternSystem:** object-pooled traffic, obstacles, coin, and boost placement while keeping at least one safe lane.
- **BoostSystem:** temporary speed and score multiplier state.
- **NearMissSystem:** rewards close passes after traffic clears the player.
- **RacingScoreSystem:** distance, coin, near-miss, boost and level scoring.
- **CollisionSystem:** shared arcade hitbox sizing helpers.
- **Juice:** hit-flash, screen shake, particle burst on collect/hit, score pop.
- **LayoutRegistry:** publishes visible UI bounds to `window.__GAME_LAYOUT_BOUNDS__`
  so visual-layout-qa can detect HUD overlap / safe-area violations.
- **SaveData:** localStorage best-score + settings, corruption-safe.
- **AudioManager:** unlock on first input, mute persistence, pause on hidden.

## Performance
60fps target, object pooling, frame-rate-independent movement (delta-scaled).

## Asset loading
Every runtime art asset lives in this generated game under `assets/`. `LoadingScene`
loads PNG road segments, backgrounds, sprite sheets, UI buttons, FX, and WAV audio.
The SVG starter assets remain only as unused scaffold files and are not referenced by
`assets/asset-manifest.json` or runtime loading.
