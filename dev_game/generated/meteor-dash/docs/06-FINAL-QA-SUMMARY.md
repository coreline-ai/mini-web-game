# 06 · Final QA Summary — Meteor Dash

Date: 2026-07-09

## Historical asset refresh summary
- 2026-07-09 rebuilt Meteor Dash visual assets for the former 390×844 logical canvas at DPR3 (1170×2532 physical target).
- Replaced runtime raster art paths with WebP assets: backgrounds, player sheet, hazard, collectible, shield, button frames, pause icon, and FX.
- Added dedicated slim/dialog button frames so scene buttons no longer stretch one low-resolution frame across every UI size.
- Added runtime HiDPI camera support so logical gameplay coordinates remain stable while the renderer uses physical canvas resolution.

## Verification result
- PASS — `npm --prefix dev_game/generated/meteor-dash run build`
- PASS — `npm --prefix dev_game run factory:asset-qa -- --project generated/meteor-dash`
- PASS — `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/meteor-dash`
- PASS — `npm --prefix dev_game run factory:hq-screen-quality-qa -- --project generated/meteor-dash`
- PASS — `npm --prefix dev_game run factory:production-demo-qa -- --project generated/meteor-dash --require-gpt-imagegen`
- PASS — `npm --prefix dev_game run factory:visual-layout-qa -- --project generated/meteor-dash`
- PASS — `npm --prefix dev_game run factory:scene-composite-qa -- --project generated/meteor-dash`

## Native FHD Runtime Conversion — 2026-07-10

Changes:
- Converted the canonical game spec from the old 390×844 logical canvas with DPR multiplication to a native 1080×1920 canvas, `scaleMode: "fit"`, and `maxTargetDpr: 1`.
- Simplified `HiDpi.js` so camera zoom remains 1 and DPR3 devices do not create a 3240×5760 backing store.
- Added FHD scale helpers for gameplay sizes, hitboxes, HUD text, buttons, particles, banners, shower events, and shield pickups.
- Centralized spritesheet, image, UI, FX, background, and audio preload paths in `gameKeys.js` / `LoadingScene`.
- Updated `asset-plan.json`, `assets/asset-manifest.json`, tech design, asset plan, and regression checklist to describe the native FHD runtime truth.

Verification:
- PASS — `npm run build`
- PASS — `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/meteor-dash`
- PASS — `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/meteor-dash --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900`
- PASS — runtime Playwright sample at `390x844` with `deviceScaleFactor=3`: `game.config=1080x1920`, `scale.gameSize=1080x1920`, canvas backing store `1080x1920`, CSS rect inside viewport, all required textures loaded, no `/assets/images/*.svg` requests, no stale SVG/placeholder texture keys, and no browser errors.
- PASS — gameplay Playwright sample at `390x844` with `deviceScaleFactor=3`: GameScene active, native FHD runtime strategy reported, camera zoom `1`, player visible inside the `1080x1920` world, spawner active, and no browser errors.

Evidence:
- Cross-game evidence: `dev_game/docs/qa-evidence/meteor-dash-2026-07-10.md`
- Runtime sample: `qa-captures/full-resolution-2026-07-10/meteor-dash/asset-fidelity-runtime-sample.json`
- Runtime screenshot: `qa-captures/full-resolution-2026-07-10/meteor-dash/home-390x844-dpr3.png`
- Gameplay sample: `qa-captures/full-resolution-2026-07-10/meteor-dash/gameplay-runtime-sample.json`
- Gameplay screenshot: `qa-captures/full-resolution-2026-07-10/meteor-dash/game-390x844-dpr3.png`
- Visual-layout screenshots: `dev_game/.tmp/visual-layout-qa/meteor-dash`
- Scene-composite screenshots: `dev_game/.tmp/scene-composite-qa/meteor-dash`

## 2026-07-13 Runtime Asset Delivery Migration

- Moved 13 active runtime images to `assets/images/production/**`; all before/after SHA-256 values matched.
- Preserved 3 scaffold SVGs and `assets/audio/README.md` as source-only files.
- Added explicit delivery metadata, a 3 MiB runtime budget, the canonical package-local helper, `publicDir: false`, and asset-plan `runtimePath` values.
- Runtime manifest and loader paths agree on 18 physical files with no loader-only or manifest-only path.
- Dist size changed from 3,291,808 bytes to 3,279,017 bytes. Runtime assets total 1,764,964 bytes.
- PASS: build, dist-runtime QA, asset QA, image-quality QA, HQ-screen QA (13 assets), production-demo QA, curated browser smoke, and visual-layout QA at four viewports.
