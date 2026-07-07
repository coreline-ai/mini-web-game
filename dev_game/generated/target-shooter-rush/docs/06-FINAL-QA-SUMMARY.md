# 06 Final QA Summary - Target Shooter Rush

## Scope

This summary records the final production-demo MVP pass after GUI postprocessing,
video verification, target lifecycle fixes, and stage/reward implementation.

## User-Reported Issues Addressed

| Issue | Final Resolution |
|---|---|
| Target appears once, then disappears | Fixed hit tween/respawn race. `MovingTarget.reset()` kills stale tweens and `TargetSystem.consumeHit()` respawns only after the hit animation completes. |
| Two shooting images overlap | Removed the separate runtime `player` image from `GameScene`; final gameplay uses the baked cannon composition plus a small muzzle-flash anchor. |
| External square line around target/playfield | Removed visible playfield rectangle/rail debug-style overlays. The playfield remains as an invisible layout zone for QA. |
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
  --project /Users/iriver/hwan/projects/mini-web-game/dev_game/generated/target-shooter-rush \
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

## Known Notes

- `dev_game/generated/*` is ignored by default. Force-add this generated game or move selected evidence if it must be tracked.
- `player_blaster.png` and `crosshair.png` remain generated assets for manifest completeness, but final active gameplay draws the baked cannon plus muzzle anchor and runtime `reticle_ui`.
- `Spawner.js`, `ScoreManager.js`, and `constants/tuning.js` remain inactive Foundation remnants.
- Current audio is generated Foundation WAV audio and is acceptable for the production-demo MVP; release polish should replace/remaster final SFX/BGM.
