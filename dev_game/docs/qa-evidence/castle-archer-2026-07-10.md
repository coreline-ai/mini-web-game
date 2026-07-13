# Castle Archer QA Evidence — 2026-07-10

Purpose: durable summary for the full-resolution loader, manifest, and stale-runtime cleanup from `dev_game/docs/full-resolution-upgrade-workload-2026-07-10.md`.

## Changes Verified

- Centralized runtime spritesheet/image/audio preload paths in `src/game/constants/gameKeys.js`.
- Changed `LoadingScene` to preload the centralized runtime asset list.
- Removed `GameScene.preload()` late loading for `arrow`; gameplay now depends on the same preload contract as other assets.
- Replaced hard-coded runtime texture strings for arrow, backgrounds, UI heart/pause, and FX with `ASSET_KEYS`.
- Removed SVG from manifest allowed runtime image formats.
- Updated asset/docs notes so `assets/images/*.svg` are documented as non-runtime scaffold leftovers.

## Gate Results

```bash
npm run build
# OK from dev_game/generated/castle-archer

npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/castle-archer
# OK: 26 assets at role-aware production-demo bar

npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/castle-archer --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900
# OK: common QA, production-demo QA, image-quality QA, build, visual-layout QA, scene-composite QA
```

## Runtime Assertion

Captured at `dev_game/generated/castle-archer/qa-captures/full-resolution-2026-07-10/asset-fidelity-runtime-sample.json`:

| Field | Value |
|---|---|
| devicePixelRatio | `2` |
| canvasBackingStoreSize | `1080x1920` |
| canvasCssSize | `390x693.328125` |
| gameSize | `1080x1920` |
| displaySize | `1080x1920` |
| activeScene | `Home` |
| requiredTexturesMissing | `[]` |
| staleTextureKeys | `[]` |
| svgResources | `[]` |
| browserErrors | `0` |

Assertions: `homeScene`, `highResolutionCanvas`, `noTripleScaledBacking`, `allRequiredTexturesLoaded`, `noStaleTextureKeys`, `noSvgResources`, and `noBrowserErrors` were all true. Capture-time WebGL `ReadPixels` performance warnings were recorded separately as browser warnings and were not page errors.

## Evidence Paths

- Per-game QA summary: `dev_game/generated/castle-archer/docs/06-FINAL-QA-SUMMARY.md`
- Regression checklist: `dev_game/generated/castle-archer/docs/07-REGRESSION-CHECKLIST.md`
- Runtime sample JSON: `dev_game/generated/castle-archer/qa-captures/full-resolution-2026-07-10/asset-fidelity-runtime-sample.json`
- Runtime screenshot: `dev_game/generated/castle-archer/qa-captures/full-resolution-2026-07-10/home-390x844-dpr2.png`
- Visual-layout screenshots: `dev_game/.tmp/visual-layout-qa/castle-archer`
- Scene-composite screenshots/layout JSON: `dev_game/.tmp/scene-composite-qa/castle-archer`
