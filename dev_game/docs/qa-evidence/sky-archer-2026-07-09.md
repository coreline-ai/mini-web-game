# Sky Archer QA Evidence — 2026-07-09 Asset Edge Polish

## Scope
- Project: `dev_game/generated/sky-archer`
- User symptom: assets exceeded the intended mobile resolution envelope and outer edges looked broken/jagged.
- Root causes: transparent alpha touched crop edges, several runtime PNGs exceeded sprite/effect budgets, and the DPR 3 capture was using a 1x canvas backing store.

## Applied Fix
- Remastered transparent assets with alpha cleanup, antialias smoothing, safe padding, and role-appropriate runtime dimensions.
- Replaced the player PNG sheet with `assets/characters/player.webp` and updated all manifest, plan, docs, and loader references.
- Added `src/game/systems/HiDpi.js` and a logical-camera render path so the game stays authored at `390x844` while DPR 3 renders to `1170x2532`.
- Updated `LayoutRegistry` and gameplay pointer mapping to use logical coordinates with the HiDPI render path.

## Evidence
- Before contact sheet: `dev_game/generated/sky-archer/qa-captures/asset-contact-before.png`
- After contact sheet: `dev_game/generated/sky-archer/qa-captures/asset-contact-after.png`
- Remaster report: `dev_game/generated/sky-archer/qa-captures/asset-remaster-report.json`
- Final metrics: `dev_game/generated/sky-archer/qa-captures/asset-final-metrics.json`
- Home DPR 3 capture: `dev_game/generated/sky-archer/qa-captures/sky-archer-after-home-390x844-dpr3.png`
- Game DPR 3 capture: `dev_game/generated/sky-archer/qa-captures/sky-archer-after-game-390x844-dpr3.png`
- Runtime sample: `dev_game/generated/sky-archer/qa-captures/sky-archer-after-sample.json`
- Visual layout screenshots: `dev_game/.tmp/visual-layout-qa/sky-archer/`
- Scene composite screenshots: `dev_game/.tmp/scene-composite-qa/sky-archer/`

## Final Runtime Sample
- `devicePixelRatio`: `3`
- CSS canvas: `390x844`
- backing store: `1170x2532`
- Phaser game/base size: `1170x2532`
- Phaser display size: `390x844`
- Active scene: `Game`
- Browser fatal errors: none; only WebGL `ReadPixels` warnings caused by screenshot capture.

## Final Gates
- `npm run build`: PASS.
- `npm --prefix dev_game run factory:asset-qa -- --project generated/sky-archer`: PASS.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/sky-archer`: PASS, 11 role-aware assets.
- `npm --prefix dev_game run factory:hq-screen-quality-qa -- --project generated/sky-archer`: PASS.
- `npm --prefix dev_game run factory:production-demo-qa -- --project generated/sky-archer --require-gpt-imagegen`: PASS.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project generated/sky-archer`: PASS.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project generated/sky-archer`: PASS.

## Regression Checks
- Keep logical coordinate math at `390x844` unless all layout/gameplay constants are re-authored.
- Keep DPR 3 backing store at `1170x2532` for mobile screenshots.
- Re-run asset, image-quality, visual-layout, scene-composite, and production-demo gates after changing transparent art or canvas configuration.

## Button Resolution Polish

Scope:
- Rebuilt and replaced Sky Archer button assets to match the current DPR 3 render target without non-uniform runtime stretching.
- Target screens: Home, Game HUD, Pause, GameOver.

Applied fix:
- `btn-frame.png`: `1320x384`, used for `220x64` PLAY-style buttons.
- `btn-frame-slim.png`: `1320x312`, used for `220x52` SOUND-style buttons.
- `btn-frame-dialog.png`: `1380x372`, used for `230x62` dialog buttons.
- `btn-pause.png`: `768x768`, used for `56x56` gameplay pause icon.
- `MobileButton` now selects the exact source texture per logical button size.
- `LoadingScene`, `asset-manifest.json`, and `asset-plan.json` were updated for the new UI assets.

Evidence:
- Before: `dev_game/generated/sky-archer/qa-captures/button-polish-20260709/before/`
- After: `dev_game/generated/sky-archer/qa-captures/button-polish-20260709/after/`
- Source contact sheet: `dev_game/generated/sky-archer/qa-captures/button-polish-20260709/button-source-contact-after.png`
- Final full contact sheet: `dev_game/generated/sky-archer/qa-captures/asset-contact-after.png`
- Final metrics: `dev_game/generated/sky-archer/qa-captures/asset-final-metrics.json`

Final sample highlights:
- `PLAY`: `1320x384` → `220x64`, scale `0.1667/0.1667`.
- `SOUND`: `1320x312` → `220x52`, scale `0.1667/0.1667`.
- `RESUME/HOME/RETRY`: `1380x372` → `230x62`, scale `0.1667/0.1667`.
- `Pause`: `768x768` → `56x56`, scale `0.0729/0.0729`.
- Browser errors: `[]` in the button capture samples.

Final gates:
- `npm run build`: PASS.
- `factory:asset-qa`: PASS.
- `factory:image-quality-qa`: PASS, 13 role-aware assets.
- `factory:hq-screen-quality-qa`: PASS.
- `factory:production-demo-qa --require-gpt-imagegen`: PASS.
- `factory:visual-layout-qa`: PASS.
- `factory:scene-composite-qa`: PASS after one transient missing-screenshot rerun.
