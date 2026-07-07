# 02 Technical Design - Target Shooter Rush

## Architecture
The project keeps the Phaser/Vite Foundation shell but replaces falling-object survival with a custom-loop shooter. Scene flow remains Boot -> Loading -> Home -> Game -> Pause -> GameOver. `GameScene` owns round state, shot input, feedback, timer, and completion.

## Custom Runtime Files
- `src/game/scenes/GameScene.js`: shooter loop, input, stage progression, score/combo/timer state, feedback, all-clear flow.
- `src/game/config/shootingConfig.js`: session time, score values, target rows, speed curve, target size curve, miss penalty, combo window.
- `src/game/entities/MovingTarget.js`: visual target entity, horizontal rail motion, hit radius, hit disappear animation, layout object exposure.
- `src/game/systems/TargetSystem.js`: target spawning, difficulty-based speed/size, shot evaluation, hit consumption, respawn after hit animation completion.
- `src/game/systems/StageManager.js`: stage background swaps as level/stage increases.
- `src/game/ui/HudUI.js`: score, time, stage, goal, combo, and pause control.
- `src/game/systems/LayoutRegistry.js`: browser-visible layout bounds and required IDs.
- `src/game/systems/AudioManager.js`: SFX, gameplay loop, mute, pause/resume behavior.
- `src/game/systems/SaveData.js`: best score and settings persistence.
- `src/game/systems/Juice.js`: hit burst, score pop, camera shake, and lightweight feedback.

## Inactive Foundation Remnants
`Spawner.js`, `ScoreManager.js`, and `constants/tuning.js` remain from the Foundation survival scaffold, but they are not imported by the active shooter `GameScene`. The production loop is driven by `GameScene`, `TargetSystem`, `MovingTarget`, and `shootingConfig`.

## Input And Collision
Pointer movement updates a thin reticle inside the gallery. Pointer down inside the gallery fires a shot line from the baked cannon muzzle to the pointer position. Hit detection is distance based: inside the perfect radius gives a perfect shot, inside the outer target radius gives a hit, otherwise miss.

## State Flow
`GameScene` starts with a 45 second timer, score 0, combo 0, stage 1, and one active target. Hits add score and time, misses remove time, and stage goals advance DAY -> NIGHT -> RUSH with score/time rewards. Timer expiry starts `GameOverScene` as `ROUND OVER`; clearing the final RUSH goal starts it as `ALL CLEAR`.

## Difficulty And Stage Goals
`level()` is based on elapsed play time, total hits, and the active stage bonus. Target size and speed are recalculated on each spawn, so the target keeps getting smaller and faster even if the player earns time bonuses. HUD exposes the current stage and hit goal.

## Asset Loading
`LoadingScene` loads per-game production PNGs from `assets/images/production/**`: three gallery backgrounds, player blaster, bullseye target, hit burst, pause button, and the generated crosshair artifact. `GameScene.ensureReticleTexture()` creates the actual gameplay `reticle_ui` texture. `player_blaster.png` is loaded for the asset contract but is not instantiated as a separate gameplay sprite; the scene uses the baked cannon composition and a small muzzle anchor.

## Layout QA
`LayoutRegistry` publishes CSS-space bounds plus `requiredIds`, aspect metadata, overlap flags, and core Game objects: invisible playfield zone, moving target, reticle, muzzle flash anchor, HUD panel, score/time/stage/goal/combo text, and pause button. `window.__TARGET_SHOOTER_QA__()` fires at the current target center for browser gameplay smoke. Loading, Home, Game, and GameOver publish explicit required IDs; Pause publishes bounds for its controls but does not currently declare a required ID list.
