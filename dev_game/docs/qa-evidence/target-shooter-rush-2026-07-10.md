# QA Evidence - target-shooter-rush (2026-07-10)

Native FHD canvas conversion and runtime verification pass.

## Changes

- Converted `game-spec.json` and `asset-plan.json` from `390x844` to `1080x1920`, `scaleMode: fit`, `maxTargetDpr: 1`.
- Added FHD scale helpers in `constants/tuning.js` and retuned shooting config, gallery bounds, target sizes/speeds, muzzle, reticle, HUD, buttons, feedback positions, shot line width, hit-burst clamps, and fallback spawner dimensions.
- Centralized runtime image, background, and audio preload paths in `constants/gameKeys.js`.
- Removed `crosshair.png` from the production preload path; active gameplay uses runtime-generated `reticle_ui`, while the PNG remains only an inactive reference artifact.
- Rebuilt `assets/images/production/targets/bullseye_target.png` from the imagegen raw sprite; final metrics: `512x512`, `13117` colors, `1825.5` edge variance, alpha padding `32/37/32/38`, no measured low-alpha magenta key residue.
- Added `window.__TARGET_SHOOTER_DEBUG__.get()` for browser runtime assertions.

## Evidence Artifacts

| Artifact | Path |
|---|---|
| Runtime sample | `qa-captures/full-resolution-2026-07-10/target-shooter-rush/asset-fidelity-runtime-sample.json` |
| Gameplay sample | `qa-captures/full-resolution-2026-07-10/target-shooter-rush/gameplay-runtime-sample.json` |
| Home screenshot | `qa-captures/full-resolution-2026-07-10/target-shooter-rush/home-390x844-dpr3.png` |
| Game screenshot | `qa-captures/full-resolution-2026-07-10/target-shooter-rush/game-390x844-dpr3.png` |

## Runtime Assertions

- DPR sample: `3`.
- `game.config`: `1080x1920`.
- `scale.gameSize`: `1080x1920`.
- Canvas backing store: `1080x1920`, not `3240x5760`.
- Canvas CSS rect on `390x844@DPR3`: `390x693.328125`, centered vertically by `Scale.FIT`.
- Required textures loaded: `player`, `target`, `hit_burst`, `ui_pause`, `bg_0`, `bg_1`, `bg_2`.
- `crosshairArtifactLoaded`: `false`.
- Stale SVG requests: `0`.
- Stale `assets/backgrounds/stage-*` requests: `0`.
- Browser errors: `0`.
- `reticle_ui` source: `218x218`.
- QA shot result: shots `0 -> 1`, hits `0 -> 1`, score `0 -> 180`.

## Gates

```bash
npm --prefix dev_game/generated/target-shooter-rush run build

npm --prefix dev_game run factory:image-quality-qa -- \
  --project dev_game/generated/target-shooter-rush

npm --prefix dev_game run factory:production-gate -- \
  --project dev_game/generated/target-shooter-rush \
  --require-gpt-imagegen \
  --viewports 390x844,430x932,1080x1920,1280x900
```

Observed results:

- `npm run build` passed.
- `Image quality QA OK` with `7` assets at the role-aware production-demo bar.
- `Production demo QA OK`.
- `Visual layout QA OK`.
- `Scene composite QA OK`.
- `scene-composite pixel inspection OK`.
