# Sky Archer Regression Checklist — Asset Edge / HiDPI

Run this checklist after changing transparent art, canvas config, layout scaling, or gameplay HUD assets.

## Asset Fidelity
- [ ] Transparent sprites keep visible alpha away from all crop edges.
- [ ] `player` remains a 4-frame sheet loaded as `characters/player.webp` with `frameWidth: 512` and `frameHeight: 512`.
- [ ] Runtime transparent assets stay within role-aware QA budgets.
- [ ] Contact sheet clearly shows safe transparent padding around `player`, `hazard`, `collectible`, `arrow`, `btn-frame`, `btn-pause`, `fx-collect`, and `fx-hit`.

## HiDPI Runtime
- [ ] Canonical runtime canvas remains native `1080x1920` with `scaleMode: fit` and `maxTargetDpr: 1`.
- [ ] On DPR 3 mobile capture, backing store remains `1080x1920`, not `3240x5760`.
- [ ] `applyLogicalCamera()` is called before scene UI/game objects are placed.
- [ ] Pointer movement uses `logicalPointer()` in gameplay code and maps to native logical canvas coordinates with camera zoom 1.
- [ ] Legacy `BASE_CANVAS=390x844` is used only as a scale reference for old composition constants.

## Required Gates
- [ ] `npm run build`
- [ ] `npm --prefix dev_game run factory:asset-qa -- --project generated/sky-archer`
- [ ] `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/sky-archer`
- [ ] `npm --prefix dev_game run factory:hq-screen-quality-qa -- --project generated/sky-archer`
- [ ] `npm --prefix dev_game run factory:production-demo-qa -- --project generated/sky-archer --require-gpt-imagegen`
- [ ] `npm --prefix dev_game run factory:visual-layout-qa -- --project generated/sky-archer`
- [ ] `npm --prefix dev_game run factory:scene-composite-qa -- --project generated/sky-archer`

## Evidence to Refresh
- [ ] `qa-captures/asset-contact-after.png`
- [ ] `qa-captures/asset-final-metrics.json`
- [ ] `qa-captures/sky-archer-after-home-390x844-dpr3.png`
- [ ] `qa-captures/sky-archer-after-game-390x844-dpr3.png`
- [ ] `qa-captures/sky-archer-after-sample.json`

## Button Resolution Regression — 2026-07-09
- [ ] Home PLAY uses `ui_frame`, source `1320x384`, rendered `220x64`, uniform scale `0.1667`.
- [ ] Home SOUND uses `ui_frame_slim`, source `1320x312`, rendered `220x52`, uniform scale `0.1667`.
- [ ] Pause/GameOver text buttons use `ui_frame_dialog`, source `1380x372`, rendered `230x62`, uniform scale `0.1667`.
- [ ] Gameplay pause icon uses `ui_pause`, source `768x768`, rendered `56x56`, uniform scale `0.0729`.
- [ ] Button alpha pads do not touch crop edges in `qa-captures/asset-final-metrics.json`.
- [ ] Button before/after capture paths under `qa-captures/button-polish-20260709/` refresh after any UI texture change.

## Native FHD Runtime Regression — 2026-07-10
- [ ] `LoadingScene` preloads only `SPRITESHEET_PATHS`, `IMAGE_PATHS`, and `AUDIO_PATHS` from `gameKeys.js`; new runtime PNG/WAV paths must be added there first.
- [ ] `arrow`, `bg_0..2`, `ui_frame*`, `ui_pause`, `fx_hit`, and `fx_collect` stay in `ASSET_KEYS` or path maps and appear in runtime texture samples.
- [ ] Runtime resource sample has no `/assets/images/*.svg` requests and no stale SVG/placeholder texture keys.
- [ ] GameScene runtime sample reports `runtimeStrategy=native-fhd-canvas`, `cameraZoom=1`, visible player inside the `1080x1920` world, active spawner, and no browser errors.

2026-07-10 evidence: build, image-quality QA, production gate, Home DPR3 runtime sample, and GameScene DPR3 runtime sample all passed; see `dev_game/docs/qa-evidence/sky-archer-2026-07-10.md`.
