# 04 · QA Plan — Road Stream Racer

## Automated gates
- `factory:smoke` — structure, required files, no circular imports.
- `factory:asset-qa` — manifest, image/audio integrity, black-box/solid/ratio checks.
- `factory:browser-smoke` — build + headless boot + PLAY entry, 0 console/page errors.
- `factory:production-demo-qa` — planning docs, ≥3 raster stage backgrounds, core-asset
  quality, layout registry, qualityTier.
- `factory:visual-layout-qa` — 390×844 / 430×932 / 1080×1920 / 1280×900: canvas
  centering, desktop mobile shell, HUD overlap, safe-area, icon aspect.
- `factory:scene-composite-qa` — rendered screenshots for tooltip-overlay false positives,
  button slicing, and result-screen composition.
- `factory:production-gate` — all of the above, including image-quality QA.

## Manual pass
Loading → Home → Countdown → Game → Boost → Pause → Crash → GameOver/Restart, on a
phone viewport and the 1280×900 desktop shell.

## Acceptance
No overlap, no clipped HUD/icons, road segments visibly recycle, player remains in the
lower play zone, traffic/items flow toward the player, ≥3 distinct stage backgrounds,
real PNG art, audio present, 60fps target, best-score persists.
