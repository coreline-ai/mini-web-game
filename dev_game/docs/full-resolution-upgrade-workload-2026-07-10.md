# Full-Resolution Upgrade Workload — 2026-07-10

Scope: all games under `dev_game/generated/*`.

Method:

- One read-only parallel explorer agent assessed each generated game.
- The main agent cross-checked with `game-spec.json`, Phaser config/runtime scale helpers, loader paths, asset manifests, docs, and `sips` pixel dimensions.
- No sub-agent edited files. This document is the consolidated workload and update plan.

## 2026-07-13 Runtime Delivery Completion

The 10-game runtime delivery/HQ/production-tree follow-up is complete. All games now use a strict manifest allowlist, all static and browser gates pass, and aggregate `dist` size changed from `211,042,551B` to `127,585,708B` (`39.55%` reduction). See [`runtime-delivery-results-2026-07-13.md`](runtime-delivery-results-2026-07-13.md) for the per-game file counts, byte budgets, HQ results, and gate matrix.

## Parcel Baseline Contract

Use `parcel-sort-rush` as the full-resolution target pattern, but do not blindly copy parcel-specific gameplay constants.

Required baseline traits:

- `SPEC.canvas.width = 1080`, `SPEC.canvas.height = 1920`, portrait, `scaleMode: fit`.
- Phaser runtime uses the full logical canvas directly from `SPEC.canvas`, not a `390x844` logical canvas with DPR multiplication.
- Loaded backgrounds or screen-level assets are at least `1080x1920`.
- Runtime sprite/UI source pixels are large enough for their rendered size on a `1080x1920` world.
- Production assets are isolated per game, ideally under `assets/images/production/**`, with corresponding `assets/imagegen/raw/**` and `assets/imagegen/sheets/**` where the game has that pipeline.
- `gameKeys` / `LoadingScene` own runtime preload paths; stale SVG/scaffold assets are not used as production runtime assets.
- `asset-manifest.json`, `asset-plan.json`, README/docs, final QA evidence, and regression checklist describe the current full-resolution runtime truth.
- Final verification includes build, production-demo QA, image-quality QA, visual-layout QA, scene-composite QA, and a runtime assertion that game config/canvas backing store is `1080x1920` where applicable.

Baseline caveat:

- `parcel-sort-rush` itself is not perfectly clean yet. Its baseline cleanup is small but should happen before using it as a copyable template: fix verifier drift for `stamp_wrong` size, borderline chute alpha checks, and stale life/UI spec fields.

## Workload Summary

| Game | Current canvas | Estimate | Main reason |
|---|---:|---|---|
| `parcel-sort-rush` | `1080x1920` | Done | Strict runtime delivery, raw/sheets exclusion, physical-file dedupe and verifier checks pass. |
| `bullseye-rush` | `1080x1920` | Done | HQ failures 6→0; strict runtime delivery and browser gates pass. |
| `castle-archer` | `1080x1920` | Done | `_source`/unused asset delivery excluded; strict runtime and browser gates pass. |
| `jungle-arcshot` | `1080x1920` | Done | HQ failures 2→0; strict runtime delivery and browser gates pass. |
| `road-stream-racer` | `1080x1920` | Done | References excluded and loader/manifest 36-file contract verified. |
| `rush-lane-racer` | `1080x1920` | Done | Production tree, strict delivery, visual gates, and five-position physics regression pass. |
| `meteor-dash` | `1080x1920` | Done | Native FHD conversion complete; DPR backing-store trap removed and gates passed. |
| `sky-archer` | `1080x1920` | Done | Native FHD conversion complete; DPR backing-store trap removed and gates passed. |
| `market-panic` | `1080x1920` | Done | Native FHD canvas complete with centered 390x844 DOM board strategy; gates passed. |
| `target-shooter-rush` | `1080x1920` | Done | Native FHD conversion complete; target/shooting/UI constants retuned and gates passed. |

## Per-Game Plans

### parcel-sort-rush — S

Current state:

- Already uses `1080x1920` logical canvas and Phaser config directly from `SPEC.canvas`.
- Runtime assets are already organized as `assets/images/production/**` and `assets/audio/production/**`.
- Production backgrounds are `1080x1920`.

Implementation status:

- 2026-07-10: baseline cleanup implemented and verified. `stamp_wrong` expectation now matches its `512x512` production file, chute alpha verifier drift is resolved, stale lives/UI spec fields are aligned with runtime, seven high-frequency assets were minimally polished, and production gate passed for `390x844,430x932,1080x1920`.
- Evidence: `dev_game/generated/parcel-sort-rush/docs/06-FINAL-QA-SUMMARY.md`, `dev_game/generated/parcel-sort-rush/docs/07-REGRESSION-CHECKLIST.md`, and `dev_game/docs/qa-evidence/parcel-sort-rush-2026-07-10.md`.

Asset work:

- Done: `stamp_wrong` actual size and verifier expectation agree.
- Done: `chute_cold` and `chute_fragile` alpha verifier drift resolved after visual inspection and pixel-stat review.

Code/docs work:

- Done: top-level `lives` / `ui.showLives` harmonized with `sorting.lives` and HUD behavior.
- Done: query-string cache busters versus manifest paths documented.

QA:

- `python3 dev_game/generated/parcel-sort-rush/scripts/verify_gpt_imagegen_assets.py`
- `python3 dev_game/generated/parcel-sort-rush/scripts/verify_gpt_imagegen_assets.py --manifest-only`
- `npm --prefix dev_game/generated/parcel-sort-rush run build`
- `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/parcel-sort-rush --require-gpt-imagegen --viewports 390x844,430x932,1080x1920`

### bullseye-rush — M

Current state:

- Already `1080x1920` logical canvas and Phaser runtime.
- Backgrounds are `1080x1920`, `2160x3840`, `1080x1920`.
- Runtime sprites/UI are large enough for FHD use.

Implementation status:

- 2026-07-10: loader/manifest asset cleanup implemented and verified. Runtime SVG placeholder loads were removed, target/star/arrow production PNGs now preload in `LoadingScene`, stage background manifest source fields are `generated-for-game`, player spritesheet frame padding was repaired, and production gate passed for `390x844,430x932,1080x1920,1280x900`.
- Evidence: `dev_game/generated/bullseye-rush/docs/06-FINAL-QA-SUMMARY.md`, `dev_game/generated/bullseye-rush/docs/07-REGRESSION-CHECKLIST.md`, and `dev_game/docs/qa-evidence/bullseye-rush-2026-07-10.md`.

Asset work:

- Done: no mandatory regeneration for current gameplay assets; `player.png` was source-edited for alpha padding safety.
- Deferred: move/copy production PNGs into `assets/images/production/**` only if strict parcel-style folder parity becomes mandatory.
- Optional: generate dedicated FHD screen assets for Loading/Home/Pause/GameOver if screen-level raster ownership becomes mandatory.
- Done: obsolete SVG placeholder runtime loads removed; SVG files remain non-runtime leftovers.

Code/docs work:

- Done: production target/star/arrow assets preload in `LoadingScene` instead of late/fallback scene loads.
- Done: obsolete SVG loads removed from active runtime and verified by browser resource sample.
- Done: `asset-manifest.json`, docs, QA summary, and regression checklist updated to current runtime truth.

QA:

- Build, production-demo QA with imagegen provenance, image-quality QA, visual-layout QA at `390x844,430x932,1080x1920,1280x900`, scene-composite QA, and browser sample proving `1080x1920` backing store.

### castle-archer — M

Current state:

- Already `1080x1920`; config uses `PHYSICAL_WIDTH/HEIGHT` derived directly from `SPEC.canvas`.
- All loaded stage backgrounds are `1080x1920`.
- Sprite/UI source pixels are sufficient.

Implementation status:

- 2026-07-10: loader/manifest/docs cleanup implemented and verified. Runtime spritesheet/image/audio paths are centralized in `gameKeys.js`, `LoadingScene` preloads the centralized list, `GameScene` no longer late-loads `arrow`, runtime texture strings were consolidated through `ASSET_KEYS`, SVG was removed from allowed runtime image formats, and production gate passed for `390x844,430x932,1080x1920,1280x900`.
- Evidence: `dev_game/generated/castle-archer/docs/06-FINAL-QA-SUMMARY.md`, `dev_game/generated/castle-archer/docs/07-REGRESSION-CHECKLIST.md`, and `dev_game/docs/qa-evidence/castle-archer-2026-07-10.md`.

Asset work:

- Done: no dimension-driven regeneration required for current runtime art.
- Done: unused scaffold SVGs are documented as non-runtime leftovers and are not allowed by runtime image policy.
- Deferred: re-home existing production PNGs from role folders into `assets/images/production/**` only if strict parcel-style folder parity becomes mandatory.

Code/docs work:

- Done: centralized runtime preload paths in `gameKeys.js`.
- Done: removed `GameScene.preload()` late `arrow` load.
- Done: updated manifest, asset/audio plan, technical design, final QA summary, regression checklist, and cross-game QA evidence.

QA:

- `npm run build`
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/castle-archer`
- `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/castle-archer --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900`
- Runtime sample proves `1080x1920` backing store, required textures loaded, no accidental DPR multiplier, no stale SVG resource requests, no stale SVG/placeholder texture keys, and no browser errors.

### jungle-arcshot — M

Current state:

- Already `1080x1920`; Phaser uses a native FHD canvas.
- Backgrounds are `1080x2160`, `1080x1920`, `2160x3840`.
- Source pixels exceed rendered world sizes.

Implementation status:

- 2026-07-10: loader/manifest/scale/docs cleanup implemented and verified. Runtime spritesheet/image/audio paths are centralized in `gameKeys.js`, `LoadingScene` preloads the centralized list, `GameScene` no longer late-loads `fruit`/`balloon`/`arrow`, stage background manifest sources are `generated-for-game`, SVG was removed from allowed runtime image formats, and `scaleMode` was corrected from `cover` to `fit` after production-gate caught mobile canvas clipping.
- Evidence: `dev_game/generated/jungle-arcshot/docs/06-FINAL-QA-SUMMARY.md`, `dev_game/generated/jungle-arcshot/docs/07-REGRESSION-CHECKLIST.md`, and `dev_game/docs/qa-evidence/jungle-arcshot-2026-07-10.md`.

Asset work:

- Done: no mandatory resizing required for current runtime art.
- Done: legacy SVG placeholders are not part of the runtime preload contract.
- Deferred: optional production-folder migration for backgrounds/sprites/UI/FX.
- Deferred: optional new FHD screen assets for non-gameplay scenes.

Code/docs work:

- Done: fixed manifest contradictions where production backgrounds were still marked as `source: "placeholder"`.
- Done: updated tech design, asset/audio plan, final QA summary, regression checklist, and cross-game QA evidence.
- Done: added runtime evidence for the old `390x844` composition mapping inside the `1080x1920` world under `Scale.FIT`.

QA:

- `npm run build`
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/jungle-arcshot`
- `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/jungle-arcshot --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900`
- Runtime sample proves `1080x1920` backing store, canvas CSS rect inside mobile viewport, required textures loaded, no accidental DPR multiplier, no stale SVG resource requests, no stale SVG/placeholder texture keys, and no browser errors.

### market-panic — L

Current state:

- Converted to native `1080x1920`; Phaser config reads `SPEC.canvas` directly.
- DOM UI keeps the proven `390x844` base-composition CSS and is transformed into a centered FHD board with `boardTransform()`.
- Backgrounds are `1080x1920`; foreground/FX sources are sufficient after `collectible.webp` padding.

Implementation status:

- 2026-07-10: native FHD conversion implemented and verified. `game-spec.json` now uses `1080x1920`, `scaleMode: "fit"`, and `maxTargetDpr: 1`; DOM scene/game overlays render through a centered `390x844` board inside the FHD canvas; Boot/Loading runtime asset paths are centralized in `gameKeys.js`; manifest/docs were synced to native FHD; `collectible.webp` was padded after image-quality QA caught crop-edge contact; production gate passed for `390x844,430x932,1080x1920,1280x900`.
- Evidence: `dev_game/generated/market-panic/docs/06-FINAL-QA-SUMMARY.md`, `dev_game/generated/market-panic/docs/07-REGRESSION-CHECKLIST.md`, and `dev_game/docs/qa-evidence/market-panic-2026-07-10.md`.

Asset work:

- Done: no required background regeneration; active WebP backgrounds are already `1080x1920`.
- Done: padded `assets/items/collectible.webp` from `1254x1254` to `1446x1446` to satisfy crop-edge QA.
- Done: stale SVG placeholders remain non-runtime leftovers and were not requested by browser samples.
- Deferred: optional production-folder migration only if strict parcel-style path parity becomes mandatory.

Code/docs work:

- Done: canonical canvas changed to `1080x1920`.
- Done: DOM CSS remains at the stable 390-grid baseline but is scaled and centered inside the FHD canvas by `boardTransform()`.
- Done: verified Phaser scene size, DOM root base size, HUD/cards/home panels, and market action grid through production gate and runtime samples.
- Done: updated asset plan, manifest, tech design, asset/audio plan, final QA, regression checklist, and cross-game QA evidence.

QA:

- `npm run build`
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/market-panic`
- `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/market-panic --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900`
- Runtime sample proves DPR3 does not create a `3240x5760` backing store: `game.config=1080x1920`, `scale.gameSize=1080x1920`, canvas backing store `1080x1920`, canvas CSS rect inside mobile viewport, centered DOM board base `390x844`, required textures loaded, no stale SVG resource requests, no stale SVG/placeholder texture keys, and no browser errors.
- Gameplay sample proves GameScene starts under the FHD runtime: active scene `Game`, runtime strategy `native-fhd-canvas`, centered DOM game board visible, live market state, and no browser errors.

### meteor-dash — M to L

Current state:

- Converted to native `1080x1920`; Phaser config reads `SPEC.canvas` and `HiDpi.js` keeps camera zoom/backing store at 1x.
- Background source files remain `1170x2532`, above the FHD runtime target, and are displayed in the native `1080x1920` frame.
- Sprites/UI have strong source pixels and passed role-aware image quality QA.

Implementation status:

- 2026-07-10: native FHD conversion implemented and verified. `game-spec.json` now uses `1080x1920`, `scaleMode: "fit"`, and `maxTargetDpr: 1`; DPR-based physical canvas multiplication was removed; gameplay, HUD, button, particle, banner, shield, and spawn constants now scale from the old 390×844 composition into the FHD world; runtime asset paths are centralized in `gameKeys.js` and `LoadingScene`; manifest/docs were synced to native FHD; production gate passed for `390x844,430x932,1080x1920,1280x900`.
- Evidence: `dev_game/generated/meteor-dash/docs/06-FINAL-QA-SUMMARY.md`, `dev_game/generated/meteor-dash/docs/07-REGRESSION-CHECKLIST.md`, and `dev_game/docs/qa-evidence/meteor-dash-2026-07-10.md`.

Asset work:

- Done: no required regeneration for current core sprites/UI/FX after image-quality and runtime texture checks.
- Done: manifest and docs describe background sources as `1170x2532` source files displayed in the native FHD runtime frame.
- Deferred: generate exact `1080x1920` replacement backgrounds only if a future visual review requires stricter no-resample background provenance.
- Deferred: optional FHD screen assets if screen-level raster ownership becomes mandatory.

Code/docs work:

- Done: spec canvas changed to `1080x1920`.
- Done: DPR physical-canvas flow replaced with direct native logical canvas.
- Done: retuned TUNING, HUD/buttons/fonts, hitboxes, particles, shower/banner positions, shield pickups, spawn margins, and safe margins through FHD scale helpers.
- Done: centralized runtime spritesheet/image/audio paths in `gameKeys`.
- Done: updated `asset-manifest.json`, `asset-plan.json`, technical design, asset plan, final QA summary, regression checklist, and cross-game QA evidence.

QA:

- `npm run build`
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/meteor-dash`
- `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/meteor-dash --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900`
- Runtime sample proves DPR3 does not create a `3240x5760` backing store: `game.config=1080x1920`, `scale.gameSize=1080x1920`, canvas backing store `1080x1920`, canvas CSS rect inside mobile viewport, required textures loaded, no stale SVG resource requests, no stale SVG/placeholder texture keys, and no browser errors.
- Gameplay sample proves GameScene starts under the FHD runtime: active scene `Game`, runtime strategy `native-fhd-canvas`, camera zoom `1`, visible player inside the `1080x1920` world, active spawner, and no browser errors.

### road-stream-racer — M

Current state:

- Already `1080x1920`; Phaser config reads `SPEC.canvas`.
- Active road loop and forest overlay are `1080x1920`.
- Runtime sprites/UI have sufficient source pixels.

Implementation status:

- 2026-07-10: loader/docs evidence cleanup implemented and verified. Runtime spritesheet/image/audio paths are centralized in `gameKeys.js`, `LoadingScene` preloads the centralized list, premium HUD UI/icon keys are tracked through `ASSET_KEYS`, and production gate passed for `390x844,430x932,1080x1920,1280x900`.
- Evidence: `dev_game/generated/road-stream-racer/docs/06-FINAL-QA-SUMMARY.md`, `dev_game/generated/road-stream-racer/docs/07-REGRESSION-CHECKLIST.md`, and `dev_game/docs/qa-evidence/road-stream-racer-2026-07-10.md`.

Asset work:

- Done: no required regeneration or resizing for current loaded runtime assets.
- Done: premium HUD PNGs are in the central runtime preload contract.
- Deferred: optional re-home into `assets/images/production/**`.
- Deferred: decide whether unused old road tiles and scaffold SVGs stay as source/reference or are removed from runtime-facing plans.

Code/docs work:

- Done: updated `gameKeys.js`, `LoadingScene`, `HudUI`, tech design, final QA summary, regression checklist, and cross-game QA evidence.
- Deferred: update `asset-plan.json` only if strict parcel-style consolidated schema is required; current manifest already lists active full-frame road loop and overlay.
- Deferred: consider deriving scale helper constants from `SPEC.canvas` in a broader refactor.

QA:

- `npm run build`
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/road-stream-racer`
- `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/road-stream-racer --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900`
- Runtime sample proves `1080x1920` backing store, canvas CSS rect inside mobile viewport, required textures loaded, no accidental DPR multiplier, no stale SVG resource requests, no stale SVG/placeholder texture keys, and no browser errors.

### rush-lane-racer — M

Current state:

- Already `1080x1920`; Phaser config reads `SPEC.canvas`.
- Stage backgrounds are all `1080x1920`.
- Runtime sprites/buttons are source-large enough for `maxTargetDpr=1`.
- Current uncommitted physics-bounds polish must be preserved.

Implementation status:

- 2026-07-10: Physics Bounds polish preserved and FHD loader contract rechecked. `PhysicsBounds.setBodySizeInDisplayPixels()` keeps player, hazard, and collectible bodies aligned with displayed sprites; `AUDIO_PATHS` was added so images, backgrounds, and audio preload paths are centralized in `gameKeys.js`; production gate passed for `390x844,430x932,1080x1920,1280x900`.
- Evidence: `dev_game/generated/rush-lane-racer/docs/06-FINAL-QA-SUMMARY.md`, `dev_game/generated/rush-lane-racer/docs/07-REGRESSION-CHECKLIST.md`, and `dev_game/docs/qa-evidence/rush-lane-racer-2026-07-10.md`.

Asset work:

- Done: no required resize for current loaded assets.
- Done: runtime PNGs are loaded through centralized image/background maps; no SVG runtime resources in the sample.
- Deferred: move/copy loaded PNGs into a production asset tree if strict baseline parity is required.
- Deferred: optional new `1080x1920` screen assets for Loading/Home/Pause/GameOver.

Code/docs work:

- Done: `gameKeys` / `LoadingScene` centralize image, background, and audio paths.
- Done: asset-fidelity runtime sample records DPR, canvas CSS/backing store, required texture keys, stale SVG resources, stale texture keys, and browser errors.
- Done: kept existing `PhysicsBounds` helper and regression checklist intact while adding FHD loader checks.
- Done: updated final QA evidence and workload status.

QA:

- `npm run build`
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/rush-lane-racer`
- `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/rush-lane-racer --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900`
- Runtime sample proves `1080x1920` backing store at DPR3, canvas CSS rect inside mobile viewport, required textures loaded, no accidental DPR multiplier, no stale SVG resource requests, no stale SVG/placeholder texture keys, and no browser errors.
- Physics-bounds regression evidence remains in `qa-captures/2026-07-10-physics-bounds/after-samples.json`.

### sky-archer — M to L

Current state:

- Converted to native `1080x1920`; Phaser config reads `SPEC.canvas` through `PHYSICAL_CANVAS`, now equal to the native logical canvas.
- Backgrounds are `1080x1920` and fit the runtime target exactly.
- Runtime sprites/UI passed role-aware image quality QA after FHD scaling.

Implementation status:

- 2026-07-10: native FHD conversion implemented and verified. `game-spec.json` now uses `1080x1920`, `scaleMode: "fit"`, and `maxTargetDpr: 1`; DPR-based physical canvas multiplication was removed; player, hazards, collectibles, arrows, HUD, buttons, loading UI, feedback FX, spawn margins, pointer guard, and failure line are scaled from the old 390×844 composition into the FHD world; runtime asset paths are centralized in `gameKeys.js` and `LoadingScene`; manifest/docs were synced to native FHD; production gate passed for `390x844,430x932,1080x1920,1280x900`.
- Evidence: `dev_game/generated/sky-archer/docs/06-FINAL-QA-SUMMARY.md`, `dev_game/generated/sky-archer/docs/07-REGRESSION-CHECKLIST.md`, and `dev_game/docs/qa-evidence/sky-archer-2026-07-10.md`.

Asset work:

- Done: no required regeneration for current backgrounds, core sprites, projectile, UI, or FX after image-quality and runtime texture checks.
- Done: manifest marks production backgrounds as `generated-for-game` and removes SVG from allowed runtime image formats.
- Done: stale SVG placeholders remain non-runtime leftovers and were not requested by the browser sample.
- Deferred: optional production-folder migration only if strict parcel-style path parity becomes mandatory.

Code/docs work:

- Done: spec and asset-plan canvas changed to `1080x1920`.
- Done: `HiDpi.js` simplified to native FHD; no DPR multiplication remains.
- Done: retuned gameplay speeds, object sizes, hitboxes, fail line, HUD, Home/Pause/GameOver text/buttons, and arrow behavior through FHD scale helpers.
- Done: added background/UI/FX/arrow keys and centralized path maps to `gameKeys`.
- Done: updated manifest, tech design, asset/audio plan, final QA summary, regression checklist, and cross-game QA evidence.

QA:

- `npm run build`
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/sky-archer`
- `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/sky-archer --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900`
- Runtime sample proves DPR3 does not create a `3240x5760` backing store: `game.config=1080x1920`, `scale.gameSize=1080x1920`, canvas backing store `1080x1920`, canvas CSS rect inside mobile viewport, required textures loaded, no stale SVG resource requests, no stale SVG/placeholder texture keys, and no browser errors.
- Gameplay sample proves GameScene starts under the FHD runtime: active scene `Game`, runtime strategy `native-fhd-canvas`, camera zoom `1`, visible player inside the `1080x1920` world, active spawner/arrows, and no browser errors.

### target-shooter-rush — Done

Current state:

- Converted to native `1080x1920`; Phaser runtime uses `SPEC.canvas` directly.
- Active production backgrounds are already `1080x1920` under `assets/images/production/**`.
- Target, hit burst, pause icon, and FHD backgrounds pass role-aware image-quality QA; runtime reticle is generated at FHD-safe source size.

Implementation status:

- 2026-07-10: native FHD conversion implemented and verified. `game-spec.json` and `asset-plan.json` now use `1080x1920`, `scaleMode: "fit"`, and `maxTargetDpr: 1`; target sizes/speeds, gallery bounds, muzzle, reticle, HUD, buttons, feedback positions, shot line width, and hit-burst clamps are scaled into the FHD world; runtime image/background/audio paths are centralized in `gameKeys.js`; `crosshair.png` is no longer preloaded as runtime UI; `bullseye_target.png` was rebuilt from the imagegen raw sprite to restore production color/detail and remove magenta key residue; production gate passed for `390x844,430x932,1080x1920,1280x900`.
- Evidence: `dev_game/generated/target-shooter-rush/docs/06-FINAL-QA-SUMMARY.md`, `dev_game/generated/target-shooter-rush/docs/07-REGRESSION-CHECKLIST.md`, and `dev_game/docs/qa-evidence/target-shooter-rush-2026-07-10.md`.

Asset work:

- Done: no active background regeneration required; all three gallery backgrounds are native `1080x1920`.
- Done: rebuilt active target production PNG from `assets/imagegen/raw/sprites/bullseye_target.png`; final file is `512x512`, measured `13117` colors, and has `32/37/32/38` alpha padding.
- Done: runtime reticle is generated as `reticle_ui` at `218x218` source size and displayed at scaled gameplay size.
- Done: `crosshair.png`, stale scaffold SVGs, and `assets/backgrounds/stage-*` are documented as non-runtime leftovers/reference artifacts and were not requested by the browser sample.

Code/docs work:

- Done: changed `SPEC.canvas` and `asset-plan.canvas` to `1080x1920`.
- Done: added base-canvas/FHD scale helpers; retuned shooting config, gallery bounds, target sizes, speeds, muzzle, reticle, HUD, button/text sizes, feedback positions, shot line width, focus veil, `Juice`, and inactive fallback spawner dimensions.
- Done: centralized runtime image, background, and audio preload paths in `gameKeys.js`.
- Done: added `window.__TARGET_SHOOTER_DEBUG__.get()` for runtime contract assertions.
- Done: updated regression edge assertions from hard-coded small-canvas checks to canvas-derived checks.
- Done: updated asset plan, manifest, technical design, asset/audio plan, adversarial review note, final QA, regression checklist, and cross-game QA evidence.

QA:

- `npm run build`
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/target-shooter-rush`
- `npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/target-shooter-rush --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900`
- Runtime sample proves DPR3 does not create a `3240x5760` backing store: `game.config=1080x1920`, `scale.gameSize=1080x1920`, canvas backing store `1080x1920`, canvas CSS rect inside mobile viewport, required textures loaded, `crosshair` artifact not preloaded, no stale SVG or `assets/backgrounds/stage-*` resource requests, and no browser errors.
- Gameplay sample proves GameScene starts under the FHD runtime and target hit detection works: active scene `Game`, runtime strategy `native-fhd-canvas`, `reticle_ui` source `218x218`, target safe-X true, QA shot increments shots `0 -> 1` and hits `0 -> 1`, and no browser errors.

## Recommended Execution Order

1. Clean the baseline: finish `parcel-sort-rush` verifier/spec cleanup so the pattern is copyable.
2. Done: add a shared full-resolution acceptance checklist to docs: `dev_game/docs/full-resolution-acceptance-checklist.md`.
3. Convert already-FHD games first because they are lower risk: `bullseye-rush`, `castle-archer`, `jungle-arcshot`, `road-stream-racer`, `rush-lane-racer`.
4. Done: converted 390 logical canvas games in isolated passes: `meteor-dash`, `sky-archer`, `market-panic`, `target-shooter-rush`.
5. Done: ran per-game gates and final cross-game inventory checks proving every generated game now has `SPEC.canvas=1080x1920` and no runtime grep target shows DPR-multiplying a `1080x1920` canvas.

## Common QA Gate Set

Use per game after edits:

```bash
npm --prefix dev_game/generated/<game-id> run build
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/<game-id> --require-gpt-imagegen
npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/<game-id>
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/<game-id> --viewports 390x844,430x932,1080x1920,1280x900
npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/<game-id> --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900
```

Add custom Playwright samples where current gates do not prove the key requirement:

- `game.config.width/height === 1080/1920`
- Phaser `scale.gameSize` or equivalent runtime logical size is `1080x1920`
- canvas backing store is not an accidental `3240x5760` from DPR multiplication
- loaded production texture keys do not point at SVG placeholders
- source texture pixels meet or exceed rendered world size for key sprites/UI
