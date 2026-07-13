# Jungle Arc Shot QA Evidence — 2026-07-10

Purpose: durable summary for the full-resolution loader, manifest, scale-mode, and stale-runtime cleanup from `dev_game/docs/full-resolution-upgrade-workload-2026-07-10.md`.

## Changes Verified

- Centralized runtime spritesheet/image/audio preload paths in `src/game/constants/gameKeys.js`.
- Changed `LoadingScene` to preload the centralized runtime asset list.
- Removed `GameScene.preload()` late loading for `fruit`, `balloon`, and `arrow`.
- Replaced hard-coded runtime texture strings for arrow, fruit/balloon creation, backgrounds, pause UI, and FX with `ASSET_KEYS`.
- Changed `game-spec.json` from `scaleMode: "cover"` to `scaleMode: "fit"` after production-gate caught mobile canvas clipping.
- Removed SVG from manifest allowed runtime image formats.
- Corrected stage background manifest `source` fields from `placeholder` to `generated-for-game`.
- Updated tech/asset docs so the current runtime is native `1080x1920` with a centralized PNG/WAV preload contract.

## Gate Results

```bash
npm run build
# OK from dev_game/generated/jungle-arcshot

npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/jungle-arcshot
# OK: 15 assets at role-aware production-demo bar

npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/jungle-arcshot --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900
# OK after scaleMode was changed to fit
```

Before the scale fix, the same production-gate failed visual-layout QA because `cover` made the canvas clip outside mobile viewports: `390x844` rendered canvas CSS rect `x=-42,width=474`, and `430x932` rendered `x=-47,width=524`.

## Runtime Assertion

Captured at `dev_game/generated/jungle-arcshot/qa-captures/full-resolution-2026-07-10/asset-fidelity-runtime-sample.json`:

| Field | Value |
|---|---|
| devicePixelRatio | `2` |
| canvasBackingStoreSize | `1080x1920` |
| canvasCssRect | `x=0,y=75,width=390,height=693` |
| activeScene | `Home` |
| requiredTexturesMissing | `[]` |
| staleTextureKeys | `[]` |
| svgResources | `[]` |
| browserErrors | `0` |

Assertions: `homeScene`, `highResolutionCanvas`, `noTripleScaledBacking`, `canvasInsideViewport`, `allRequiredTexturesLoaded`, `noStaleTextureKeys`, `noSvgResources`, and `noBrowserErrors` were all true. Capture-time WebGL `ReadPixels` performance warnings were recorded separately as browser warnings and were not page errors.

## Evidence Paths

- Per-game QA summary: `dev_game/generated/jungle-arcshot/docs/06-FINAL-QA-SUMMARY.md`
- Regression checklist: `dev_game/generated/jungle-arcshot/docs/07-REGRESSION-CHECKLIST.md`
- Runtime sample JSON: `dev_game/generated/jungle-arcshot/qa-captures/full-resolution-2026-07-10/asset-fidelity-runtime-sample.json`
- Runtime screenshot: `dev_game/generated/jungle-arcshot/qa-captures/full-resolution-2026-07-10/home-390x844-dpr2.png`
- Visual-layout screenshots: `dev_game/.tmp/visual-layout-qa/jungle-arcshot`
- Scene-composite screenshots/layout JSON: `dev_game/.tmp/scene-composite-qa/jungle-arcshot`
