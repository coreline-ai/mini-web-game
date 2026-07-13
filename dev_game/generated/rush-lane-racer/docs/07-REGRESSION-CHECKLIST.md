# Regression Checklist

## Physics Bounds: Coin Collects Across Visible Car Overlap

- Defect closed: 2026-07-10, M. Physics Bounds Alignment.
- Viewport: 390x844, DPR 3, mobile.
- Scene: Game.
- Setup: start `Game`, disable existing hazards/collectibles, set spawner accumulator low enough to prevent random spawns.
- Repro positions: spawn one stage-1 coin at player `y` and at player `x + [-84, -42, 0, 42, 84]`.
- Assert:
  - `visualOverlap === true` for all five positions.
  - `visualOverlapButNotCollected === 0`.
  - `collectedCount === 5`.
  - Player body remains about 118x118 world pixels.
  - Coin body remains about 66x66 world pixels and centered on the visible coin.
  - `browserErrors === 0`.
- Evidence reference: `qa-captures/2026-07-10-physics-bounds/after-samples.json`.

## Full-resolution Loader Contract

- `LoadingScene` must preload image, background, and audio assets through `IMAGE_PATHS`, `BACKGROUND_PATHS`, and `AUDIO_PATHS` from `gameKeys.js`.
- Runtime sample at 390x844 DPR3 must keep canvas backing store at `1080x1920`, not `3240x5760`.
- Runtime texture sample must include player, traffic/boss/obstacle/item PNGs, three FHD backgrounds, UI buttons, and FX with no missing required keys.
- Runtime resource samples must not request `/assets/images/*.svg`, and Phaser texture keys must not contain `svg` or `placeholder`.
