# QA Evidence - target-shooter-rush (2026-07-07)

Asset-fidelity polish pass for the existing Target Shooter Rush production demo.

- Parallel review found three actionable issues: `player_blaster.png` bottom crop/key fringe, target/FX/UI chroma residue, and runtime ambiguity between baked gallery targets and the active moving target.
- Fixed cutout assets: player min alpha padding `53px`, target min padding `44px`, hit burst min padding `23px`, pause min padding `23px`, crosshair min padding `23px`; transparent RGB residue is `0` for all five transparent PNGs.
- Added `crosshair-artifact` to `assets/asset-manifest.json` with `runtimeActive: false`; active gameplay still uses runtime `reticle_ui`.
- Added loading/home/game active-target plates, a subtle gameplay focus veil, target safe edge margin, and clamped `hit_burst` spawn positions.
- Evidence: `dev_game/generated/target-shooter-rush/qa-captures/polish-2026-07-07-asset-pass/` with Loading/Home/Game/left-edge/right-edge hit captures and `asset-pass-samples.json`.
- Runtime assertions: browser errors `0`, duplicate visible entities `0`, active reticle is runtime `reticle_ui`, visible target sprite count `1`, visible player sprite count `0`, target safe-X assertion `true`.
- Gates OK: spec validate, `npm run build`, `factory:image-quality-qa`, `factory:visual-layout-qa` at `390x844,430x932,1080x1920`, `factory:scene-composite-qa` at the same viewports, and `factory:production-demo-qa --require-gpt-imagegen`.
