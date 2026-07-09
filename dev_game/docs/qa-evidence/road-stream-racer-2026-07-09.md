# Road Stream Racer QA Evidence — 2026-07-09

## Tree-Skin Roadside Refinement

Scope:
- Rechecked the active game screen after the user requested high-quality tree assets on both sides of the current road shape.
- Rebuilt `forest-side-overlay-1080x1920.png` as a vegetation-only side-gutter matte from the imagegen stage art.
- Kept the straight-road architecture: `road_flat_loop` scrolls, `forest_side_overlay` stays as a static `1080x1920` roadside layer.
- Adjusted asphalt and HUD tones only enough to avoid scene-composite false positives while preserving road readability.

Evidence:
- Before: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-tree-skin/before/`
- Contact sheet: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-tree-skin/tree-skin-source-contact.png`
- After Home: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-tree-skin/after-final-5/mobile390-home-after.png`
- After Game: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-tree-skin/after-final-5/mobile390-game-after.png`
- After FHD Game: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-tree-skin/after-final-5/fullhd-game-after.png`
- Latest scene composite captures: `dev_game/.tmp/scene-composite-qa/road-stream-racer/`
- Latest visual layout captures: `dev_game/.tmp/visual-layout-qa/road-stream-racer/`

Final sample highlights:
- Forest overlay is `1080x1920` and rendered at `1080x1920`.
- Tree skin stays in the left/right roadside gutters without center-road or yellow-line contamination.
- Home and Game captures show the current straight-road shape with high-quality roadside vegetation on both sides.
- The cool-saturated asphalt and brighter HUD header pass scene-composite inspection.

Final gates:
- `npm run build`: pass.
- `factory:image-quality-qa`: pass, 17 role-aware assets.
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: pass.
- `factory:production-demo-qa`: pass.

## Top-Right HUD Icon HQ Replacement

Scope:
- Replaced the gameplay top-right Home and Pause HUD icons with high-quality imagegen-based source assets.
- Root cause: the previous runtime icons were large as files, but the semantic symbols were too small after being rendered at HUD size.
- Generated new source PNGs, removed chroma-key background, normalized to `1024x1024` transparent runtime assets, and increased runtime display size to `90x90`.
- Added the actual runtime HUD icons to `asset-manifest.json` so image-quality QA now covers them.

Evidence:
- Before mobile: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-top-icons/before/mobile390-game-before.png`
- Before FHD: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-top-icons/before/fullhd-game-before.png`
- Contact sheet: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-top-icons/icon-contact-sheet.png`
- After mobile: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-top-icons/after-final/mobile390-game-after.png`
- After FHD: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-top-icons/after-final/fullhd-game-after.png`
- After sample: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-top-icons/after-final/after-sample.json`

Final result:
- `racer_ui_home.png`: `1024x1024`, rendered `90x90`, source is not upscaled.
- `racer_ui_pause.png`: `1024x1024`, rendered `90x90`, source is not upscaled.
- Home/Pause symbols are visibly larger and clearer in the mobile gameplay capture.
- No right-edge clipping or top HUD overlap was detected.

Final gates:
- `npm run build`: pass.
- `factory:image-quality-qa`: pass, 19 role-aware assets.
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: pass.
- `factory:production-demo-qa`: pass.

## Top-Right HUD Icon Clean Readability

Scope:
- Reworked the two top-right HUD icons again after the user reported that the previous HQ version was still not obvious enough during gameplay.
- Root cause: the previous replacement had high pixel quality but too much decorative detail, so the Home/Pause meaning did not read instantly at HUD size.
- Generated cleaner imagegen source icons with minimal dark buttons and oversized white symbols.
- Increased runtime display size to `96x96`, then shifted both buttons left to keep the pause icon inside mobile safe area.

Evidence:
- Before mobile: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-clean-icons/before/mobile390-game-before.png`
- Before FHD: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-clean-icons/before/fullhd-game-before.png`
- Contact sheet: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-clean-icons/icon-contact-sheet.png`
- After mobile: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-clean-icons/after-final/mobile390-game-after.png`
- After FHD: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-clean-icons/after-final/fullhd-game-after.png`
- After sample: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-clean-icons/after-final/after-sample.json`

Final result:
- Home icon is now a large house silhouette.
- Pause icon is now two large vertical bars.
- Both icons are more visible during active driving and pass mobile safe-area checks.

Final gates:
- `npm run build`: pass.
- `factory:image-quality-qa`: pass, 19 role-aware assets.
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: pass.
- `factory:production-demo-qa`: pass.

## Top HUD Layout Reflow

Scope:
- Reproduced the user's report that the top gameplay text/info area looked wrong.
- Baseline capture showed the long translucent HUD panel crossing lane marks and traffic, with score and Home/Pause controls anchored to different visual regions.
- Replaced the top HUD with one compact stat strip inside the active road width.
- Kept Home/Pause as smaller independent icon buttons aligned to the same top row.

Evidence:
- Before mobile: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-top-hud/before/mobile390-game-before.png`
- Before FHD: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-top-hud/before/fullhd-game-before.png`
- After mobile: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-top-hud/after-final/mobile390-game-after.png`
- After FHD: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-top-hud/after-final/fullhd-game-after.png`
- After sample: `dev_game/generated/road-stream-racer/qa-captures/polish-20260709-top-hud/after-final/after-sample.json`

Final result:
- Score, coin, speed, and stage are aligned in one readable top strip.
- The strip is constrained to the current road width instead of spanning the full upper road.
- Home/Pause icons are fully visible and no longer collide with the stat text.

Final gates:
- `npm run build`: pass.
- `factory:image-quality-qa`: pass, 17 role-aware assets.
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: pass.
- `factory:production-demo-qa`: pass.
