# Sky Archer Final QA Summary — 2026-07-09 Asset Edge Polish

## Scope
- User symptom: transparent assets exceeded the intended mobile asset envelope and outer edges looked broken/jagged.
- Classification: Class L — Asset Fidelity / alpha-bbox-clipping / backing-store-too-small.
- Target project: `dev_game/generated/sky-archer`.

## Baseline Failures
- `factory:asset-qa`: failed on oversized sprite/effect budgets for `player`, `hazard`, `collectible`, `fx-collect`, and `fx-hit`.
- `factory:image-quality-qa`: failed because `player`, `hazard`, `collectible`, and `arrow` touched the crop edge.
- Manual DPR sample: CSS canvas was `390x844` and backing store was also `390x844` on DPR 3, so the browser had to upscale the final game frame.

## Applied Fix
- Reframed and regenerated/remastered transparent runtime assets with alpha cleanup and safe transparent padding.
- Resized over-large runtime assets to role-appropriate dimensions:
  - `hazard.png`: `768x768`
  - `collectible.png`: `768x768`
  - `arrow.png`: `512x1024`
  - `fx-collect.png`: `640x640`
  - `fx-hit.png`: `640x640`
  - `btn-pause.png`: `384x384`
- Replaced `assets/characters/player.png` with `assets/characters/player.webp` to keep the 4-frame `2048x512` sheet while reducing runtime weight to `246.5KB`.
- Added a logical-camera HiDPI render path: logical gameplay stays `390x844`, while DPR 3 devices render to a `1170x2532` backing store.

## Evidence
- Before contact sheet: `qa-captures/asset-contact-before.png`
- After contact sheet: `qa-captures/asset-contact-after.png`
- Remaster report: `qa-captures/asset-remaster-report.json`
- Final asset metrics: `qa-captures/asset-final-metrics.json`
- Home capture: `qa-captures/sky-archer-after-home-390x844-dpr3.png`
- Game capture: `qa-captures/sky-archer-after-game-390x844-dpr3.png`
- Runtime sample: `qa-captures/sky-archer-after-sample.json`

## Final Runtime Sample
- `devicePixelRatio`: `3`
- CSS canvas: `390x844`
- backing store: `1170x2532`
- active scene: `Game`
- browser fatal errors: none; only WebGL `ReadPixels` performance warnings from screenshot capture.

## Final Gates
- `npm run build`: PASS.
- `npm --prefix dev_game run factory:asset-qa -- --project generated/sky-archer`: PASS.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/sky-archer`: PASS, 11 role-aware assets.
- `npm --prefix dev_game run factory:hq-screen-quality-qa -- --project generated/sky-archer`: PASS.
- `npm --prefix dev_game run factory:production-demo-qa -- --project generated/sky-archer --require-gpt-imagegen`: PASS.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project generated/sky-archer`: PASS.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project generated/sky-archer`: PASS.

## Open Defects
- None for the reported asset-edge and resolution-envelope issue.

## Button Resolution Polish — 2026-07-09

### Scope
- User symptom: buttons needed to be remade and replaced to match the current HiDPI resolution target.
- Classification: Class L — Asset Fidelity / runtime-stretch / source-to-rendered-DPR mismatch risk.
- Repro: Home PLAY/SOUND, gameplay pause icon, Pause RESUME/HOME, GameOver RETRY/HOME at `390x844` with DPR 3.

### Baseline
- `PLAY`: `ui_frame`, source `768x256`, rendered `220x64`, non-uniform scale `0.2865x0.25`.
- `SOUND`: `ui_frame`, source `768x256`, rendered `220x52`, non-uniform scale `0.2865x0.2031`.
- `Pause`: `ui_pause`, source `384x384`, rendered `56x56`.

### Applied Fix
- Replaced the button source files with DPR-safe, transparent, no-text button assets:
  - `assets/ui/btn-frame.png`: `1320x384`, assigned to `220x64` PLAY buttons, uniform scale `0.1667`.
  - `assets/ui/btn-frame-slim.png`: `1320x312`, assigned to `220x52` SOUND buttons, uniform scale `0.1667`.
  - `assets/ui/btn-frame-dialog.png`: `1380x372`, assigned to `230x62` Pause/GameOver buttons, uniform scale `0.1667`.
  - `assets/ui/btn-pause.png`: `768x768`, assigned to `56x56` gameplay pause, uniform scale `0.0729`.
- Updated `LoadingScene` to preload the new button variants.
- Updated `MobileButton` to select the exact source texture for each logical button size instead of stretching one source texture across all button shapes.
- Updated `asset-manifest.json` and `asset-plan.json` for the new UI assets and DPR display contracts.

### Evidence
- Before Home buttons: `qa-captures/button-polish-20260709/before/home-buttons.png`
- Before Game pause button: `qa-captures/button-polish-20260709/before/game-pause-button.png`
- After source contact sheet: `qa-captures/button-polish-20260709/button-source-contact-after.png`
- After Home buttons: `qa-captures/button-polish-20260709/after/home-buttons.png`
- After Game pause button: `qa-captures/button-polish-20260709/after/game-pause-button.png`
- After Pause menu buttons: `qa-captures/button-polish-20260709/after/pause-menu-buttons.png`
- After GameOver buttons: `qa-captures/button-polish-20260709/after/gameover-buttons.png`
- Runtime samples: `qa-captures/button-polish-20260709/after/*-sample.json`
- Updated full asset contact sheet: `qa-captures/asset-contact-after.png`
- Updated final metrics: `qa-captures/asset-final-metrics.json`

### Final Gates
- `npm run build`: PASS.
- `npm --prefix dev_game run factory:asset-qa -- --project generated/sky-archer`: PASS.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/sky-archer`: PASS, 13 role-aware assets.
- `npm --prefix dev_game run factory:hq-screen-quality-qa -- --project generated/sky-archer`: PASS.
- `npm --prefix dev_game run factory:production-demo-qa -- --project generated/sky-archer --require-gpt-imagegen`: PASS.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project generated/sky-archer`: PASS.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project generated/sky-archer`: PASS after one transient missing-screenshot rerun.

### Open Defects
- None for the button resolution replacement request.

## Native FHD Runtime Conversion — 2026-07-10

Changes:
- Converted the canonical game spec from the old 390×844 logical canvas with DPR multiplication to a native 1080×1920 canvas, `scaleMode: "fit"`, and `maxTargetDpr: 1`.
- Simplified `HiDpi.js` so camera zoom remains 1 and DPR3 devices do not create a 3240×5760 backing store.
- Added FHD scale helpers for player, hazards, collectibles, arrow projectiles, HUD, buttons, loading UI, feedback FX, failure line, spawn margins, and pointer guard zones.
- Centralized spritesheet, projectile, image, UI, FX, background, and audio preload paths in `gameKeys.js` / `LoadingScene`.
- Updated `asset-plan.json`, `assets/asset-manifest.json`, tech design, and asset plan to describe the native FHD runtime truth.

Verification:
- PASS — `npm run build`
- PASS — `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/sky-archer`
- PASS — `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/sky-archer --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900`
- PASS — Home runtime Playwright sample at `390x844` with `deviceScaleFactor=3`: `game.config=1080x1920`, `scale.gameSize=1080x1920`, canvas backing store `1080x1920`, CSS rect inside viewport, all required textures loaded, no `/assets/images/*.svg` requests, no stale SVG/placeholder texture keys, and no browser errors.
- PASS — gameplay Playwright sample at `390x844` with `deviceScaleFactor=3`: GameScene active, native FHD runtime strategy reported, camera zoom `1`, player visible inside the `1080x1920` world, spawner active, arrows active, and no browser errors.

Evidence:
- Cross-game evidence: `dev_game/docs/qa-evidence/sky-archer-2026-07-10.md`
- Runtime sample: `qa-captures/full-resolution-2026-07-10/sky-archer/asset-fidelity-runtime-sample.json`
- Runtime screenshot: `qa-captures/full-resolution-2026-07-10/sky-archer/home-390x844-dpr3.png`
- Gameplay sample: `qa-captures/full-resolution-2026-07-10/sky-archer/gameplay-runtime-sample.json`
- Gameplay screenshot: `qa-captures/full-resolution-2026-07-10/sky-archer/game-390x844-dpr3.png`
- Visual-layout screenshots: `dev_game/.tmp/visual-layout-qa/sky-archer`
- Scene-composite screenshots: `dev_game/.tmp/scene-composite-qa/sky-archer`
