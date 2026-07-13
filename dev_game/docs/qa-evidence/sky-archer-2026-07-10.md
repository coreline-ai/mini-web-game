# Sky Archer QA Evidence — 2026-07-10

Purpose: durable summary for the native FHD conversion from `dev_game/docs/full-resolution-upgrade-workload-2026-07-10.md`.

## Changes Verified

- Converted `game-spec.json` from the old 390×844 logical canvas with DPR multiplication to native `1080x1920`, `scaleMode: "fit"`, and `maxTargetDpr: 1`.
- Simplified `HiDpi.js` so the runtime does not multiply the backing store by device DPR.
- Added FHD scale helpers for player, hazards, collectibles, arrows, spawn margins, failure line, HUD, buttons, loading UI, and feedback FX.
- Centralized runtime spritesheet/image/audio preload paths in `src/game/constants/gameKeys.js`.
- Changed `LoadingScene` to preload the centralized runtime asset list before gameplay.
- Removed the GameScene late-load path for `arrow`; projectile art now loads through the central runtime preload contract.
- Updated `asset-plan.json`, `assets/asset-manifest.json`, tech design, asset plan, final QA summary, and regression checklist to the native FHD runtime contract.

## Gate Results

```bash
npm run build
# OK from dev_game/generated/sky-archer

npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/sky-archer
# OK: 13 assets at role-aware production-demo bar

npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/sky-archer --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900
# OK: common QA, production-demo QA, image-quality QA, build, visual-layout QA, scene-composite QA
```

## Runtime Assertion

Captured at `qa-captures/full-resolution-2026-07-10/sky-archer/asset-fidelity-runtime-sample.json` with viewport `390x844` and `deviceScaleFactor=3`:

| Field | Value |
|---|---|
| devicePixelRatio | `3` |
| gameConfig | `1080x1920` |
| scaleGameSize | `1080x1920` |
| canvasBackingStoreSize | `1080x1920` |
| canvasCssRect | `x=0,y=75,width=390,height=693.328125` |
| activeScene | `Home` |
| requiredTexturesMissing | `[]` |
| staleTextureKeys | `[]` |
| svgResources | `[]` |
| browserErrors | `0` |

Assertions: `homeScene`, `canvasBacking1080x1920`, `noDpr3BackingTrap`, `gameConfig1080x1920`, `gameSize1080x1920`, `canvasInsideViewport`, `allRequiredTexturesLoaded`, `noRuntimeSvgRequests`, `noStaleTextureKeys`, and `noBrowserErrors` were all true.

## Gameplay Runtime Assertion

Captured at `qa-captures/full-resolution-2026-07-10/sky-archer/gameplay-runtime-sample.json` after clicking PLAY from Home with viewport `390x844` and `deviceScaleFactor=3`:

| Field | Value |
|---|---|
| activeScenes | `["Game"]` |
| runtimeStrategy | `native-fhd-canvas` |
| logicalCanvas | `1080x1920` |
| canvasBackingStoreSize | `1080x1920` |
| cameraZoom | `1` |
| player | `x=540,y=1657.5520382760128,width=227.48815165876778,height=227.48815165876778` |
| hazardsActive | `1` |
| arrowsActive | `2` |
| browserErrors | `0` |

Assertions: `gameSceneActive`, `runtimeStrategyNativeFhd`, `logicalCanvas1080x1920`, `canvasBacking1080x1920`, `cameraZoomOne`, `playerWithinWorld`, `playerVisible`, `spawnerActive`, `arrowsPoolPresent`, and `noBrowserErrors` were all true.

## Evidence Paths

- Per-game QA summary: `dev_game/generated/sky-archer/docs/06-FINAL-QA-SUMMARY.md`
- Regression checklist: `dev_game/generated/sky-archer/docs/07-REGRESSION-CHECKLIST.md`
- Runtime sample JSON: `qa-captures/full-resolution-2026-07-10/sky-archer/asset-fidelity-runtime-sample.json`
- Runtime screenshot: `qa-captures/full-resolution-2026-07-10/sky-archer/home-390x844-dpr3.png`
- Gameplay sample JSON: `qa-captures/full-resolution-2026-07-10/sky-archer/gameplay-runtime-sample.json`
- Gameplay screenshot: `qa-captures/full-resolution-2026-07-10/sky-archer/game-390x844-dpr3.png`
- Visual-layout screenshots: `dev_game/.tmp/visual-layout-qa/sky-archer`
- Scene-composite screenshots: `dev_game/.tmp/scene-composite-qa/sky-archer`
