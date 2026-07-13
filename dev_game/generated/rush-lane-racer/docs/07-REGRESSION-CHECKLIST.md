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

## Runtime Delivery Regression — 2026-07-13

- [x] All 25 active images remain in their production role folders and match `IMAGE_PATHS`/`BACKGROUND_PATHS` exactly.
- [x] Runtime manifest contains 30 physical files once each and stays within the 18 MiB budget.
- [x] The 18 SVG files and audio README remain source-only and are absent from dist.
- [x] `PhysicsBounds.js`, coin body sizing, gameplay tuning, and `codex-imagegen://` source-sheet provenance remain unchanged.
- [x] Build, dist-runtime, asset, image, HQ, production-demo, and browser smoke gates pass.
- [x] Re-ran `npm run qa:physics-bounds`: offsets `[-84,-42,0,42,84]`, `collectedCount=5`, player body `118x118`, coin body `66x66`, browser errors `0`.
- [x] Integration visual-layout and scene-composite gates passed at `390x844,430x932,1080x1920`.
