# Bullseye Rush QA Evidence — 2026-07-10

Purpose: durable summary for the full-resolution loader and asset-manifest cleanup from `dev_game/docs/full-resolution-upgrade-workload-2026-07-10.md`.

## Changes Verified

- Centralized runtime spritesheet/image/audio preload paths in `src/game/constants/gameKeys.js`.
- Moved target/star/arrow production PNG preload into `LoadingScene`; removed `GameScene.preload()` late image loads.
- Stopped runtime loading of scaffold SVGs from `assets/images/*.svg`.
- Corrected `asset-manifest.json` stage background source fields from `placeholder` to `generated-for-game`.
- Removed SVG from manifest allowed runtime image formats.
- Recentered `assets/characters/player.png` frame contents so each 512×512 spritesheet cell has safe alpha padding and passes image-quality crop checks.

## Gate Results

```bash
npm run build
# OK from dev_game/generated/bullseye-rush

npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/bullseye-rush
# OK: 11 assets at role-aware production-demo bar

npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/bullseye-rush --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900
# OK: common QA, production-demo QA, image-quality QA, build, visual-layout QA, scene-composite QA
```

## Runtime Assertion

Captured at `dev_game/generated/bullseye-rush/qa-captures/full-resolution-2026-07-10/asset-fidelity-runtime-sample.json`:

| Field | Value |
|---|---|
| runtimeStrategy | `native-fhd-canvas` |
| devicePixelRatio | `3` |
| maxTargetDpr | `1` |
| logicalCanvas | `1080x1920` |
| baseCompositionCanvas | `390x844` |
| physicalCanvasTarget | `1080x1920` |
| canvasCssSize | `390x693` |
| canvasBackingStoreSize | `1080x1920` |
| backingScale | `2.77` |
| gameConfig | `1080x1920` |
| activeSceneKeys | `Home` |
| staleSvgResources | `[]` |
| staleSvgTextureKeys | `[]` |
| browserErrors | `0` |

Assertions: `configIs1080x1920`, `backingStoreIs1080x1920`, `noAccidentalDprMultiplier`, `activeSceneIsHome`, `requiredTexturesLoaded`, `sourceSizesMeetRequired`, `noStaleSvgResources`, `noStaleSvgTextureKeys`, and `browserErrorsZero` were all true.

## Evidence Paths

- Per-game QA summary: `dev_game/generated/bullseye-rush/docs/06-FINAL-QA-SUMMARY.md`
- Regression checklist: `dev_game/generated/bullseye-rush/docs/07-REGRESSION-CHECKLIST.md`
- Runtime sample JSON: `dev_game/generated/bullseye-rush/qa-captures/full-resolution-2026-07-10/asset-fidelity-runtime-sample.json`
- Runtime screenshot: `dev_game/generated/bullseye-rush/qa-captures/full-resolution-2026-07-10/home-390x844-dpr3.png`
- Visual-layout screenshots: `dev_game/.tmp/visual-layout-qa/bullseye-rush`
- Scene-composite screenshots/layout JSON: `dev_game/.tmp/scene-composite-qa/bullseye-rush`
