# 01 GDD - Target Shooter Rush

## Pitch
`Target Shooter Rush` is a one-thumb mobile shooting-gallery game. Bullseye targets sweep left and right across several rails, and the player taps the screen to fire a laser shot at the moving target before the round timer expires.

## Core Loop
The 45-second loop is: watch the active target lane, tap the target center, earn score and combo, get a small time bonus, then immediately track the next target at a faster speed or smaller size. Missing costs time and resets combo, so the fun comes from timing, prediction, and risk under pressure.

## Controls
Tap anywhere inside the gallery to fire. Drag or move the finger before tapping to preview the reticle. The game is designed for a portrait phone viewport and one-hand play.

## Scoring
Normal hit: 100 points. Perfect center hit: 180 points. Consecutive hits inside the combo window add `18 * (combo - 1)` bonus points and increase the best-combo stat. Hits add `+1.2s` up to the 45-second cap. Misses subtract 30 points, remove 3 seconds, and reset combo. The result screen tracks score, hits, shots, accuracy, perfects, and best combo.

## Stages And Rewards
The run has three stage goals. Stage 1 `DAY` clears after 4 hits and rewards +4 seconds and +250 score. Stage 2 `NIGHT` clears after 6 more hits and rewards +3 seconds and +400 score. Stage 3 `RUSH` clears after 8 more hits and rewards +650 score, then ends the round as `ALL CLEAR`.

## Difficulty
Difficulty is monotonic inside a run. It rises from elapsed play time, total hits, and the active stage bonus rather than from remaining time, so hit time bonuses cannot stall the challenge. Runtime level is `min(maxLevel, 1 + floor(elapsedSeconds / 6) + floor(hits / 5) + stage.levelBonus)`. Target size interpolates from 92 to 58, target speed interpolates from 120 to 310, and each stage adds `stageIndex * 28` speed. Higher stages use faster, smaller targets and the final rush stage demands quick tracking.

## Fail And Retry
The player loses when the round timer reaches 0 before all stage goals are cleared. Clearing all three stage goals routes to the result scene as `ALL CLEAR`. GameOver shows score, hits, shots, accuracy, best combo, and stage result. Retry returns immediately to a new shooting round.

## Production-Demo Content
The MVP includes Loading, Home, Game, Pause, and GameOver scenes; custom target movement and shot evaluation; generated shooting gallery backgrounds; generated blaster, target, hit burst, and pause button assets; a runtime-generated thin reticle; a small muzzle-flash anchor instead of a duplicate drawn blaster sprite; audio feedback; and layout registry data for browser QA.
