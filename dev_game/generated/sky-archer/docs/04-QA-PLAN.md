# 04 · QA Plan — Sky Archer

## Automated gates
- `factory:smoke` — structure, required files, no circular imports.
- `factory:asset-qa` — manifest, image/audio integrity, black-box/solid/ratio checks.
- `factory:browser-smoke` — build + headless boot + PLAY entry, 0 console/page errors.
- `factory:production-demo-qa` — planning docs, ≥3 raster stage backgrounds, core-asset
  quality, layout registry, qualityTier.
- `factory:visual-layout-qa` — 390×844 / 430×932 / 1080×1920: canvas centering, HUD
  overlap, safe-area (no clipped or overlapping UI).
- `factory:production-gate` — all of the above.

## Manual pass
Home → Play → dodge → collect → pause/resume → hit → GameOver → retry, on a phone viewport.

## Acceptance
No overlap, no clipped HUD, ≥3 distinct stage backgrounds, real art (not placeholders),
audio present, 60fps, best-score persists.
