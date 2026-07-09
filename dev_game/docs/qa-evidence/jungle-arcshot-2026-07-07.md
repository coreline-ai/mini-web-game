# QA Evidence — jungle-arcshot (2026-07-07)

포물선 트릭샷 사격(새총 드래그=각도+파워, 중력+바람 물리, 관통 콤보 ×n, 화살 경제 실패, R10 올클리어 승리).
빌드 판정 custom-loop: Spawner 미사용 — SlingshotAimSystem(탄도 미리보기=실물리 동일 해석해) + JungleRoundSystem.

- production-gate exit=0: qa/demo-qa(imagegen강제)/image-quality(11)/visual-layout/scene-composite 전부 OK
- 헤드리스(탄도 역산 봇): 12발 18명중(관통 실증), 한 발 3관통, 4라운드 클리어 1,440점, 화살소진 패배(reason arrows), 에러 0
- AI 에셋 11종 codex image_gen 신규 생성(정글 배경 3종·사파리 헌터·과일·풍선·대나무 화살)
- 팩토리 보정: item/powerup bbox 채움 하한 0.28→0.24 (끈 달린 오브젝트 실측 0.2745 오탐 해소)
- 증거: dev_game/generated/jungle-arcshot/qa-captures/ (gitignored) · 스펙: generator/examples/jungle-arcshot.spec.json

## HQ asset fidelity polish pass

2026-07-07 `game-polish` Class L/Class I pass for icons, buttons, and image assets:

- Reprocessed `gpt 이미지젠 스킬` source sheets into transparent runtime assets:
  player `3072×768` (`768×768` frames), fruit `768×768`, balloon `512×768`, arrow `512×1024`, FX `1024×1024`, pause/sound/home/retry icons `512×512`.
- Runtime remap: `hazard` now loads `assets/enemies/fruit.png`, `collectible` now loads `assets/items/balloon.png`; old `128×128` SVG placeholder load path removed.
- DPR fix: Phaser canvas now renders at physical `780×1688` for `390×844` DPR2 while the camera keeps the logical `390×844` coordinate system.
- Button/input fix: text buttons use size-specific `3×` generated textures with one-shot transition guards; pause icon uses fixed `displaySize` feedback and stops event propagation so UI taps do not fire arrows.
- Evidence:
  - Before: `dev_game/generated/jungle-arcshot/qa-captures/polish-2026-07-07-hq-assets/before/`
  - After: `dev_game/generated/jungle-arcshot/qa-captures/polish-2026-07-07-hq-assets/after/`
  - Key sample: `after-samples.json` asserts `backingScaleOk`, `runtimePngRemapOk`, `noUpscaledAssets`, `pauseNoGrow`, `singlePauseScene`, and `noInputLeakFromButtonSpam` all `true`.
- Final gates: build PASS, production-demo-qa PASS, image-quality-qa PASS (`15 assets`), visual-layout-qa PASS, scene-composite-qa PASS, production-gate PASS across `390x844,430x932,1080x1920`.
