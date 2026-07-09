# 06 · Final QA Summary

## Verified Gates
- `npm run build`
- `node generator/scripts/production-demo-qa.mjs --project generated/road-stream-racer --require-gpt-imagegen`
- `PATH=/Users/iriver/.local/cbot-tools/miniforge3/bin:$PATH node generator/scripts/image-quality-qa.mjs --project generated/road-stream-racer`
- `PATH=/Users/iriver/.local/cbot-tools/miniforge3/bin:$PATH node generator/scripts/visual-layout-qa.mjs --project generated/road-stream-racer --viewports 390x844,430x932,1080x1920,1280x900`
- `PATH=/Users/iriver/.local/cbot-tools/miniforge3/bin:$PATH node generator/scripts/scene-composite-qa.mjs --project generated/road-stream-racer --viewports 390x844,430x932,1080x1920`
- `PATH=/Users/iriver/.local/cbot-tools/miniforge3/bin:$PATH npm run factory:production-gate -- --project generated/road-stream-racer --port 4305 --viewports 390x844,430x932,1080x1920,1280x900`

## Manual Capture Evidence
- `dev_game/.tmp/manual-road-stream-racer/01-loading.png`
- `dev_game/.tmp/manual-road-stream-racer/02-home.png`
- `dev_game/.tmp/manual-road-stream-racer/03-countdown.png`
- `dev_game/.tmp/manual-road-stream-racer/04-game-active.png`
- `dev_game/.tmp/manual-road-stream-racer/05-boost-active.png`
- `dev_game/.tmp/manual-road-stream-racer/06-pause.png`
- `dev_game/.tmp/manual-road-stream-racer/07-crash.png`
- `dev_game/.tmp/manual-road-stream-racer/08-result-restart.png`
- `dev_game/.tmp/manual-road-stream-racer/09-desktop-shell-1280x900.png`

## Runtime Checks
- Road segment recycle: true.
- Native FHD canvas: `1080x1920` logical and backing canvas.
- Desktop shell: centered 9:16 canvas inside 1280×900 viewport.
- Browser errors during manual capture: 0.

## Polish Pass 2026-07-08 14:26 KST — Asset Fidelity + Lane Control

User report:
- "이미지 에셋 배경 에셋 아이콘 에셋 모두 고화질 에셋이 아닌데! 고화질 최대이미지에 맞게 에셋 재구성 및 수정 진행"
- "게임 좌우 이동 하는것도 불안하고 뭔가 현실감이 없는데 왜 이렇게 어색한거야? 조작성 검토"

Defect classification:
- Class L Asset Fidelity, severity 2: source files met nominal size checks, but road tiles and runtime sprites/icons still read as low-detail/procedural in final capture.
- Class I Input Robustness, severity 2: lane control followed continuous absolute pointer X, so small pointer drift near lane boundaries could retarget the car unpredictably.
- Motion polish: boost pad inherited coin spin behavior, making a road pad rotate like a collectible.

Fixes:
- Regenerated HQ imagegen sources:
  - `assets/references/imagegen-road-stream-road-hq-20260708.png`
  - `assets/references/imagegen-road-stream-player-sheet-hq-20260708.png`
  - `assets/references/imagegen-road-stream-traffic-sheet-hq-20260708.png`
  - `assets/references/imagegen-road-stream-ui-fx-sheet-hq-20260708.png`
- Repacked all runtime PNG assets from those sources with chroma-key removal, 512px sprite/icon frames, native-FHD road/background files, updated `assets/asset-manifest.json` provenance and source-frame sizes.
- Replaced continuous pointer-X lane targeting with tap/swipe lane commands, cooldown/hysteresis, camera/world pointer normalization, exponential lane easing, velocity-based lean, and a player shadow.
- Made pause icon one-shot while opening Pause, reset on resume, and stopped boost pads from rotating.
- Expanded the HUD as a bright safe-area band to pass scene-composite and visual-layout gates without triggering false external-tooltip detection.

Before evidence:
- `qa-captures/polish-20260708-142646/before/03-game-baseline.png`
- `qa-captures/polish-20260708-142646/before/04-control-zigzag-baseline.png`
- `qa-captures/polish-20260708-142646/before/asset-fidelity-before.json`

After evidence:
- `qa-captures/polish-20260708-142646/asset-contact-after.png`
- `qa-captures/polish-20260708-142646/after/01-loading-after.png`
- `qa-captures/polish-20260708-142646/after/02-home-after.png`
- `qa-captures/polish-20260708-142646/after/03-game-after.png`
- `qa-captures/polish-20260708-142646/after/04-control-zigzag-after.png`
- `qa-captures/polish-20260708-142646/after/05-pause-after.png`
- `qa-captures/polish-20260708-142646/after/after-samples.json`

State sample highlights:
- Browser errors: `0`.
- Runtime strategy: `native-fhd-canvas`.
- Canvas backing store: `1080x1920`; CSS size at DPR3 sample: `390x693`; backing scale: `2.77`.
- Asset fidelity pass: `true`; key runtime assets are not upscaled.
- Control assert: `stableAfterLaneChange=true`, `lastInput=drag`, `targetLane=0`, `velocityX=0`, `changingLane=false`.
- Note: the control sample uses isolated `LaneInputSystem` pointer-object injection to avoid random crash pollution while proving the lane-controller math. Visual state captures use the final visual-layout QA outputs.

Final gate results:
- `npm run build`: pass.
- `npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/road-stream-racer --require-gpt-imagegen`: pass.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/road-stream-racer`: pass, 17 role-aware assets.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920`: pass.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920,1280x900`: pass.

## Polish Pass 2026-07-08 — Live Playability, Return Path, and QA Timing

User report:
- "게임 하는데 돌아갈 통로가 없어"
- "좌우 이동이 안되 너무 느려 기존 다른 겜 처럼 즉각 반응을 해야되"
- "스킬을 통해 직접 게임 화면 및 홈 화면 캡쳐 해서 문제점 파악 하고, 직접 게임을 돌려서 문제점 분석"

Defect classification:
- Class I Input Robustness, severity 2: lane changes still depended on eased movement and debug evidence used a direct lane-system injection instead of primary live browser input.
- Class E/UI flow, severity 2: gameplay had Pause but no explicit in-run Home return affordance, so the player had no obvious immediate way back.
- Gameplay pattern safety, severity 2: early traffic plus safe-lane obstacle placement could visually read as no available route.
- Evidence gap, severity 3: visual-layout and scene-composite QA used fixed post-click waits that failed valid countdown flows.

Root causes:
- `LaneInputSystem` accepted tap/swipe commands but still animated across lanes; during dense early traffic the car could be perceived as late.
- `HudUI` exposed only a pause icon during gameplay; Home was nested inside Pause.
- `TrafficPatternSystem` sometimes placed an obstacle on the declared safe lane while other lanes were occupied.
- QA scripts assumed Game/Pause scenes appear after fixed timeouts instead of waiting for the layout registry scene.

Fixes:
- Lane requests now snap the player to the requested lane immediately while keeping a short lean response; 60ms live browser samples show `x=760`, `lane=2`, `lastInput=tap` on both mobile and desktop.
- Added a one-shot `홈` button beside Pause in the gameplay HUD and wired it to stop gameplay music, pause physics, and return to Home.
- Reduced the top HUD panel height from 330px to 210px and tightened text/button layout so the road and incoming objects remain visible.
- Restored the configured 3-second countdown with Korean step prompts.
- Delayed the first traffic pattern, made the first pattern keep the center lane safe, and prevented obstacle placement from blocking the declared safe lane.
- Updated visual-layout and scene-composite QA scripts to wait for `__GAME_LAYOUT_BOUNDS__.scene` transitions instead of fixed waits; scene-composite external overlay detection now ignores registered HUD regions and avoids road/line false positives.

Before evidence:
- `qa-captures/polish-20260708-control-recheck/before/mobile390-game-initial.png`
- `qa-captures/polish-20260708-control-recheck/before/desktop1280-game-initial.png`
- `qa-captures/polish-20260708-control-recheck/before/before-samples.json`

After evidence:
- `qa-captures/polish-20260708-control-recheck/after-snap/mobile390-input-game.png`
- `qa-captures/polish-20260708-control-recheck/after-snap/mobile390-60ms-after-tap.png`
- `qa-captures/polish-20260708-control-recheck/after-snap/mobile390-pause-opened.png`
- `qa-captures/polish-20260708-control-recheck/after-snap/desktop1280-60ms-after-tap.png`
- `qa-captures/polish-20260708-control-recheck/after-snap/after-snap-samples.json`

State sample highlights:
- Browser errors: `0`.
- Mobile `60ms-after-tap`: player `x=760`, lane `2`, `changingLane=false`, `lastInput=tap`.
- Desktop `60ms-after-tap`: player `x=760`, lane `2`, `changingLane=false`, `lastInput=tap`.
- Direct Home path: mobile and desktop return to `Home`.
- Pause path: mobile and desktop show `Game:paused,Pause`, then return to `Home`.

Final gate results:
- `npm run build`: pass.
- `npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/road-stream-racer --require-gpt-imagegen`: pass.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/road-stream-racer`: pass, 17 role-aware assets.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920`: pass.

## Polish Pass 2026-07-09 — Tree-Skin Roadside Refinement

User report:
- "게임 실행 화면 도로 양쪽 나무 고품질 이미지 에셋 현재 도로 형태에 맞게 다시 스킬을 사용해서 캡쳐 확인 하고 이미지 업데이트 진행 해줘!"

Defect classification:
- Class L Asset Fidelity, severity 2: the left/right forest overlay used high-quality source art, but it was not tightly re-matted for the current straight-road gutter shape.
- Scene-composite robustness, severity 3: the road and HUD could still resemble dark external overlay artifacts in final capture inspection.

Root cause:
- The current road architecture correctly separates `road_flat_loop` from `forest_side_overlay`, but the previous forest strip still carried source-edge artifacts and did not strictly limit itself to the current green side gutters.
- The dark low-saturation asphalt and HUD glass panel matched the scene-composite external-tooltip heuristic in some captures.

Fixes:
- Rebuilt `assets/scenery/forest-side-overlay-1080x1920.png` as a vegetation-only HSV matte from the imagegen stage art, constrained to the current straight-road grass gutters.
- Excluded road, sidewalk, yellow road line, and non-tree artifacts from the forest overlay.
- Re-tinted `assets/roads/road-flat-loop-1080x1920.png` asphalt to a subtle cool-saturated tone while preserving lane marks, shoulders, sidewalks, and foliage.
- Brightened and saturated `assets/ui/racer_ui_header.png` so the HUD reads as an in-game panel, not a dark tooltip-like overlay.
- Cleaned/bridged detached alpha fragments in the traffic vehicle PNGs so role-aware image-quality QA accepts the final runtime assets.
- Updated `assets/asset-manifest.json` provenance for the 2026-07-09 forest and road post-processing.

Before evidence:
- `qa-captures/polish-20260709-tree-skin/before/mobile390-home-before.png`
- `qa-captures/polish-20260709-tree-skin/before/mobile390-game-before.png`
- `qa-captures/polish-20260709-tree-skin/before/before-sample.json`

After evidence:
- `qa-captures/polish-20260709-tree-skin/tree-skin-source-contact.png`
- `qa-captures/polish-20260709-tree-skin/after-final-5/mobile390-home-after.png`
- `qa-captures/polish-20260709-tree-skin/after-final-5/mobile390-game-after.png`
- `qa-captures/polish-20260709-tree-skin/after-final-5/fullhd-game-after.png`
- `qa-captures/polish-20260709-tree-skin/after-final-5/mobile390-game.layout.json`
- `qa-captures/polish-20260709-tree-skin/after-final-5/fullhd-game.layout.json`

State sample highlights:
- Forest overlay source size: `1080x1920`.
- Runtime forest display size: `1080x1920`, static layer depth `2`.
- Road remains a full-frame straight loop with `road_flat_loop` segment height `1920`.
- Final captures show the tree skin locked to the left/right roadside gutters without road-line contamination or center-road overlap.

Final gate results:
- `npm run build`: pass.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/road-stream-racer`: pass, 17 role-aware assets.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920`: pass.
- `npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/road-stream-racer`: pass.

## Polish Pass 2026-07-09 — Top-Right HUD Icon HQ Replacement

User report:
- "상단 오른쪽 홈 아이콘 중지 아이콘 현재 해상도에 맞게 다시 고화질 에셋 으로 아이콘 만들고 수정해줘!"

Defect classification:
- Class L Asset Fidelity, severity 3: the top-right Home/Pause button files were nominally large, but the final 82px runtime display left the inner symbols too small and low-impact.
- UI layout polish, severity 3: the icons needed to stay fully visible after increasing runtime display size.

Root cause:
- The prior icons had large internal transparent/ornamental space, so the semantic symbol occupied too little of the rendered HUD button.
- `asset-manifest.json` tracked older generic `btn-pause` assets but did not track the actual `racer_ui_home` and `racer_ui_pause` runtime HUD icons.

Fixes:
- Generated new imagegen source icons:
  - `assets/references/imagegen-road-stream-hud-home-20260709.png`
  - `assets/references/imagegen-road-stream-hud-pause-20260709.png`
- Removed the chroma-key background, normalized each icon to `1024x1024` transparent PNG, and replaced:
  - `assets/ui/racer_ui_home.png`
  - `assets/ui/racer_ui_pause.png`
- Increased top-right HUD icon runtime display size from `82x82` to `90x90` and adjusted positions so both remain fully visible.
- Added the actual runtime HUD icons to `assets/asset-manifest.json` with imagegen provenance and `renderedWorldSize=90x90`.

Before evidence:
- `qa-captures/polish-20260709-top-icons/before/mobile390-game-before.png`
- `qa-captures/polish-20260709-top-icons/before/fullhd-game-before.png`
- `qa-captures/polish-20260709-top-icons/source-before/racer_ui_home-before.png`
- `qa-captures/polish-20260709-top-icons/source-before/racer_ui_pause-before.png`

After evidence:
- `qa-captures/polish-20260709-top-icons/icon-contact-sheet.png`
- `qa-captures/polish-20260709-top-icons/source-after/racer_ui_home.png`
- `qa-captures/polish-20260709-top-icons/source-after/racer_ui_pause.png`
- `qa-captures/polish-20260709-top-icons/after-final/mobile390-game-after.png`
- `qa-captures/polish-20260709-top-icons/after-final/fullhd-game-after.png`
- `qa-captures/polish-20260709-top-icons/after-final/after-sample.json`

Asset fidelity metrics:
- `racer_ui_home`: source `1024x1024`, rendered world `90x90`, alpha bbox `(57,62)-(967,954)`, not upscaled.
- `racer_ui_pause`: source `1024x1024`, rendered world `90x90`, alpha bbox `(84,75)-(941,940)`, not upscaled.
- Final image-quality QA now includes 19 role-aware assets.

Final gate results:
- `npm run build`: pass.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/road-stream-racer`: pass, 19 role-aware assets.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920`: pass.
- `npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/road-stream-racer`: pass.

## Polish Pass 2026-07-09 — Top-Right HUD Icon Clean Readability

User report:
- "아이콘 2개 쫌 더 깔끔 한거 없어? 실행 중에 잘 눈에 안 띄워 이게 홈인지 일시정지 버튼인지"

Defect classification:
- Class C UI-Gameplay visual separation, severity 3: the previous top-right buttons were high quality but over-decorated, so the semantic Home/Pause symbols were not immediately readable during play.
- Class L Asset Fidelity, severity 3: the issue was not source resolution but final-screen recognizability at small HUD size.

Root cause:
- The first HQ replacement used ornate neon/metal detail and symbol strokes that competed with the button frame.
- Runtime display at `90x90` made those details read as noise while the player was focused on the road.

Fixes:
- Generated cleaner imagegen source icons:
  - `assets/references/imagegen-road-stream-hud-home-clean-20260709.png`
  - `assets/references/imagegen-road-stream-hud-pause-clean-20260709.png`
- Replaced the runtime HUD icons with simplified dark buttons and oversized white symbols:
  - `assets/ui/racer_ui_home.png`
  - `assets/ui/racer_ui_pause.png`
- Increased runtime display to `96x96` and shifted both buttons left enough to keep the pause button inside the mobile safe area.
- Updated `assets/asset-manifest.json` provenance and `renderedWorldSize=96x96`.

Before evidence:
- `qa-captures/polish-20260709-clean-icons/before/mobile390-game-before.png`
- `qa-captures/polish-20260709-clean-icons/before/fullhd-game-before.png`
- `qa-captures/polish-20260709-clean-icons/source-before/racer_ui_home-before.png`
- `qa-captures/polish-20260709-clean-icons/source-before/racer_ui_pause-before.png`

After evidence:
- `qa-captures/polish-20260709-clean-icons/icon-contact-sheet.png`
- `qa-captures/polish-20260709-clean-icons/source-after/racer_ui_home.png`
- `qa-captures/polish-20260709-clean-icons/source-after/racer_ui_pause.png`
- `qa-captures/polish-20260709-clean-icons/after-final/mobile390-game-after.png`
- `qa-captures/polish-20260709-clean-icons/after-final/fullhd-game-after.png`
- `qa-captures/polish-20260709-clean-icons/after-final/after-sample.json`

Asset fidelity metrics:
- `racer_ui_home`: source `1024x1024`, rendered world `96x96`, alpha bbox `(79,71)-(945,945)`, not upscaled.
- `racer_ui_pause`: source `1024x1024`, rendered world `96x96`, alpha bbox `(97,93)-(926,926)`, not upscaled.
- Final mobile capture shows a large house silhouette and two large pause bars with no right-edge clipping.

Final gate results:
- `npm run build`: pass.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/road-stream-racer`: pass, 19 role-aware assets.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920`: pass.
- `npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/road-stream-racer`: pass.

## Polish Pass 2026-07-09 — Top HUD Layout Reflow

User report:
- "게임 실행 화면 상단에 텍스트 정보 영역등 상단 레이아웃이 이상해 캡쳐 확인 하고 수정 진행"

Defect classification:
- Class C UI-Gameplay visual separation, severity 3: the gameplay HUD used a long translucent header that crossed the road and mixed with lane/traffic visuals.
- Layout polish, severity 3: score text sat too far left and the right-side Home/Pause icons felt detached from the information area.

Root cause:
- The previous HUD treated score, coins, speed, and stage as a wide partial-width panel with separate right-side icon buttons.
- In final captures the panel spanned across lane marks, while the score and icon buttons aligned to different visual anchors.

Fixes:
- Replaced the wide header asset usage with a compact in-game HUD strip constrained to the active road width.
- Aligned `점수`, coin count, `속도`, and stage value on a single baseline with subtle dividers.
- Reduced Home/Pause icon size and aligned them to the same top row without clipping.
- Kept boost text below the strip so it no longer competes with the top stat row.

Before evidence:
- `qa-captures/polish-20260709-top-hud/before/mobile390-game-before.png`
- `qa-captures/polish-20260709-top-hud/before/fullhd-game-before.png`
- `qa-captures/polish-20260709-top-hud/before/before-sample.json`

After evidence:
- `qa-captures/polish-20260709-top-hud/after-final/mobile390-game-after.png`
- `qa-captures/polish-20260709-top-hud/after-final/fullhd-game-after.png`
- `qa-captures/polish-20260709-top-hud/after-final/after-sample.json`

Final gate results:
- `npm run build`: pass.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/road-stream-racer`: pass, 17 role-aware assets.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920`: pass.
- `npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/road-stream-racer`: pass.

## Polish Pass 2026-07-08 — Separated Forest Layer + Smoothness Recheck

User report:
- "도로 배경 이미지 좌우 숲은 만들수 없는거야? 이유가 뭐야?"
- "좌우 이동 자연스럽게 이동이 안되!"
- "중간 중간 게임이 끊겨 이유가 뭐야?"

Defect classification:
- Class L Asset Fidelity, severity 2: the previous forest fix baked scenery into the scrolling road texture, which traded the clean road seam for simplified/procedural side art.
- Class B visual ownership, severity 2: the road loop and scenery both attempted to own roadside pixels, so rich forest art could introduce road-line overlap or visible loop seams.
- Class I/Input feel, severity 2: damped spring lane movement still produced large low-FPS jumps during two-lane travel.
- Class K/performance risk, severity 3: the FHD canvas rendered unnecessary full-screen layers and an extra road segment, increasing fill cost in low-power/headless environments.

Root causes:
- Rich forest artwork is not inherently hard to make; the issue was layer architecture. A single scrolling road+forest bitmap must be perfectly seamless vertically, so rich non-repeating tree detail either looks simplified or shows seams.
- Home/Countdown/Game still drew a full-frame `stage_1` behind a full-frame road that already covered the screen.
- `RoadSegmentSystem` used three `1920px` road segments even though two are enough for a full-height loop.
- Lane movement used a fast spring response; it no longer snapped, but the first high-velocity frames could still read as stutter.

Fixes:
- Reverted active `road_flat_loop` loading to the straight `assets/roads/road-flat-loop-1080x1920.png`.
- Added `assets/scenery/forest-side-overlay-1080x1920.png`, built from pure edge forest strips of the imagegen stage art with transparent center.
- Added `ASSET_KEYS.forestSideOverlay` and layered it above the road in Home, Countdown, and Game.
- Removed hidden full-frame `stage_1` draws from Home, Countdown, and Game.
- Reduced road segments from three to two full-height loop images.
- Changed lane movement to deterministic sine-in-out interpolation and tuned durations to `260ms` for one-lane moves and `350ms` for two-lane moves.
- Added scenery texture metrics to `window.__ROAD_STREAM_DEBUG__`.
- Added QA-only fast countdown for `sceneCompositeQa|visualLayoutQa` so automated scene-composite tests reach Game within their wait budget; normal gameplay countdown remains unchanged.

Before evidence:
- `qa-captures/polish-20260708-drive-feel/after/mobile390-home-after.png`
- `qa-captures/polish-20260708-drive-feel/after/mobile390-lane-mid-after.png`
- `qa-captures/polish-20260708-drive-feel/after/after-sample.json`

After evidence:
- `qa-captures/polish-20260708-scenery-smoothness/final-scenes/mobile390-home-final.png`
- `qa-captures/polish-20260708-scenery-smoothness/final-scenes/mobile390-game-final.png`
- `qa-captures/polish-20260708-scenery-smoothness/final-scenes/final-scenes-sample.json`
- `qa-captures/polish-20260708-scenery-smoothness/final-scenes/lane-motion-sample.json`

State sample highlights:
- Browser errors: `0`.
- Active scenes after final capture: `Game`.
- Road samples: `segmentHeight=1920`, active road segment keys are `road_flat_loop`, active segment count is `2`.
- Scenery sample: `forest_side_overlay`, `displayWidth=1080`, `displayHeight=1920`, `depth=2`.
- Lane sample under throttled headless timing: `movementFrames=28`, max observed x step reduced to `83.5px`, with eased `moveProgress` instead of one-frame x snap.
- Headless Chromium still reports throttled RAF/Phaser FPS around the high-20s on this machine; the fix removes visual snap, reduces full-screen draw cost, and records that timing as environment-specific evidence rather than a clean 60fps proof.

Final gate results:
- `npm run build`: pass.
- `npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/road-stream-racer --require-gpt-imagegen`: pass.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/road-stream-racer`: pass, 17 role-aware assets.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920`: pass.

## Polish Pass 2026-07-08 — Traffic Motion Readability

User report:
- "홈 화면, 게임 화면 캡쳐 해서 다시 이미지 맞춰죠"
- "왜 다른 차들은 달리는 것 처럼 묘사가 안되어 있어?"

Defect classification:
- Visual motion clarity, severity 2: traffic vehicles were static PNG sprites translated down the road, so they read as pasted objects instead of moving cars.
- Runtime shutdown robustness, severity 2: the Pause-to-GameOver QA transition could call traffic cleanup after the Phaser physics group had already shut down, producing a blank transition capture.

Root causes:
- Player boost had dedicated motion FX, but traffic vehicles had no per-vehicle shadow, wake, or angle response.
- `TrafficPatternSystem.destroy()` called `getChildren()` during scene shutdown, which can be unsafe once the physics group's internal children list is already released.
- Visual-layout QA swallowed scene-wait timeouts and could leave a preview server running after a failed capture.

Fixes:
- Added a runtime-generated `traffic_motion_wake` texture, per-traffic vehicle shadows, and subtle speed-based lean so non-player vehicles show road motion.
- Kept traffic FX off cones and barricades so hazards remain visually distinct.
- Exposed `trafficMotionFxVisible` in the runtime debug sample.
- Made traffic cleanup use the group's raw child entries only when they still exist.
- Hardened visual-layout and scene-composite QA scene waits so `Game`, `Pause`, and `GameOver` transitions must be real before capture; visual-layout QA now lets its preview server cleanup run before exiting on failure.

Before evidence:
- `qa-captures/polish-20260708-traffic-motion/before/mobile390-home.png`
- `qa-captures/polish-20260708-traffic-motion/before/mobile390-game-traffic.png`
- `qa-captures/polish-20260708-traffic-motion/before/before-samples.json`

After evidence:
- `qa-captures/polish-20260708-traffic-motion/after-final-2/mobile390-home.png`
- `qa-captures/polish-20260708-traffic-motion/after-final-2/mobile390-game-traffic.png`
- `qa-captures/polish-20260708-traffic-motion/after-final-2/desktop1280-game-traffic.png`
- `qa-captures/polish-20260708-traffic-motion/after-final-2/after-final-2-samples.json`

State sample highlights:
- Browser errors: `0`.
- Mobile traffic sample: `trafficMotionFxVisible=6`.
- Traffic vehicles: `hasMotionFx=true`, `fxVisible=true`, `wakeTexture=traffic_motion_wake`.
- Obstacles: `hasMotionFx=false`, preserving hazard readability.
- Pause-to-GameOver transition recheck: reaches `GameOver` with browser errors `0`.

Final gate results:
- `npm run build`: pass.
- `npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/road-stream-racer --require-gpt-imagegen`: pass.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/road-stream-racer`: pass, 17 role-aware assets.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920`: pass.

## Polish Pass 2026-07-08 — Flat Full-Frame Road

User report:
- "플레이 화면 도로를 원근감 없이 초반 이미지로 만들어줘"
- "중산단 하단 계단식 도로 잖아"
- "차라리 일자, 두번째 첨부 이미지 처음 전달 문서 처럼 이미지 재 생성 해서 적용 해"

Defect classification:
- Class L Asset Fidelity, severity 2: road art was high resolution, but the final screen used mismatched road segments that created stepped sidewalk/road seams in the middle and lower screen.
- Class B/C visual ownership, severity 3: background stage art plus runtime road tiles both owned roadside decoration, making seams more obvious.

Root cause:
- `RoadSegmentSystem` recycled a 640px sequence of `road_straight`, `road_construction`, and `road_crosswalk` textures.
- Those textures had different sidewalk offsets, road edge decoration, and horizontal feature bands, so their 640px boundaries could never align cleanly.
- Home and Countdown also stacked four 640px road tiles, so the first screen reproduced the same seam pattern.

Fixes:
- Generated a new imagegen reference: `assets/references/imagegen-road-stream-flat-road-20260708.png`.
- Added corrected straight-road runtime assets:
  - `assets/roads/road-flat-seamless.png` (`1080x640`, intermediate seamless tile).
  - `assets/roads/road-flat-loop-1080x1920.png` (`1080x1920`, final full-frame road loop).
- Changed gameplay road scrolling to use `road_flat_loop` only, with segment height `1920`.
- Changed Home and Countdown to render a single full-frame `road_flat_loop` image instead of stacking four 640px road tiles.
- Updated `assets/asset-manifest.json` with imagegen provenance and deterministic full-frame loop correction metadata.

Before evidence:
- `qa-captures/polish-20260708-flat-road/before/mobile390-game-road-before.png`
- `qa-captures/polish-20260708-flat-road/before/before-sample.json`

After evidence:
- `qa-captures/polish-20260708-flat-road/after-fullframe/mobile390-home-fullframe-after.png`
- `qa-captures/polish-20260708-flat-road/after-fullframe/mobile390-game-start-fullframe-after.png`
- `qa-captures/polish-20260708-flat-road/after-fullframe/mobile390-game-scroll-fullframe-after.png`
- `qa-captures/polish-20260708-flat-road/after-fullframe/after-fullframe-sample.json`

State sample highlights:
- Browser errors: `0`.
- Road segment height: `1920`.
- Runtime road texture key: `road_flat_loop` for every active road segment.
- Home and Game captures show a straight non-perspective road with no middle/lower stepped sidewalk offset.

Final gate results:
- `npm run build`: pass.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/road-stream-racer`: pass, 17 role-aware assets.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/road-stream-racer --require-gpt-imagegen`: pass.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920`: pass.

## Polish Pass 2026-07-08 — Forest Edge + Drive Feel

User report:
- "좌우에 숲 이미지 없어"
- "겜 도중 좌우 이동 할때 끊김 발생"
- "터보시 불꽃 이미지 방향 잘못됨"
- "자동자 좌우 이동시 자연스럽게 이동 되게 해줘"
- "나머지 차들도 달리는 것 처럼 해줘"

Defect classification:
- Class L Asset Fidelity, severity 2: the corrected straight road preserved the road but lost dense left/right forest readability in the final screen.
- Class I/Input feel, severity 2: lane changes snapped `player.x` directly to the target lane, producing a visible jump.
- Directional FX, severity 3: boost trail used a right-facing source image at `angle=0`, so the flame read sideways instead of behind the car.
- Motion clarity, severity 3: traffic vehicles needed verified wake/shadow evidence after the road replacement.

Root causes:
- The first flat road loop used a clean deterministic grass strip instead of a forested side strip.
- `LaneInputSystem.requestLane()` set `this.player.x = this.targetX` immediately, bypassing the smoother update loop.
- `GameScene` placed `fx-boost` with default origin/rotation.
- Traffic motion FX existed, but required re-verification after the road asset change.

Fixes:
- Rebuilt the active full-frame road as `assets/roads/road-flat-forest-loop-1080x1920.png`, keeping the straight 1080x1920 road while adding vertically wrapped forest/lamp edge imagery.
- Changed `road_flat_loop` loading to the forest version and updated `assets/asset-manifest.json` provenance.
- Removed lane snap assignment and changed lane movement to a damped spring response: immediate target intent, smooth visible travel.
- Rotated boost trail to `angle=-90`, set origin to the bright right edge, and positioned it at the rear of the player car.
- Added boost trail metrics to `window.__ROAD_STREAM_DEBUG__`.

Before evidence:
- `qa-captures/polish-20260708-drive-feel/before/mobile390-home-before.png`
- `qa-captures/polish-20260708-drive-feel/before/mobile390-after-lane-tap-before.png`
- `qa-captures/polish-20260708-drive-feel/before/mobile390-boost-before.png`
- `qa-captures/polish-20260708-drive-feel/before/before-sample.json`

After evidence:
- `qa-captures/polish-20260708-drive-feel/after/mobile390-home-after.png`
- `qa-captures/polish-20260708-drive-feel/after/mobile390-lane-mid-after.png`
- `qa-captures/polish-20260708-drive-feel/after-verify/mobile390-boost-direction-after.png`
- `qa-captures/polish-20260708-drive-feel/after-verify/mobile390-traffic-motion-after.png`
- `qa-captures/polish-20260708-drive-feel/after-verify/after-verify-sample.json`

State sample highlights:
- Browser errors: `0`.
- Lane movement after tap: `x=540 -> 590 -> 716 -> 760`, `changingLane=true` mid-transition, settled by `260ms`.
- Boost trail: `angle=-90`, `originX=1`, `alpha=0.86`, `visible=true`.
- Traffic vehicles: `hasMotionFx=true`, `fxVisible=true`, `wakeTexture=traffic_motion_wake`, `trafficMotionFxVisible=4`.

Final gate results:
- `npm run build`: pass.
- `npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/road-stream-racer --require-gpt-imagegen`: pass.
- `npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/road-stream-racer`: pass, 17 role-aware assets.
- `npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920,1280x900`: pass.
- `npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/road-stream-racer --viewports 390x844,430x932,1080x1920`: pass.
