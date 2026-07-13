# Generated Game Resolution Inventory - 2026-07-10

Scope: `dev_game/generated/*`

Method:

- Initial classification used read-only parallel explorer agents across the generated games.
- The main pass then upgraded or cleaned the outliers and rechecked `src/game/data/game-spec.json`, Phaser config/runtime scale helpers, loader paths, manifests, docs, `sips` pixel dimensions, production gates, and DPR3 browser samples.
- This file records the post-upgrade state.
- 2026-07-13 runtime-delivery recheck: all 10 games kept `1080x1920/fit`; visible-canvas smoke, visual-layout, and scene-composite passed for all 10. Detailed payload results are in [`runtime-delivery-results-2026-07-13.md`](runtime-delivery-results-2026-07-13.md).

## Summary

| Logical canvas from `game-spec.json` | Games | Count |
|---|---|---:|
| `1080x1920` | `bullseye-rush`, `castle-archer`, `jungle-arcshot`, `market-panic`, `meteor-dash`, `parcel-sort-rush`, `road-stream-racer`, `rush-lane-racer`, `sky-archer`, `target-shooter-rush` | 10 |
| `390x844` | none | 0 |

## By Game

| Game | Spec canvas | Runtime canvas/config path | Loaded background or screen asset resolution | Notes |
|---|---:|---|---|---|
| `bullseye-rush` | `1080x1920` | Direct `SPEC.canvas.width/height` | all stage backgrounds `1080x1920` | Native FHD canvas; stage-2 HQ size/edge failures resolved. |
| `castle-archer` | `1080x1920` | `PHYSICAL_WIDTH/HEIGHT`, derived directly from `SPEC.canvas` | all stage backgrounds `1080x1920` | High-resolution logical canvas manifest strategy; manifest max DPR now aligned to `1`. |
| `jungle-arcshot` | `1080x1920` | `PHYSICAL_CANVAS`, derived directly from `SPEC.canvas` with `MAX_TARGET_DPR=1` | `stage-1` `1080x2160`, stage-2/3 `1080x1920` | `scaleMode: fit`; stage-3 HQ size/edge failures resolved. |
| `market-panic` | `1080x1920` | Direct `SPEC.canvas.width/height`; renderer capped at 1x | loaded WebP/PNG backgrounds `1080x1920` | Native FHD canvas with centered `390x844` DOM board strategy. |
| `meteor-dash` | `1080x1920` | `PHYSICAL_CANVAS` equals native canvas with `TARGET_DPR=1` | WebP backgrounds `1170x2532` | DPR multiplication removed; FHD runtime samples passed. |
| `parcel-sort-rush` | `1080x1920` | Direct `SPEC.canvas.width/height` | `warehouse_day/rush/night` all `1080x1920` under `assets/images/production/backgrounds` | Baseline FHD game after verifier/spec cleanup. |
| `road-stream-racer` | `1080x1920` | Direct `SPEC.canvas.width/height` | stage/full overlay assets `1080x1920`; road segments include `1080x640` | Native FHD canvas with documented base-composition reference. |
| `rush-lane-racer` | `1080x1920` | Direct `SPEC.canvas.width/height` | stage backgrounds all `1080x1920` | Native FHD runtime; physics-bounds polish preserved. |
| `sky-archer` | `1080x1920` | `PHYSICAL_CANVAS` equals native canvas with `TARGET_DPR=1` | stage backgrounds all `1080x1920` | DPR multiplication removed; FHD runtime samples passed. |
| `target-shooter-rush` | `1080x1920` | Direct `SPEC.canvas.width/height` | production gallery backgrounds all `1080x1920` | Native FHD conversion complete; target/shooting/UI constants retuned. |

## Current Classification

### Native / High-Resolution Logical Canvas

All generated games now use `1080x1920` as the game coordinate canvas.

Subgroups:

- Direct Phaser size from `SPEC.canvas`: `bullseye-rush`, `market-panic`, `parcel-sort-rush`, `road-stream-racer`, `rush-lane-racer`, `target-shooter-rush`.
- Derived constants but still effectively `1080x1920`: `castle-archer`, `jungle-arcshot`, `meteor-dash`, `sky-archer`.
- Games that keep a `390x844` base-composition reference only for layout scaling or DOM-board mapping: `bullseye-rush`, `market-panic`, `road-stream-racer`, `target-shooter-rush`.

### Former Small Logical Canvas Outliers

The initial inventory found `market-panic`, `meteor-dash`, `sky-archer`, and `target-shooter-rush` at `390x844`. All four have since been converted to native `1080x1920` runtime targets and have current QA evidence under `dev_game/docs/qa-evidence/*-2026-07-10.md`.

## Final Cross-Check

Commands:

```bash
for f in dev_game/generated/*/src/game/data/game-spec.json; do
  node -e "const s=require(process.argv[1]); console.log(process.argv[1], s.canvas.width+'x'+s.canvas.height, s.canvas.scaleMode, s.canvas.maxTargetDpr ?? 'n/a')" "$PWD/$f"
done

rg -n '"canvas"\s*:\s*\{[^}]*"width"\s*:\s*390|"maxTargetDpr"\s*:\s*3|TARGET_DPR\s*=\s*3|resolution\s*:\s*window\.devicePixelRatio|resolution\s*:\s*Math' \
  dev_game/generated/*/src/game/data/game-spec.json \
  dev_game/generated/*/src/game \
  dev_game/generated/*/asset-plan.json \
  dev_game/generated/*/assets/asset-manifest.json
```

Observed result:

- Every generated game reports `1080x1920`, `scaleMode: fit`.
- The final grep returns no remaining generated-game runtime/spec/manifest target for `390` canvas or DPR-3 physical-canvas multiplication.
