# Road Stream Racer QA Evidence — 2026-07-10

Purpose: durable summary for the full-resolution loader cleanup and runtime revalidation from `dev_game/docs/full-resolution-upgrade-workload-2026-07-10.md`.

## Changes Verified

- Centralized runtime spritesheet/image/audio preload paths in `src/game/constants/gameKeys.js`.
- Changed `LoadingScene` to preload the centralized runtime asset list.
- Added `racer_ui_*` and `racer_icon_*` keys to `ASSET_KEYS`.
- Replaced HUD direct premium UI texture strings with `ASSET_KEYS`.
- Preserved existing native `1080x1920` canvas, `scaleMode: "fit"`, full-frame road loop, forest side overlay, and current racing gameplay systems.

## Gate Results

```bash
npm run build
# OK from dev_game/generated/road-stream-racer

npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/road-stream-racer
# OK: 19 assets at role-aware production-demo bar

npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/road-stream-racer --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900
# OK: common QA, production-demo QA, image-quality QA, build, visual-layout QA, scene-composite QA
```

## Runtime Assertion

Captured at `dev_game/generated/road-stream-racer/qa-captures/full-resolution-2026-07-10/asset-fidelity-runtime-sample.json`:

| Field | Value |
|---|---|
| devicePixelRatio | `2` |
| canvasBackingStoreSize | `1080x1920` |
| canvasCssRect | `x=0,y=75.328125,width=389.984375,height=693.328125` |
| activeScene | `Home` |
| requiredTexturesMissing | `[]` |
| staleTextureKeys | `[]` |
| svgResources | `[]` |
| browserErrors | `0` |

Assertions: `homeScene`, `highResolutionCanvas`, `noTripleScaledBacking`, `canvasInsideViewport`, `allRequiredTexturesLoaded`, `noStaleTextureKeys`, `noSvgResources`, and `noBrowserErrors` were all true. Capture-time WebGL `ReadPixels` performance warnings were recorded separately as browser warnings and were not page errors.

## Evidence Paths

- Per-game QA summary: `dev_game/generated/road-stream-racer/docs/06-FINAL-QA-SUMMARY.md`
- Regression checklist: `dev_game/generated/road-stream-racer/docs/07-REGRESSION-CHECKLIST.md`
- Runtime sample JSON: `dev_game/generated/road-stream-racer/qa-captures/full-resolution-2026-07-10/asset-fidelity-runtime-sample.json`
- Runtime screenshot: `dev_game/generated/road-stream-racer/qa-captures/full-resolution-2026-07-10/home-390x844-dpr2.png`
- Visual-layout screenshots: `dev_game/.tmp/visual-layout-qa/road-stream-racer`
- Scene-composite screenshots/layout JSON: `dev_game/.tmp/scene-composite-qa/road-stream-racer`
