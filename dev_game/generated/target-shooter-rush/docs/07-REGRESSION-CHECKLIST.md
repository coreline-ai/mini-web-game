# 07 Regression Checklist - Target Shooter Rush

Re-run these before future polish work.

## TSR-L001 Asset Cutout Padding

- Repro: inspect `player_blaster.png`, `bullseye_target.png`, `hit_burst.png`, `button_pause.png`, and `crosshair.png`.
- Expected: no visible crop-edge contact, no magenta/purple key fringe, transparent RGB residue `0`, and `factory:image-quality-qa` passes.
- Current evidence: `qa-captures/polish-2026-07-07-asset-pass/asset-pass-samples.json`.

## TSR-B001 Active Target Visual Ownership

- Repro: capture Loading, Home, and Game on 430x932 after startup.
- Expected: active target/emblem has a dark plate or glow, static gallery targets remain background-owned, visible runtime `target` sprite count is `1`, and visible runtime `player` sprite count is `0`.
- Current evidence: `01-loading.png`, `02-home.png`, and `03-game-idle.png` in `qa-captures/polish-2026-07-07-asset-pass/`.

## TSR-L002 Edge Hit FX Crop

- Repro: force target to left and right safe margins, tap center, capture the hit-burst frame.
- Expected: `hit_burst.png` is visible, not clipped by viewport edges, and target center satisfies `x >= edgeMargin && x <= 390 - edgeMargin`.
- Current evidence: `05-left-edge-hit-fx.png`, `07-right-edge-hit-fx.png`, and `targetInsideSafeX: true`.

## TSR-C001 Reticle Separation

- Repro: enter Game and sample visible texture keys.
- Expected: gameplay reticle texture is `reticle_ui`; generated `crosshair.png` remains loaded/manifested only as an inactive artifact.
- Current evidence: `activeReticleIsRuntime: true`.

## Verification Commands

```bash
node dev_game/generator/src/cli.mjs --validate-only \
  --spec dev_game/generator/examples/target-shooter-rush.spec.json

npm run build --prefix dev_game/generated/target-shooter-rush

npm --prefix dev_game run factory:image-quality-qa -- \
  --project dev_game/generated/target-shooter-rush

npm --prefix dev_game run factory:visual-layout-qa -- \
  --url http://127.0.0.1:5181 \
  --viewports 390x844,430x932,1080x1920

npm --prefix dev_game run factory:scene-composite-qa -- \
  --url http://127.0.0.1:5181 \
  --viewports 390x844,430x932,1080x1920

npm --prefix dev_game run factory:production-demo-qa -- \
  --project dev_game/generated/target-shooter-rush \
  --require-gpt-imagegen
```
