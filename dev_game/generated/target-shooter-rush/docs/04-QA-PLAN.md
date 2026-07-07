# 04 QA Plan - Target Shooter Rush

## Foundation Checks
Run `npm --prefix dev_game run factory:qa` from the repository root to verify the generator baseline: schema validation, scaffold smoke, asset/audio integrity, and browser smoke for Foundation.

## Project Build Checks
Inside `dev_game/generated/target-shooter-rush`, run `npm install`, `npm run build`, and a browser preview. Build must pass with the custom shooter files and production image paths.

## Gameplay Smoke
Open Home, press Play, confirm Game scene shows a moving bullseye, tap the target center, verify score increases, combo increases, feedback appears, and a new visible target spawns with `alpha: 1`. Tap inside the gallery but outside the target and verify time decreases and combo resets. Clear 4 hits to reach NIGHT, 6 more to reach RUSH, then 8 more to reach ALL CLEAR. Let time reach 0 separately and confirm GameOver reports ROUND OVER.

## Video And Runtime Assertions
Record Playwright video for Home -> Game -> repeated hits -> stage rewards -> ALL CLEAR. Runtime assertions should prove no visible duplicate `player` image is drawn over the baked cannon, shot graphics disappear after their fade, the reticle texture is `reticle_ui`, target alpha returns to 1 after each respawn, final `cleared: true`, GameOver active after all-clear, and console/page errors are 0.

Final evidence paths:

- `qa-captures/final-video/target-shooter-rush-final-playthrough.webm`
- `qa-captures/final-video/final-playthrough-samples.json`
- `qa-captures/final-gui/contact-sheet.png`

## Production-Demo Gates
Primary aggregate gate:

`npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/target-shooter-rush --require-gpt-imagegen --viewports 390x844,430x932,1080x1920`

Individual gates:

`npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/target-shooter-rush --require-gpt-imagegen`
`npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/target-shooter-rush`
`npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/target-shooter-rush --viewports 390x844,430x932,1080x1920`
`npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/target-shooter-rush --viewports 390x844,430x932,1080x1920`

## Pass Criteria
No console/page errors, no missing runtime images, no shared/root asset references, three raster backgrounds at 1080x1920, imagegen provenance on every image, required layout IDs present in Loading/Home/Game/GameOver plus bounds published for Pause, and no overlapping HUD/buttons in target mobile viewports.
