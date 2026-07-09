# 06 Final QA Summary - Target Shooter Rush

## Scope

This summary records the final production-demo MVP pass after GUI postprocessing,
video verification, target lifecycle fixes, and stage/reward implementation.

## User-Reported Issues Addressed

| Issue | Final Resolution |
|---|---|
| Target appears once, then disappears | Fixed hit tween/respawn race. `MovingTarget.reset()` kills stale tweens and `TargetSystem.consumeHit()` respawns only after the hit animation completes. |
| Two shooting images overlap | Removed the separate runtime `player` image from `GameScene`; final gameplay uses the baked cannon composition plus a small muzzle-flash anchor. |
| External square line around target/playfield | Removed debug-style overlays. The current gameplay focus veil is intentional, subtle, and documented as a playfield readability layer. |
| Crosshair looked like another target | Replaced the generated-art crosshair in active gameplay with runtime `reticle_ui`, a thin cyan/white reticle. |
| Difficulty should get harder | Difficulty now rises from elapsed time, total hits, and stage bonus rather than remaining time. |
| Stage goals and rewards needed | Added DAY, NIGHT, and RUSH hit goals with time/score rewards and final ALL CLEAR. |

## Final Gameplay Contract

- Round timer: 45 seconds.
- Normal hit: `100`.
- Perfect hit: `180`.
- Combo bonus: `18 * (combo - 1)`.
- Hit reward: `+1.2s`, capped at 45 seconds.
- Miss penalty: `-30 score`, `-3s`, combo reset.
- Stage 1 `DAY`: 4 hits, reward `+4s`, `+250`.
- Stage 2 `NIGHT`: 6 hits, reward `+3s`, `+400`.
- Stage 3 `RUSH`: 8 hits, reward `+650`, then `ALL CLEAR`.
- Difficulty formula: `min(maxLevel, 1 + floor(elapsedSeconds / 6) + floor(hits / 5) + stage.levelBonus)`.
- Target size interpolates `92 -> 58`.
- Target speed interpolates `120 -> 310`, plus `stageIndex * 28`.

## Final Evidence Artifacts

| Artifact | Path |
|---|---|
| Playthrough video | `qa-captures/final-video/target-shooter-rush-final-playthrough.webm` |
| Runtime assertion JSON | `qa-captures/final-video/final-playthrough-samples.json` |
| GUI contact sheet | `qa-captures/final-gui/contact-sheet.png` |
| Home capture | `qa-captures/final-gui/01-home.png` |
| Game idle capture | `qa-captures/final-gui/02-game-idle.png` |
| Hit feedback capture | `qa-captures/final-gui/03-hit-feedback.png` |
| Stage 2 capture | `qa-captures/final-gui/04-stage2-night.png` |
| Stage 3 capture | `qa-captures/final-gui/05-stage3-rush.png` |
| All Clear capture | `qa-captures/final-gui/06-all-clear.png` |
| Asset fidelity polish captures | `qa-captures/polish-2026-07-07-asset-pass/` |

## 2026-07-07 Asset Fidelity Polish Pass

| Symptom | Class | Severity | Root Cause | Resolution |
|---|---|---:|---|---|
| `player_blaster.png` looked cut off at the bottom | L Asset Fidelity | 3 | Production file had alpha bbox touching the lower edge from an older background-derived crop path. | Rebuilt from `assets/imagegen/raw/sprites/player_blaster.png`, removed key-color edge residue, normalized near-transparent pixels, and restored 53px minimum alpha padding. |
| Purple/magenta fringe and tiny detached pixels remained on cutout assets | L Asset Fidelity | 3 | Chroma-key removal left edge residue and low-alpha colored pixels. | Cleaned `player_blaster`, `bullseye_target`, `hit_burst`, `button_pause`, and `crosshair`; transparent RGB residue is now `0` on all five PNGs. |
| Moving target could be confused with target art baked into the gallery background | B Visual Singularity / C UI-Gameplay separation | 3 | Backgrounds intentionally contain static decorative targets, while gameplay draws the same bullseye asset as the active entity. | Added loading/home/game target backplates, a subtle gameplay focus veil, and stronger active-target glow so the runtime target has a distinct visual owner. |
| Hit burst could clip when a target is hit near the left/right edge | L Asset Fidelity / C transient FX | 3 | Target center margin was smaller than the peak hit-burst radius. | Added `targetEdgeMargin`/`hitBurstPeakRadius`, clamped burst spawn points, and captured left/right edge hit FX. |
| `crosshair.png` was loaded and documented but missing from the manifest | F Evidence / asset manifest drift | 4 | Runtime switched to `reticle_ui`, leaving the retained generated artifact out of `asset-manifest.json`. | Added `crosshair-artifact` manifest entry with `runtimeActive: false`; active gameplay still asserts `reticle_ui`. |

Asset metrics after cleanup:

- `player_blaster.png`: 512x512, bbox `[68,53,444,459]`, min padding `53`, transparent RGB `0`.
- `bullseye_target.png`: 512x512, bbox `[44,67,446,463]`, min padding `44`, transparent RGB `0`.
- `hit_burst.png`: 256x256, bbox `[54,23,230,189]`, min padding `23`, transparent RGB `0`.
- `button_pause.png`: 256x256, bbox `[25,23,189,193]`, min padding `23`, transparent RGB `0`.
- `crosshair.png`: 256x256, bbox `[23,48,208,228]`, min padding `23`, transparent RGB `0`.

New evidence:

- Loading/Home/Game/edge-hit screenshots: `qa-captures/polish-2026-07-07-asset-pass/01-loading.png` through `07-right-edge-hit-fx.png`.
- Runtime sample JSON: `qa-captures/polish-2026-07-07-asset-pass/asset-pass-samples.json`.
- Runtime assertions: `browserErrors: 0`, `duplicateVisibleEntities: 0`, `activeReticleIsRuntime: true`, `playerSpriteNotDuplicatedOverBakedCannon: true`, `targetTextureVisibleCount: 1`, `targetInsideSafeX: true`.

## Runtime Assertion Results

From `qa-captures/final-video/final-playthrough-samples.json`:

- Browser console/page errors: `0`.
- Visible duplicate `player` images: `0`.
- Lingering shot graphics after fade: `0`.
- Gameplay reticle texture: `reticle_ui`.
- Stage 2 reached at hit 4.
- Stage 3 reached at hit 10.
- `ALL CLEAR` reached after 18 total hits.
- Final score sample: `7294`.
- Final hits/shots: `18/18`.
- Final scene: `GameOver`.
- Final `cleared`: `true`.

## Commands Verified

```bash
node dev_game/generator/src/cli.mjs --validate-only \
  --spec dev_game/generator/examples/target-shooter-rush.spec.json

cd dev_game/generated/target-shooter-rush
npm run build

npm --prefix dev_game run factory:production-gate -- \
  --project dev_game/generated/target-shooter-rush \
  --require-gpt-imagegen \
  --viewports 390x844,430x932,1080x1920
```

Observed results:

- `Spec OK: target-shooter-rush`.
- `npm run build` passed.
- `Production demo QA OK`.
- `Image quality QA OK`.
- `Visual layout QA OK`.
- `Scene composite QA OK`.
- `scene-composite pixel inspection OK`.

Additional asset-polish commands verified on 2026-07-07:

```bash
npm --prefix dev_game run factory:image-quality-qa -- \
  --project dev_game/generated/target-shooter-rush

npm --prefix dev_game run factory:visual-layout-qa -- \
  --url http://127.0.0.1:5181 \
  --viewports 390x844,430x932,1080x1920

npm --prefix dev_game run factory:scene-composite-qa -- \
  --url http://127.0.0.1:5181 \
  --viewports 390x844,430x932,1080x1920

npm --prefix dev_game run factory:production-demo-qa -- \
  --project dev_game/generated/target-shooter-rush \
  --require-gpt-imagegen
```

## Known Notes

- `dev_game/generated/*` is ignored by default. Force-add this generated game or move selected evidence if it must be tracked.
- `player_blaster.png` and `crosshair.png` remain generated assets for manifest completeness, but final active gameplay draws the baked cannon plus muzzle anchor and runtime `reticle_ui`.
- The gallery backgrounds still contain decorative baked targets; loading/home/game now add active-target plates/veil/glow so the runtime target is visually separated from static background art.
- `Spawner.js`, `ScoreManager.js`, and `constants/tuning.js` remain inactive Foundation remnants.
- Current audio is generated Foundation WAV audio and is acceptable for the production-demo MVP; release polish should replace/remaster final SFX/BGM.
