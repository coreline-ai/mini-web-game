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
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/castle-archer --require-gpt-imagegen --viewports 390x844,430x932,1080x1920
node output/capture_castle_archer.mjs
node output/capture_castle_variety.mjs
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

## Remaining expansion ideas

- Add true hand-drawn per-enemy death frames.
- Add boss wave after stage 10.
- Add tutorial overlay for first-time aim/release.
- Add per-stage enemy mix table to JSON data for easier balancing.
