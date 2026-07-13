# 07 · Regression Checklist — Meteor Dash

- [ ] Backgrounds fill the full portrait viewport without stretching or letterboxing.
- [ ] Player frames animate without frame-edge clipping or magenta/green fringe.
- [ ] Meteor, star, shield, and FX remain readable at gameplay size.
- [ ] PLAY/SOUND/RESUME/HOME/RETRY buttons use the closest matching high-resolution frame.
- [ ] Pause icon is crisp at native FHD HUD size on high-DPI displays.
- [ ] Touch input maps to native logical canvas coordinates with camera zoom 1.
- [ ] Production-demo, image-quality, layout, and composite QA all pass.

## 2026-07-10 Native FHD Runtime Checks

- [ ] `game-spec.json` canvas stays at 1080×1920 with `scaleMode: fit` and `maxTargetDpr: 1`.
- [ ] DPR3 mobile runtime sample uses a 1080×1920 canvas backing store, not 3240×5760.
- [ ] LoadingScene preloads sprites, UI, FX, backgrounds, and audio from `gameKeys.js` path maps.
- [ ] Browser resource sample has no runtime `/assets/images/*.svg` requests and no stale SVG/placeholder texture keys.
- [ ] Mobile viewport samples keep the canvas inside the viewport and preserve playable touch bounds.

2026-07-10 evidence: build, image-quality QA, production gate, and DPR3 runtime sample all passed; see `dev_game/docs/qa-evidence/meteor-dash-2026-07-10.md`.

## Runtime Delivery Regression — 2026-07-13

- [x] Runtime image paths stay below `assets/images/production/**` and match all loader paths.
- [x] The canonical helper, `publicDir: false`, explicit delivery metadata, and 3 MiB budget remain enabled together.
- [x] Source-only SVG/README files are absent from dist; runtime manifest SHA-256 values match source files.
- [x] Build, dist-runtime, asset, image, HQ, production-demo, browser smoke, and visual-layout gates pass.
