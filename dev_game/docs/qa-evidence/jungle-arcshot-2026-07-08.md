# QA Evidence — jungle-arcshot (2026-07-08)

## Class L native 1080 canvas polish

User symptom:

- `390×844` logical canvas downsample/upscale path makes the final screen blurry.
- Player outer edge and target icons look broken or low resolution.

Fix summary:

- Phaser base canvas changed from `390×844` + DPR2 camera zoom to native `1080×1920`, `scaleMode: cover`, camera zoom `1`.
- Existing `390×844` play composition is mapped into the centered crop-safe area of the 1080 world with `SCALE_Y` and `worldX()`.
- HUD, Home/Pause/GameOver UI, loading UI, round target layout, projectile display size, gravity, launch speed, wind, drift, and input guard regions were scaled for the new world.
- Runtime assets were rightsized for the native canvas and image-quality gates: player sheet `2944×736` (`736×736` frames), fruit `768×768`, balloon `512×768`, arrow `512×1024`, pause icon `512×512`.
- `asset-plan.json` and `assets/asset-manifest.json` now declare `native-1080x1920-phaser-canvas-with-browser-supersampling`.

Evidence:

- Before: `dev_game/generated/jungle-arcshot/qa-captures/polish-2026-07-08-1080-canvas/before/`
- After: `dev_game/generated/jungle-arcshot/qa-captures/polish-2026-07-08-1080-canvas/after/`
- Contact sheet: `dev_game/generated/jungle-arcshot/qa-captures/polish-2026-07-08-1080-canvas/contact-sheet.html`
- After sample asserts: browser errors `0`, canvas backing `1080×1920`, config `1080×1920`, camera zoom `1`, layout out-of-viewport items `0`, `assetFidelityPass: true`.
- Rendered/source proof: Home player `296×296 <= 736×736`; Game player `227×227 <= 736×736`; fruit `132×132 <= 768×768`; pause icon `127×127 <= 512×512`.

Gate results:

- `npm run build`: PASS
- `factory:production-demo-qa --require-gpt-imagegen`: PASS
- `factory:image-quality-qa`: PASS (`15 assets at role-aware production-demo bar`)
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920`: PASS
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: PASS
- `factory:production-gate --require-gpt-imagegen --viewports 390x844,430x932,1080x1920`: PASS

## Desktop mobile-shell containment

Follow-up symptom:

- Desktop browser showed the game as a full-window surface instead of a mobile game screen.

Fix summary:

- `src/styles/mobile.css` now keeps portrait/mobile viewports full width, but caps wide desktop viewports to a centered mobile shell using `@media (min-aspect-ratio: 1/1)`.

Evidence:

- Before: `dev_game/generated/jungle-arcshot/qa-captures/polish-2026-07-08-mobile-shell/before/desktop-1280x900-before.png`
- After: `dev_game/generated/jungle-arcshot/qa-captures/polish-2026-07-08-mobile-shell/after/desktop-1280x900-after.png`
- Sample: `desktop 1280×900` now has `#game = 430×900`, centered; `mobile 390×844` remains `#game = 390×844`; browser errors `0`.
- Gate: `factory:visual-layout-qa --viewports 390x844,430x932,1280x900`: PASS
