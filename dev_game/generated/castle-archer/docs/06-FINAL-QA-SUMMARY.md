# Castle Archer — Final QA Summary

Date: 2026-07-06

## What changed

- Replaced core gameplay art with Castle Archer-specific high-quality generated raster assets.
- Added 8-frame hero archer animation sheet.
- Added four enemy variants and runtime enemy-type spawning:
  - basic goblin
  - fast runner goblin
  - shield goblin
  - armored orc brute
- Added high-quality UI/option icon set:
  - pause
  - sound on/off
  - settings
  - home
  - retry
  - close
  - heart/life
- Replaced text/button frame art with a glossy blue/gold fantasy button frame.
- Added gameplay polish:
  - frame-based archer idle/aim/shoot/hit animation keys
  - enemy walk animation sheets
  - max concurrent enemy guard
  - top HUD spawn reveal guard
  - pause-mode gameplay object hiding
  - softer damage flash overlay
  - GameOver background art overlay
- Updated asset manifest provenance to per-game `production-demo` imagegen assets.
- Updated factory image QA to handle sprite sheets and role-specific icon/projectile component checks.

## Verification commands

```bash
npm --prefix dev_game/generated/castle-archer run build
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/castle-archer --require-gpt-imagegen
npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/castle-archer
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/castle-archer --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/castle-archer --viewports 390x844,430x932,1080x1920
```

## Final result

| Gate | Result |
|---|---|
| Vite build | PASS |
| factory:qa foundation gate | PASS |
| production-demo-qa | PASS |
| image-quality-qa | PASS — 26 assets at role-aware production-demo bar |
| visual-layout-qa | PASS |
| scene-composite-qa | PASS |
| Browser capture console/page errors | PASS — 0 errors |
| High-wave enemy variety debug | PASS — `basic` + `runner` observed at wave 6 capture |

## Review captures

```text
dev_game/generated/castle-archer/qa-captures/final-review/01-home-390x844.png
dev_game/generated/castle-archer/qa-captures/final-review/02-game-start-390x844.png
dev_game/generated/castle-archer/qa-captures/final-review/03-aiming-390x844.png
dev_game/generated/castle-archer/qa-captures/final-review/04-combat-390x844.png
dev_game/generated/castle-archer/qa-captures/final-review/05-pause-390x844.png
dev_game/generated/castle-archer/qa-captures/final-review/06-gameover-390x844.png
dev_game/generated/castle-archer/qa-captures/final-review/07-high-wave-variety-390x844.png
```

## 2026-07-07 asset polish pass

Parallel review split:

- Static asset audit: identified detached source fragments in `arrow.png`, `goblin-runner-sheet.png`, `runner-goblin.png`, `orc-brute-sheet.png`, `brute-orc.png`, and a left source sliver in `collectible.png`.
- Runtime/layout audit: identified left/right aim reticle clipping risk and enemy-on-battlement overlap before breach cleanup.
- Gate/evidence audit: confirmed image QA previously missed these role-specific artifacts, so fresh progression captures and JSON samples were required.

Fixes applied:

- Isolated the real arrow component and removed the detached top art fragment.
- Removed runner sheet neighbor-frame fragments and runner single-sprite detached shield sliver.
- Removed brute sheet/single-sprite lower magenta strip fragments.
- Removed collectible left source sliver.
- Restored bottom padding on `btn-frame.png`.
- Normalized transparent RGB residue across gameplay sprites, UI icons, and feedback effects.
- Clamped aim guide/reticle to the visible playfield.
- Moved gate breach cleanup earlier so enemies are removed before visibly standing on the baked battlement.
- Clamped burst FX placement away from screen edges to reduce hit/collect effect cropping.

Fresh evidence:

```text
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/before/
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/01-loading-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/02-home-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/03-game-start-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/04-aim-left-clamped-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/05-arrow-visible-up-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/06-asset-variety-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/07-breach-cleared-before-wall-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/08-pause-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/09-gameover-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/asset-metrics.json
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/runtime-samples.json
```

Runtime sample highlights:

- Browser console/page errors: 0.
- Reticle bounds in left-limit aim capture: `x=9..35`, `y=660.1..686.1`, inside 390x844 canvas.
- Arrow visible capture: active `arrow` texture at `x=182..208`, `y=469.4..525.4`, inside canvas.
- Enemy variety capture: visible `enemy_runner`, `enemy_shield`, `enemy_brute` with `enemy_runner_walk`, `enemy_shield_walk`, `enemy_brute_walk` animations.
- Breach-line check: HP `3 -> 2`, test monster inactive and invisible after `WaveGateSystem.update()`.

2026-07-07 verification result:

| Gate | Result |
|---|---|
| Vite build | PASS |
| production-demo-qa | PASS |
| image-quality-qa | PASS — 26 assets |
| visual-layout-qa | PASS — 390x844, 430x932, 1080x1920 |
| scene-composite-qa | PASS — 390x844, 430x932, 1080x1920 |
| Manual progression capture | PASS — 9 screenshots + runtime JSON |

## 2026-07-07 DPR/edge fidelity pass

User-reported symptoms:

- Home screen lower buttons looked clipped.
- Potion and character edges looked dirty compared with cleaner generated games.
- Gameplay assets looked less smooth than expected on mobile-density captures.

Root causes found by parallel review:

- DPR2 browser captures were rendering a 390x844 canvas backing store instead of 780x1688, so every sprite edge was effectively upscaled 2x.
- Several PNGs still had detached low-alpha or tiny alpha components. Examples before cleanup: player max 46 alpha components per frame, collectible 30 components, runner sheet max 31 components.
- The home button layout used a tight vertical display size over a source frame with shallow padding, making the button frame look clipped even when its bounds were technically inside the canvas.

Fixes applied:

- Added DPR-aware physical canvas sizing with logical camera mapping so the 390x844 game renders to 780x1688 on DPR2 while gameplay coordinates remain 390x844.
- Converted pointer aiming back to logical coordinates after DPR scaling.
- Cleaned sprite-sheet frames to a single alpha component per frame and removed tiny detached fragments.
- Rebuilt the healing potion pickup as a clean single-component runtime sprite; decorative sparkle noise stays in FX, not the pickup silhouette.
- Enlarged/repositioned home buttons and normalized sound/settings icon sizes.
- Added edge metrics and before/after crop evidence for home buttons, potion, and player feet.

Fresh evidence:

```text
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/before/01-home-dpr2-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/before/02-game-assets-dpr2-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/after/01-home-dpr2-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/after/02-game-assets-dpr2-390x844.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/after/03-home-dpr2-430x932.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/after/04-home-1080x1920.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/after/05-edge-crops-contact-sheet.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/after/edge-metrics.json
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/after/runtime-samples.json
```

Runtime and edge metrics:

- DPR2 390x844 capture: canvas `780x1688`, CSS `390x844`, ratio `2x`.
- Home buttons: play/sound/settings all inside 390x844 logical canvas; bottom gaps are `249.96`, `163.12`, `163.12`.
- Browser page/console errors: 0. Console warnings were WebGL `ReadPixels` capture warnings only.
- Player: max components per frame `46 -> 1`, tiny components `209 -> 0`.
- Collectible: max components `30 -> 1`, tiny components `22 -> 0`.
- Button frame: max components `4 -> 1`, tiny components `3 -> 0`.

2026-07-07 edge-pass verification result:

| Gate | Result |
|---|---|
| Vite build | PASS |
| image-quality-qa | PASS — 26 assets at role-aware production-demo bar |
| visual-layout-qa | PASS — 390x844, 430x932, 1080x1920 |
| scene-composite-qa | PASS — 390x844, 430x932, 1080x1920 |
| production-demo-qa | PASS |
| Manual DPR2 before/after capture | PASS — screenshots + runtime JSON + edge metrics |

## 2026-07-07 UI clipping and monster resolution pass

User-reported symptoms:

- Home sound icon still looked clipped on the right.
- PLAY button lower edge looked clipped.
- Gameplay pause icon looked clipped.
- Monsters looked lower-resolution than the rest of the scene.

Classification:

| Symptom | Class | Severity | Root cause |
|---|---|---:|---|
| Sound icon right edge clipping | L. Asset Fidelity | 3 | Source alpha bbox was too close to the PNG edge; displayed safety padding was only about 2.66 CSS px. |
| PLAY lower frame clipping | L. Asset Fidelity | 3 | Button frame bottom alpha padding was only about 3.84 CSS px at runtime display size. |
| Gameplay pause icon clipping | L. Asset Fidelity | 3 | Pause source padding and HUD placement were too tight; source had a 1px detached alpha speckle. |
| Monster low-resolution impression | L. Asset Fidelity | 3 | Enemy animation sheets were 256px frames while player frames were 512px and backgrounds were 1080x1920. |

Fixes applied:

- Re-inset `btn-frame.png`, `icon-sound-on.png`, `icon-sound-off.png`, `btn-pause.png`, and `icon-settings.png` to add source alpha safety padding.
- Increased Home PLAY display to `230x82`, moved it slightly upward, and enlarged/centered sound/settings controls to `68x68`.
- Moved gameplay pause icon to `(width - 50, 48)` and displayed it at `64x64` with safer internal padding.
- Removed the 1px detached alpha speckle from `btn-pause.png`.
- Rebuilt runtime enemy sheets from the 512px high-resolution single-sprite sources:
  - `goblin-basic-sheet.png`
  - `goblin-runner-sheet.png`
  - `goblin-shield-sheet.png`
  - `orc-brute-sheet.png`
- Updated `LoadingScene` spritesheet frame sizes from `256x256` to `512x512`.

Fresh evidence:

```text
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/before/
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after/01-home-after-390x844-dpr2.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after/02-game-after-390x844-dpr2.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after/03-pause-after-390x844-dpr2.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after/04-ui-monster-contact-sheet.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after/runtime-samples.json
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after/ui-monster-metrics.json
```

Metric highlights:

- `btn-frame` min displayed source padding: `3.84px -> 9.58px`.
- `icon-sound-on` min displayed source padding: `2.66px -> 7.97px`.
- `btn-pause` min displayed source padding: `3.5px -> 7.5px`; max components `2 -> 1`, tiny components `0`.
- Enemy frame width: `256px -> 512px` for all four runtime enemy sheets.
- Runtime sample: page/console errors `0`; enemies visible with `frameWidth: 512`; pause button bounds `x=308..372`, `y=16..80`.

2026-07-07 UI/monster-pass verification result:

| Gate | Result |
|---|---|
| Vite build | PASS |
| image-quality-qa | PASS — 26 assets at role-aware production-demo bar |
| visual-layout-qa | PASS — 390x844, 430x932, 1080x1920 |
| scene-composite-qa | PASS — 390x844, 430x932, 1080x1920 |
| production-demo-qa | PASS |
| Manual before/after DPR2 capture | PASS — screenshots + runtime JSON + source-padding metrics |

Follow-up correction after user re-check:

- The first UI source-padding pass still did not visibly resolve the clipping impression strongly enough.
- Text buttons now use runtime-generated high-resolution safe button textures instead of stretching `ui_frame`.
- Home sound/settings and gameplay pause buttons now render as frame + symbol containers, so no source PNG edge can clip the icon art.
- Evidence was refreshed under the same 390x844 DPR2 condition:

```text
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after-runtime-safe-ui-v2/01-home-safe-ui-v2-390x844-dpr2.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after-runtime-safe-ui-v2/02-game-safe-ui-v2-390x844-dpr2.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after-runtime-safe-ui-v2/03-pause-safe-ui-v2-390x844-dpr2.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after-runtime-safe-ui-v2/04-safe-ui-v2-contact-sheet.png
dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after-runtime-safe-ui-v2/runtime-samples.json
```

V2 runtime sample highlights:

- PLAY texture: `safe_text_button_230x82`.
- Sound/settings/pause UI type: `Container`.
- Enemy frame widths: `[512, 512, 512, 512]`.
- Browser/page errors: 0.

V2 verification:

| Gate | Result |
|---|---|
| Vite build | PASS |
| image-quality-qa | PASS |
| visual-layout-qa | PASS |
| scene-composite-qa | PASS |
| production-demo-qa | PASS |

## Remaining expansion ideas

- Add true hand-drawn per-enemy death frames.
- Add boss wave after stage 10.
- Add tutorial overlay for first-time aim/release.
- Add per-stage enemy mix table to JSON data for easier balancing.
