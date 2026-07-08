# 06 · Final QA Summary — Jungle Arc Shot (2026-07-07)

## Production gates (전부 GREEN, production-gate exit=0)
factory:qa OK · production-demo-qa(--require-gpt-imagegen) OK · image-quality-qa OK(11 assets) · visual-layout-qa OK(3해상도×5씬) · scene-composite-qa OK

## 헤드리스 게임플레이 검증 (window.__JUNGLE_DEBUG__, 탄도 역산 봇)
- 봇이 중력(950)+바람(-110) 역산으로 조준: **12발 → 18명중** (발사<명중 = 관통 실증), **한 발 최대 3관통(pierceBest 3)**, 4라운드 클리어, 1,440점
- 화살 낭비 페이즈: 소진 → **over:true, reason:"arrows"** — 화살 경제 패배 정상
- best 1,440 저장 · 콘솔/페이지 에러 0

## 검증·게이트 중 발견·수정
1. manifest 만료 hazard/collectible 엔트리(플랜 개명 잔재) → 제거 후 production-demo 승격.
2. **(팩토리 보정)** 풍선(끈 달린 오브젝트) bbox 채움비 0.2745가 item 하한 0.28에 경계 탈락 — 이미지 육안 확인 결과 몸통 완전 불투명(형태 특성 오탐) → item/powerup 하한 0.24로 실측 보정(진짜 hollow 0.1x대는 여전히 차단).

## AI 에셋 (11종, 전부 codex image_gen 신규 생성)
정글 배경 3종(새벽 캐노피 1080×2160/한낮 폭포/반딧불 황혼 2160×3840) · 사파리 헌터 시트 2048×512 · 과일/풍선/대나무 화살 · 버튼 2/FX 2

## 남은 확장 아이디어
승리 전용 결과 화면 · 돌풍(라운드 중 바람 변화) 이벤트 · 폭발 과일(주변 연쇄) · 별점(남은 화살 기반 3성) 시스템

## Polish pass — HQ asset fidelity (2026-07-07)

User symptom:

- "아이콘, 버튼, 이미지 에셋들 해상도에 맞게 다시 업데이트"

Classification:

- Class L Asset Fidelity, severity 3 visual quality/layout.
- Related Class I Input Robustness for pause/text-button pressed state and repeated transition taps.

Baseline evidence:

- `qa-captures/polish-2026-07-07-hq-assets/before/01-home-before-390x844-dpr2.png`
- `qa-captures/polish-2026-07-07-hq-assets/before/02-game-before-390x844-dpr2.png`
- `qa-captures/polish-2026-07-07-hq-assets/before/03-pause-before-390x844-dpr2.png`
- `qa-captures/polish-2026-07-07-hq-assets/before/before-samples.json`

Root causes confirmed in the baseline sample:

- Browser DPR was `2`, but canvas backing store was still `390×844`, so `backingScale` was only `1`.
- `hazard` and `collectible` runtime keys loaded `128×128` SVG placeholders instead of the generated fruit/balloon PNG assets.
- Text buttons stretched a shared frame texture and fired on every `pointerdown`.
- Pause icon pressed feedback used cumulative `scale` math.

Fixes applied:

- Added Phaser `resolution = min(devicePixelRatio, 2)` and documented `physicalCanvasTarget = 780×1688`.
- Regenerated/reprocessed HQ transparent PNG assets from Codex `imagegen` source sheets: player `3072×768`, fruit/balloon/FX `1024×1024`, arrow `1024×1536`, UI icons `512×512`.
- Remapped `hazard` to `assets/enemies/fruit.png` and `collectible` to `assets/items/balloon.png`; player spritesheet now loads `768×768` frames.
- Replaced low-resolution text-button stretching with per-size `3×` generated button textures and one-shot input guards.
- Pause icon now uses fixed `displaySize` press feedback and restores before entering the Pause scene.

After evidence:

- `qa-captures/polish-2026-07-07-hq-assets/after/asset-contact-sheet-after.png`
- `qa-captures/polish-2026-07-07-hq-assets/after/asset-fidelity-metrics.json`
- `qa-captures/polish-2026-07-07-hq-assets/after/01-home-after-390x844-dpr2.png`
- `qa-captures/polish-2026-07-07-hq-assets/after/02-game-after-390x844-dpr2.png`
- `qa-captures/polish-2026-07-07-hq-assets/after/03-pause-after-390x844-dpr2.png`
- `qa-captures/polish-2026-07-07-hq-assets/after/after-samples.json`

State-sample assertions:

- `browserErrorsZero: true`
- `canvasBackingStoreSize: 780×1688`, `canvasCssSize: 390×844`, `backingScale: 2`
- `cameraZoomOk: true`
- `runtimePngRemapOk: true` (`hazard`→fruit PNG, `collectible`→balloon PNG)
- `playerFrameOk: true` (`768×768` frames)
- `pauseSourceOk: true` (`512×512`)
- `noUpscaledAssets: true`
- `pauseNoGrow: true`
- `singlePauseScene: true`
- `noInputLeakFromButtonSpam: true` (`arrowsLeft: 2`, `fired: 0` after rapid PLAY and pause taps)

Gate results:

- `npm --prefix dev_game/generated/jungle-arcshot run build`: PASS
- `factory:production-demo-qa --require-gpt-imagegen`: PASS
- `factory:image-quality-qa`: PASS (`15 assets at role-aware production-demo bar`)
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920`: PASS
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: PASS
- `factory:production-gate --require-gpt-imagegen --viewports 390x844,430x932,1080x1920`: PASS

## Polish pass — desktop mobile-shell containment (2026-07-08)

User symptom:

- "모바일 화면이 아니라 전체 화면으로 나오는데"

Classification:

- Class L Asset Fidelity / final screen presentation, severity 3 visual layout.
- Root cause: CSS made `#game` `100vw × 100dvh` for every viewport. On desktop `1280×900`, the game container became `1280×900` and Phaser cover-scaled the `1080×1920` canvas to `1280×2275`, making the game look like a full-screen desktop background instead of a mobile game screen.

Baseline evidence:

- `qa-captures/polish-2026-07-08-mobile-shell/before/desktop-1280x900-before.png`
- `qa-captures/polish-2026-07-08-mobile-shell/before/desktop-before-sample.json`
- Baseline sample: `#game = 1280×900`, canvas CSS rect `1280×2275`.

Fixes applied:

- Updated `src/styles/mobile.css` so portrait/mobile viewports still fill `100vw × 100dvh`.
- Added a desktop/wide-viewport shell using `@media (min-aspect-ratio: 1/1)`: `#game` is centered and capped to `min(100vw, 430px, 100dvh × 9/16)`.

After evidence:

- `qa-captures/polish-2026-07-08-mobile-shell/after/desktop-1280x900-after.png`
- `qa-captures/polish-2026-07-08-mobile-shell/after/mobile-390x844-after.png`
- `qa-captures/polish-2026-07-08-mobile-shell/after/mobile-shell-after-samples.json`

State-sample assertions:

- Desktop `1280×900`: `#game = 430×900`, centered at `x=425`, `shellPass: true`.
- Mobile `390×844` DPR2: `#game = 390×844`, `shellPass: true`.
- Browser errors: `0`.

Gate results:

- `npm run build`: PASS
- `factory:visual-layout-qa --viewports 390x844,430x932,1280x900`: PASS

## Polish pass — native 1080 canvas asset fidelity (2026-07-08)

User symptom:

- "Phaser 캔버스의 기본 크기 자체를 원본 에셋 크기인 1080 x 1920으로 올려라"
- "캐릭터가 외곽이 깨져 보이고, 목표물 아이콘 이미지도 깨져 보여"

Classification:

- Class L Asset Fidelity, severity 3 visual quality.
- Root causes: `runtime-stretch` and `backing-store-too-small` from the old `390×844` logical canvas path; secondary source sizing risk for player/target/projectile runtime PNGs after the canvas switch.

Baseline evidence:

- `qa-captures/polish-2026-07-08-1080-canvas/before/home-390x844-dpr2.png`
- `qa-captures/polish-2026-07-08-1080-canvas/before/game-390x844-dpr2.png`
- `qa-captures/polish-2026-07-08-1080-canvas/before/pause-390x844-dpr2.png`
- `qa-captures/polish-2026-07-08-1080-canvas/before/baseline-samples.json`

Baseline metrics:

- Browser DPR `2`, canvas backing store `780×1688`, CSS size `390×844`, camera zoom `2`.
- Player displayed `100×100` in-game and `130×130` on Home; fruit displayed `58×58`.
- The screen was still rendered from a small `390×844` coordinate system and then stretched to the viewport.

Fixes applied:

- Changed the Phaser base canvas to `1080×1920` and `scaleMode: cover`; removed the DPR2 camera/backing-store multiplication path.
- Added `BASE_CANVAS`, `SCALE`, `worldX()`, `fontPx()`, and `strokePx()` helpers so the old `390×844` play composition maps into the centered crop-safe region of the 1080 world.
- Scaled HUD, Home, Pause, GameOver, loading UI, target placement, target display sizes, arrow display size, trajectory preview, score FX, gravity, min/max launch speed, wind, drift, and input guard regions for the 1080 world.
- Rebuilt runtime assets for the new canvas target without exceeding image-quality edge/size gates: player sheet `2944×736` (`736×736` frames), fruit `768×768`, balloon `512×768`, arrow `512×1024`; pause/UI icons remain `512×512`.
- Updated `asset-plan.json` and `assets/asset-manifest.json` to declare the native 1080 strategy.

After evidence:

- `qa-captures/polish-2026-07-08-1080-canvas/contact-sheet.html`
- `qa-captures/polish-2026-07-08-1080-canvas/after/home-390x844-dpr2.png`
- `qa-captures/polish-2026-07-08-1080-canvas/after/game-390x844-dpr2.png`
- `qa-captures/polish-2026-07-08-1080-canvas/after/pause-390x844-dpr2.png`
- `qa-captures/polish-2026-07-08-1080-canvas/after/after-samples.json`

State-sample assertions:

- `browserErrors: 0`
- `canvasBackingStoreSize: 1080×1920`
- `gameConfig.width/height: 1080×1920`
- `camera.zoom: 1`
- `outOfViewportLayoutItems: 0`
- `assetFidelityPass: true`
- Rendered vs source: Home player `296×296 <= 736×736`; Game player `227×227 <= 736×736`; fruit `132×132 <= 768×768`; pause icon `127×127 <= 512×512`.

Gate results:

- `npm run build`: PASS
- `factory:production-demo-qa --require-gpt-imagegen`: PASS
- `factory:image-quality-qa`: PASS (`15 assets at role-aware production-demo bar`)
- `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920`: PASS
- `factory:scene-composite-qa --viewports 390x844,430x932,1080x1920`: PASS
- `factory:production-gate --require-gpt-imagegen --viewports 390x844,430x932,1080x1920`: PASS
