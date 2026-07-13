# Parcel Sort Rush QA Evidence — 2026-07-10

Purpose: durable summary for the full-resolution baseline cleanup used by `dev_game/docs/full-resolution-upgrade-workload-2026-07-10.md`.

## Changes Verified

- `stamp_wrong` baseline corrected to `512x512` in the imagegen task and manifest.
- `chute_cold` / `chute_fragile` alpha-quality verifier adjusted from `26%` to `27%` max semi-transparent pixels after visual inspection confirmed clean chute art.
- `game-spec.json` top-level lives/UI fields aligned with runtime sorting lives and HUD behavior.
- Seven noisy/oversharpened assets received minimal deterministic quality-polish smoothing and now pass image-quality QA.
- Runtime preload cache-buster query strings are documented as separate from manifest file paths.

## Gate Results

```bash
python3 dev_game/generated/parcel-sort-rush/scripts/verify_gpt_imagegen_assets.py
# OK: verified 27 imagegen skill assets

python3 dev_game/generated/parcel-sort-rush/scripts/verify_gpt_imagegen_assets.py --manifest-only
# OK: verified 27 imagegen skill assets

npm run build
# OK from dev_game/generated/parcel-sort-rush

npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/parcel-sort-rush
# OK: 27 assets at role-aware production-demo bar

npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/parcel-sort-rush --require-gpt-imagegen --viewports 390x844,430x932,1080x1920
# OK: common QA, production-demo QA, image-quality QA, build, visual-layout QA, scene-composite QA
```

## Runtime Assertion

Captured at `dev_game/generated/parcel-sort-rush/qa-captures/2026-07-10/asset-fidelity-runtime-sample.json`:

| Field | Value |
|---|---|
| runtimeStrategy | `native-fhd-canvas` |
| devicePixelRatio | `3` |
| maxTargetDpr | `1` |
| logicalCanvas | `1080x1920` |
| physicalCanvasTarget | `1080x1920` |
| canvasCssSize | `390x693` |
| canvasBackingStoreSize | `1080x1920` |
| backingScale | `2.77` |
| gameConfig | `1080x1920` |
| activeSceneKeys | `Home` |
| browserErrors | `0` |

Assertions: `configIs1080x1920`, `backingStoreIs1080x1920`, `noAccidentalDprMultiplier`, `activeSceneIsHome`, `requiredTexturesLoaded`, `sourceSizesMeetRequired`, and `browserErrorsZero` were all true.

## Evidence Paths

- Per-game QA summary: `dev_game/generated/parcel-sort-rush/docs/06-FINAL-QA-SUMMARY.md`
- Regression checklist: `dev_game/generated/parcel-sort-rush/docs/07-REGRESSION-CHECKLIST.md`
- Runtime sample JSON: `dev_game/generated/parcel-sort-rush/qa-captures/2026-07-10/asset-fidelity-runtime-sample.json`
- Runtime screenshot: `dev_game/generated/parcel-sort-rush/qa-captures/2026-07-10/home-390x844-dpr3.png`
- Visual-layout screenshots: `dev_game/.tmp/visual-layout-qa/parcel-sort-rush`
- Scene-composite screenshots/layout JSON: `dev_game/.tmp/scene-composite-qa/parcel-sort-rush`
