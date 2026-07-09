# Road Stream Racer QA Evidence — 2026-07-08

Project: `dev_game/generated/road-stream-racer`

## Gates
- Build: pass.
- Production demo QA with imagegen provenance: pass.
- Image quality QA: pass, 17 role-aware assets.
- Visual layout QA: pass on `390x844`, `430x932`, `1080x1920`, `1280x900`.
- Scene composite QA: pass on `390x844`, `430x932`, `1080x1920`.
- Integrated production-gate: pass on port `4305/4306`.

## Capture Evidence
- Manual captures: `dev_game/.tmp/manual-road-stream-racer/`
- Visual layout captures: `dev_game/.tmp/visual-layout-qa/road-stream-racer/`
- Scene composite captures: `dev_game/.tmp/scene-composite-qa/road-stream-racer/`

## Runtime Debug Sample
Manual capture verified:
- `runtimeStrategy`: `native-fhd-canvas`
- `logicalCanvas`: `1080x1920`
- `canvasBacking`: `1080x1920`
- `roadRecycled`: true
- `desktopShell`: true
- `browserErrors`: 0

## Polish Pass — HQ Asset Rebuild + Lane Control

Scope:
- Rebuilt road/background/player/traffic/obstacle/item/UI/FX assets from new gpt 이미지젠 스킬 sources and repacked them for native FHD runtime use.
- Reworked lane input from continuous pointer-X retargeting to tap/swipe lane commands with cooldown, world-coordinate normalization, eased movement, velocity lean, and player shadow.
- Fixed boost pad motion so it no longer rotates like a coin.
- Adjusted HUD band to satisfy both visual safe margins and scene-composite artifact detection.

Evidence:
- Before: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-142646/before/`
- After: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-142646/after/`
- Asset contact sheet: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-142646/asset-contact-after.png`
- Final sample: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-142646/after/after-samples.json`

Final sample highlights:
- `browserErrorsCount`: `0`
- `assetFidelityPass`: `true`
- `controlAssert.stableAfterLaneChange`: `true`
- Key source frames: player/vehicles/items/icons/FX are `512x512` frames; player and coin sheets are `2048x512`.
- Canvas: `1080x1920` backing, DPR3 sample CSS `390x693`, backing scale `2.77`.

Final gates:
- `factory:production-demo-qa --require-gpt-imagegen`: pass.
- `factory:image-quality-qa`: pass, 17 role-aware assets.
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: pass.
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920,1280x900`: pass.

## Polish Pass — Live Playability + Return Path

Scope:
- Reproduced the user-reported live-play symptoms with Playwright captures: early crash/no readable path, no obvious in-run Home route, and delayed lane-change evidence.
- Changed lane control to immediate lane snap on tap/swipe while preserving a small lean response.
- Added a visible one-shot `홈` button to gameplay HUD beside Pause.
- Reduced HUD height and tightened text placement so the road and traffic remain visible.
- Restored a readable 3-second countdown and made early traffic preserve a clear safe lane.
- Updated visual-layout and scene-composite QA scripts to wait for registered scene transitions instead of fixed post-click timeouts; tuned scene-composite overlay detection to avoid registered HUD and road-lane false positives.

Evidence:
- Before: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-control-recheck/before/`
- After: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-control-recheck/after-snap/`
- Final sample: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-control-recheck/after-snap/after-snap-samples.json`

Final sample highlights:
- Browser errors: `0`.
- Mobile live tap: `60ms-after-tap` reached `x=760`, `lane=2`, `lastInput=tap`, `changingLane=false`.
- Desktop live tap: `60ms-after-tap` reached `x=760`, `lane=2`, `lastInput=tap`, `changingLane=false`.
- Direct gameplay Home path returns to `Home` on mobile and desktop.
- Pause path reaches `Game:paused,Pause`, then `처음으로` returns to `Home`.

Final gates:
- `npm run build`: pass.
- `factory:production-demo-qa --require-gpt-imagegen`: pass.
- `factory:image-quality-qa`: pass, 17 role-aware assets.
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: pass.

## Polish Pass — Separated Forest Layer + Smoothness Recheck

Scope:
- Reworked the forest fix after the user reported that the side forest was still not satisfactory and lane movement still felt unnatural.
- Root cause: rich tree artwork was being baked into the scrolling road loop. That makes vertical seam stability and rich non-repeating side art fight each other.
- Split ownership: straight road loop scrolls as `road_flat_loop`; static edge forest renders as `forest_side_overlay`.
- Removed hidden full-screen stage backgrounds and reduced road loop instances from three to two to lower FHD fill cost.
- Replaced spring lane movement with deterministic sine-in-out interpolation and tuned movement duration for low-FPS smoothness.

Evidence:
- Final Home capture: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-scenery-smoothness/final-scenes/mobile390-home-final.png`
- Final Game capture: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-scenery-smoothness/final-scenes/mobile390-game-final.png`
- Scene sample: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-scenery-smoothness/final-scenes/final-scenes-sample.json`
- Lane sample: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-scenery-smoothness/final-scenes/lane-motion-sample.json`

Final sample highlights:
- Browser errors: `0`.
- Active scene: `Game`.
- Road: `segmentHeight=1920`, active segment keys are `road_flat_loop`, active segment count is `2`.
- Scenery: `forest_side_overlay`, `1080x1920`, depth `2`.
- Lane motion: `movementFrames=28`, max observed x step `83.5px` in throttled headless timing; movement uses eased progress and no direct x snap.
- Headless RAF/FPS on this machine remains throttled, so the performance evidence is recorded as diagnostic rather than a device-level 60fps claim.

Final gates:
- `npm run build`: pass.
- `factory:production-demo-qa --require-gpt-imagegen`: pass.
- `factory:image-quality-qa`: pass, 17 role-aware assets.
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: pass.

## Polish Pass — Traffic Motion Readability

Scope:
- Captured Home and active Game states again on mobile and desktop.
- Fixed traffic vehicles that looked static because they only translated down the road without vehicle-specific motion cues.
- Added per-traffic shadow, custom `traffic_motion_wake` speed lines, and subtle lean while keeping cones/barricades free of vehicle FX.
- Fixed Pause-to-GameOver QA transition stability by making traffic cleanup safe after physics shutdown.
- Hardened visual-layout and scene-composite scene waits so captures only happen after the expected registered scene is active.

Evidence:
- Before: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-traffic-motion/before/`
- After: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-traffic-motion/after-final-2/`
- Final sample: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-traffic-motion/after-final-2/after-final-2-samples.json`
- Latest visual layout captures: `dev_game/.tmp/visual-layout-qa/road-stream-racer/`
- Latest scene composite captures: `dev_game/.tmp/scene-composite-qa/road-stream-racer/`

Final sample highlights:
- Browser errors: `0`.
- Mobile `game-traffic`: `trafficMotionFxVisible=6`.
- Traffic vehicles: `hasMotionFx=true`, `fxVisible=true`, `wakeTexture=traffic_motion_wake`.
- Cone sample: `hasMotionFx=false`, so hazard readability is preserved.
- Pause-to-GameOver transition recheck reaches `GameOver` with browser errors `0`.

Final gates:
- `npm run build`: pass.
- `factory:production-demo-qa --require-gpt-imagegen`: pass.
- `factory:image-quality-qa`: pass, 17 role-aware assets.
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: pass.

## Polish Pass — Flat Full-Frame Road

Scope:
- Reproduced the middle/lower stepped road seam in Home and Game captures.
- Root cause was mixed 640px runtime road segments (`straight`, `construction`, `crosswalk`) with incompatible sidewalk/road-edge offsets.
- Generated a new imagegen straight-road reference and applied a corrected full-frame `1080x1920` straight road loop.
- Changed Home, Countdown, and Game to use `road_flat_loop` instead of stacked/mixed 640px road tiles.

Evidence:
- Before: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-flat-road/before/`
- After: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-flat-road/after-fullframe/`
- Final sample: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-flat-road/after-fullframe/after-fullframe-sample.json`
- Runtime asset: `dev_game/generated/road-stream-racer/assets/roads/road-flat-loop-1080x1920.png`
- Imagegen reference: `dev_game/generated/road-stream-racer/assets/references/imagegen-road-stream-flat-road-20260708.png`

Final sample highlights:
- Browser errors: `0`.
- `road.segmentHeight`: `1920`.
- Active road segment keys: `road_flat_loop`.
- Home and Game captures show straight non-perspective road without middle/lower stepped sidewalk offsets.

Final gates:
- `npm run build`: pass.
- `factory:image-quality-qa`: pass, 17 role-aware assets.
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `factory:production-demo-qa --require-gpt-imagegen`: pass.
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: pass.

## Polish Pass — Forest Edge + Drive Feel

Scope:
- Restored left/right forest imagery while keeping the straight no-perspective full-frame road.
- Removed the visible lane-change jump by replacing direct x snapping with damped smooth movement.
- Corrected turbo flame direction so the boost trail comes from the rear of the player car and extends downward.
- Re-verified traffic vehicle motion wake/shadow after the road asset replacement.

Evidence:
- Before: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-drive-feel/before/`
- After lane/forest: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-drive-feel/after/`
- After boost/traffic verification: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-drive-feel/after-verify/`
- Final sample: `dev_game/generated/road-stream-racer/qa-captures/polish-20260708-drive-feel/after-verify/after-verify-sample.json`
- Active road asset: `dev_game/generated/road-stream-racer/assets/roads/road-flat-forest-loop-1080x1920.png`

Final sample highlights:
- Browser errors: `0`.
- Lane movement: `x=540 -> 590 -> 716 -> 760`; mid-transition `changingLane=true`; settled by `260ms`.
- Boost trail: `angle=-90`, `originX=1`, `alpha=0.86`, `visible=true`.
- Traffic motion: `trafficMotionFxVisible=4`; active vehicles use `traffic_motion_wake`.

Final gates:
- `npm run build`: pass.
- `factory:production-demo-qa --require-gpt-imagegen`: pass.
- `factory:image-quality-qa`: pass, 17 role-aware assets.
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: pass.
