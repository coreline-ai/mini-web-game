# Final QA Summary

## 2026-07-10 — Physics Bounds Polish Pass 1

### Intake

- Verbatim report: "자동차로 동전이 근처에 왔는데도 그냥 자동차를 지나 감! 자동차 전체에 대한 반응이 아니고 특정 영역에만 반응"
- Repro conditions: Game scene, 390x844 mobile viewport, DPR 3, force coin centers at player `x + [-84, -42, 0, 42, 84]` and player `y`.
- Defect class: M. Physics Bounds Alignment.
- Severity: 2, gameplay logic wrong.

### Root Cause

The player and collectible sprites were scaled with `setDisplaySize()`, but Arcade Physics body dimensions were set as if they were display/world pixels. Phaser then applied the sprite scale again, shrinking the effective body.

- Player visual size: 168x162.
- Before player body: about 19.36x19.27.
- Coin visual size: 66x66.
- Before coin body after a physics step: about 7.15x7.15, offset to the visible coin's upper-left area.

### Fix

- Added `src/game/systems/PhysicsBounds.js` with `setBodySizeInDisplayPixels()`.
- Applied it to the player body after `setDisplaySize()`, preserving the intended 118x118 gameplay hitbox in world pixels.
- Applied it to hazard bodies on every spawn so pooled objects reset from display-pixel intent.
- Applied it to collectibles on every spawn so coin/item body matches the visible item bounds and center.

### Evidence

- Before screenshot: `qa-captures/2026-07-10-physics-bounds/before-coin-over-car.png`
- Before state sample: `qa-captures/2026-07-10-physics-bounds/before-samples.json`
- After screenshot: `qa-captures/2026-07-10-physics-bounds/after-coin-over-car.png`
- After state sample: `qa-captures/2026-07-10-physics-bounds/after-samples.json`

### State Sample Results

- Before: `visualOverlapButNotCollected = 5`, `collectedCount = 0`.
- After: `visualOverlapButNotCollected = 0`, `collectedCount = 5`, `expectedCollectedCount = 5`.
- After player body: 118x118 world pixels.
- After coin body: 66x66 world pixels.
- `browserErrors = 0`
- `duplicateVisibleEntities = 0`
- `lingeringTransientGraphics = 0`
- `activeBgmInstances = 1`
- Active scene stack during repro: `Game`

### Gate Results

- `npm run build`: PASS
- `npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/rush-lane-racer --require-gpt-imagegen`: PASS
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/rush-lane-racer`: PASS
- `npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/rush-lane-racer --viewports 390x844,430x932,1080x1920,1280x900`: PASS
- `npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/rush-lane-racer --viewports 390x844,430x932,1080x1920`: PASS

### Contract Promotion

- Added Class M signature to `dev_game/docs/post-production-qa-contract.md` for visual sprite bounds vs Arcade Physics body mismatch.

## 2026-07-10 — Full-resolution Loader Contract Pass

### Scope

- Preserve the Class M physics-bounds fix above.
- Keep the existing native `1080x1920` runtime and production PNG assets.
- Add `AUDIO_PATHS` to `gameKeys.js` so image, background, and audio preload paths are all centralized.
- `LoadingScene` now preloads image, background, and audio path lists from `gameKeys.js`.

### Evidence

- Runtime sample: `qa-captures/full-resolution-2026-07-10/asset-fidelity-runtime-sample.json`
- Runtime screenshot: `qa-captures/full-resolution-2026-07-10/home-390x844-dpr3.png`
- Cross-game evidence: `dev_game/docs/qa-evidence/rush-lane-racer-2026-07-10.md`

### Runtime Sample Results

- Canvas backing store: `1080x1920`; CSS display at 390x844 DPR3: `390x693.328125`.
- Required runtime textures loaded: player, traffic/boss/obstacle/item PNGs, three FHD backgrounds, UI buttons, and FX.
- Stale SVG runtime resources: `0`; stale SVG/placeholder texture keys: `0`.
- Browser/page errors: `0`. WebGL `ReadPixels` messages were capture-time performance warnings only.
- Assertions true: `homeScene`, `highResolutionCanvas`, `noTripleScaledBacking`, `canvasInsideViewport`, `allRequiredTexturesLoaded`, `noStaleTextureKeys`, `noSvgResources`, `noBrowserErrors`.

### Gate Results

- `npm run build`: PASS
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/rush-lane-racer`: PASS, 25 assets at role-aware production-demo bar
- `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/rush-lane-racer --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900`: PASS
