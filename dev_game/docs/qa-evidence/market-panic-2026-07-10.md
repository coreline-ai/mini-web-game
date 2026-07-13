# Market Panic QA Evidence — 2026-07-10

Purpose: durable summary for the native FHD conversion from `dev_game/docs/full-resolution-upgrade-workload-2026-07-10.md`.

## Changes Verified

- Converted `game-spec.json` from `390x844` to native `1080x1920`, `scaleMode: "fit"`, and `maxTargetDpr: 1`.
- Preserved the dense DOM market UI as a centered `390x844` base-composition board transformed into the FHD canvas by `boardTransform()`.
- Added FHD scale helpers for Phaser-side loading UI, fallback gameplay systems, and DOM board placement.
- Centralized Boot/Loading spritesheet, image, UI, FX, background, and audio preload paths in `src/game/constants/gameKeys.js`.
- Updated `asset-plan.json`, `assets/asset-manifest.json`, tech design, asset plan, final QA summary, and regression checklist to the native FHD runtime contract.
- Added transparent edge padding to `assets/items/collectible.webp` (`1254x1254` -> `1446x1446`) after image-quality QA flagged crop-edge contact.

## Gate Results

```bash
npm run build
# OK from dev_game/generated/market-panic

npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/market-panic
# OK: 11 assets at role-aware production-demo bar

npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/market-panic --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900
# OK: common QA, production-demo QA, image-quality QA, build, visual-layout QA, scene-composite QA
```

## Runtime Assertion

Captured at `qa-captures/full-resolution-2026-07-10/market-panic/asset-fidelity-runtime-sample.json` with viewport `390x844` and `deviceScaleFactor=3`:

| Field | Value |
|---|---|
| devicePixelRatio | `3` |
| gameConfig | `1080x1920` |
| scaleGameSize | `1080x1920` |
| canvasBackingStoreSize | `1080x1920` |
| canvasCssRect | `x=0,y=75,width=390,height=693.328125` |
| domBoardBase | `390x844` |
| domBoardCssRect | `x=34.8104248046875,y=75,width=320.379150390625,height=693.328125` |
| activeScene | `Home` |
| requiredTexturesMissing | `[]` |
| staleTextureKeys | `[]` |
| svgResources | `[]` |
| browserErrors | `0` |

Assertions: `homeScene`, `canvasBacking1080x1920`, `noDpr3BackingTrap`, `gameConfig1080x1920`, `gameSize1080x1920`, `canvasInsideViewport`, `domBoardInsideCanvas`, `domBoardBase390x844`, `allRequiredTexturesLoaded`, `noRuntimeSvgRequests`, `noStaleTextureKeys`, and `noBrowserErrors` were all true.

## Gameplay Runtime Assertion

Captured at `qa-captures/full-resolution-2026-07-10/market-panic/gameplay-runtime-sample.json` after clicking Play from Home with viewport `390x844` and `deviceScaleFactor=3`:

| Field | Value |
|---|---|
| activeScenes | includes `Game` |
| runtimeStrategy | `native-fhd-canvas` |
| logicalCanvas | `1080x1920` |
| canvasBackingStoreSize | `1080x1920` |
| domBoardBase | `390x844` |
| selectedTickerId | `NOVA` |
| tickerCount | `2` |
| portfolio | `100` |
| risk | `28.7` |
| confidence | `71.8` |
| score | `1701` |
| browserErrors | `0` |

Assertions: `gameSceneActive`, `runtimeStrategyNativeFhd`, `logicalCanvas1080x1920`, `canvasBacking1080x1920`, `domBoardBase390x844`, `domBoardInsideCanvas`, `domVisible`, `marketStateLive`, and `noBrowserErrors` were all true.

## Evidence Paths

- Per-game QA summary: `dev_game/generated/market-panic/docs/06-FINAL-QA-SUMMARY.md`
- Regression checklist: `dev_game/generated/market-panic/docs/07-REGRESSION-CHECKLIST.md`
- Runtime sample JSON: `qa-captures/full-resolution-2026-07-10/market-panic/asset-fidelity-runtime-sample.json`
- Runtime screenshot: `qa-captures/full-resolution-2026-07-10/market-panic/home-390x844-dpr3.png`
- Gameplay sample JSON: `qa-captures/full-resolution-2026-07-10/market-panic/gameplay-runtime-sample.json`
- Gameplay screenshot: `qa-captures/full-resolution-2026-07-10/market-panic/game-390x844-dpr3.png`
- Visual-layout screenshots: `dev_game/.tmp/visual-layout-qa/market-panic`
- Scene-composite screenshots: `dev_game/.tmp/scene-composite-qa/market-panic`
