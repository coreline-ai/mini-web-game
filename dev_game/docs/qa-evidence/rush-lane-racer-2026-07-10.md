# rush-lane-racer QA Evidence — 2026-07-10

## Physics Bounds Polish Pass 1

User-reported symptom: coin passed near or through the player car without collecting, suggesting only a small area of the car reacted.

Classification: M. Physics Bounds Alignment, severity 2 gameplay logic defect.

Root cause: sprites were resized with `setDisplaySize()`, but Arcade Physics body dimensions were assigned as display/world pixel values. Phaser applied the sprite scale to those body values again, shrinking the effective body. The player visual was 168x162, but its body sampled at about 19.36x19.27 before the fix. The coin visual was 66x66, but its body sampled at about 7.15x7.15 and was offset toward the visible coin's upper-left area.

Fix:

- Added `src/game/systems/PhysicsBounds.js`.
- Converted intended display/world body sizes to source-space body sizes after `setDisplaySize()`.
- Applied the helper to player, hazard, and collectible spawn setup.
- Collectibles now use a centered full visible-bounds body for pickup reliability.

Evidence:

- Before: `dev_game/generated/rush-lane-racer/qa-captures/2026-07-10-physics-bounds/before-samples.json`
- Before screenshot: `dev_game/generated/rush-lane-racer/qa-captures/2026-07-10-physics-bounds/before-coin-over-car.png`
- After: `dev_game/generated/rush-lane-racer/qa-captures/2026-07-10-physics-bounds/after-samples.json`
- After screenshot: `dev_game/generated/rush-lane-racer/qa-captures/2026-07-10-physics-bounds/after-coin-over-car.png`

Machine assert summary:

- Before `visualOverlapButNotCollected = 5`, `collectedCount = 0`.
- After `visualOverlapButNotCollected = 0`, `collectedCount = 5`, `expectedCollectedCount = 5`.
- After player body: 118x118 world pixels.
- After coin body: 66x66 world pixels.
- `browserErrors = 0`, `duplicateVisibleEntities = 0`, `lingeringTransientGraphics = 0`, `activeBgmInstances = 1`.

Gate results:

- `npm run build`: PASS
- `factory:production-demo-qa`: PASS
- `factory:image-quality-qa`: PASS
- `factory:visual-layout-qa` at `390x844,430x932,1080x1920,1280x900`: PASS
- `factory:scene-composite-qa` at `390x844,430x932,1080x1920`: PASS

Contract update:

- Added Class M to `dev_game/docs/post-production-qa-contract.md` for visible sprite bounds vs Arcade Physics body mismatches.

## Full-resolution Loader Contract Recheck

Additional cleanup:

- Added `AUDIO_PATHS` to `src/game/constants/gameKeys.js`.
- `LoadingScene` now preloads image, background, and audio assets through centralized path maps from `gameKeys.js`.
- Preserved the Physics Bounds helper and all Class M regression evidence.

Additional gates:

- `npm run build`: PASS
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/rush-lane-racer`: PASS, 25 assets at role-aware production-demo bar
- `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/rush-lane-racer --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900`: PASS

Runtime sample:

- JSON: `dev_game/generated/rush-lane-racer/qa-captures/full-resolution-2026-07-10/asset-fidelity-runtime-sample.json`
- Screenshot: `dev_game/generated/rush-lane-racer/qa-captures/full-resolution-2026-07-10/home-390x844-dpr3.png`
- Assertions true: `homeScene`, `highResolutionCanvas`, `noTripleScaledBacking`, `canvasInsideViewport`, `allRequiredTexturesLoaded`, `noStaleTextureKeys`, `noSvgResources`, `noBrowserErrors`.
- Canvas backing store stayed `1080x1920` at DPR3; no `3240x5760` accidental DPR multiplier.
