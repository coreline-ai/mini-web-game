# Bullseye Rush QA Evidence — 2026-07-08 Native-FHD Polish

## Scope
- Project: `dev_game/generated/bullseye-rush`
- User symptom: character outer edge looked broken and target icon looked degraded.
- Root cause: 1080×1920 source assets were rendered through a 390×844 Phaser canvas and then enlarged by CSS, causing double scaling blur. The player and target also carried edge-matte residue.

## Applied Fix
- Raised Phaser canvas to 1080×1920 and scaled gameplay/UI values from the old 390×844 composition through `src/game/utils/scale.js`.
- Rebuilt `assets/enemies/target.png` as a 1024×1024 transparent native-FHD target.
- Reprocessed `assets/characters/player.png` as a 2048×512 sheet with alpha-matte cleanup and transparent edge bleed.
- Constrained wide landscape desktop browsers to a centered 9:16 mobile shell.

## Evidence
- Manual captures: `dev_game/generated/bullseye-rush/qa-captures/native-fhd-2026-07-08/`
- 390×844: logical canvas 1080×1920, backing store 1080×1920, player 277×277 from 512×512 frame, target 293.82×293.82 from 1024×1024 source, browser errors 0.
- 1080×1920: CSS canvas 1080×1920 and backing store 1080×1920, no upscaled player or target.
- 1280×900: desktop shell 430×764.44 centered, no full-screen stretch.

## Validation
- `npm run build`: PASS.
- `npm --prefix ../.. run factory:production-demo-qa -- --project generated/bullseye-rush --require-gpt-imagegen`: PASS.
- `npm --prefix ../.. run factory:visual-layout-qa -- --project generated/bullseye-rush --viewports 390x844,430x932,1080x1920,1280x900`: PASS.
- `factory:image-quality-qa` and `factory:scene-composite-qa`: blocked by missing Python `PIL` in the local environment.

## Regression Checks
- Keep `game-spec.json` canvas at 1080×1920 unless all assets and layout are re-authored for a different native target.
- Ensure player and target runtime display sizes never exceed their source frame sizes.
- Re-run 390×844, 1080×1920, and 1280×900 screenshots after asset or CSS changes.

## Bright Blurred Shell Polish
- Added a blurred, brighter `stage-1.png` background layer behind the game and inside the game shell so non-canvas areas no longer appear as flat color.
- Evidence: `dev_game/generated/bullseye-rush/qa-captures/bright-blur-shell-2026-07-08/`
- Assertions: `outsideBlurBackground=true`, `shellBlurBackground=true`, `browserErrors=[]`, `canvasZIndex=1`.
- Additional capture-found fix: increased the aim edge margin so the player sprite is not clipped when aiming at the far right edge. Right-edge sample reports `playerClipPass=true`.
