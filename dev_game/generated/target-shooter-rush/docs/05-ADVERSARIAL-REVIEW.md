# 05 Adversarial Review - Anti-Reskin

## Challenge
This must not be a dodge starter with renamed hazards. A real shooting-gallery MVP needs tap-to-fire input, a visible shot line, distance-based hit evaluation, moving target rails, score/combo reward, miss penalties, and a timer-driven round end.

## Evidence Against Reskin
- `GameScene` no longer imports or updates Foundation `Spawner` or `ScoreManager`; it evaluates pointer shots against the moving target's radius.
- `TargetSystem` and `MovingTarget` are custom shooter-specific runtime files.
- Round state includes shots, hits, perfects, accuracy, best combo, time bonus, and miss penalty.
- Runtime art shows a shooting gallery, moving bullseye target, thin reticle, muzzle anchor, stage HUD, and hit burst rather than generic falling objects.
- Browser QA has explicit required layout IDs for game target, crosshair, shooter, playfield, HUD, and pause button.

## Remaining Attack Surface
The main risk is documentation drift: `player_blaster.png` and `crosshair.png` are still generated/loaded assets, but final gameplay uses the baked cannon plus muzzle anchor and runtime `reticle_ui`. Legacy Foundation files also remain in the source tree but are inactive. Final screenshot/video evidence must remain available so reviewers do not mistake those artifacts for active runtime behavior. If `image-quality-qa` rejects generated assets, the game is production-demo 미통과 and must regenerate stricter assets rather than claim completion.

## Decision
Build decision is `custom-loop`. The Foundation shell is reused for scene flow, storage, audio unlock, pause, and mobile scaling only. The requested fun - shooting a moving target - is implemented as game-specific systems.
