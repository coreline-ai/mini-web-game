# 06 · Final QA Summary — Bullseye Rush (2026-07-07)

## Production gates (전부 GREEN, production-gate exit=0)
factory:qa OK · production-demo-qa(--require-gpt-imagegen) OK · image-quality-qa OK(11 assets) · visual-layout-qa OK(3해상도×5씬) · scene-composite-qa OK

## 헤드리스 게임플레이 검증 (window.__BULLSEYE_DEBUG__)
- 정밀 타이밍 봇(마커가 과녁 중심 ±10px일 때 탭): 22초에 **7라운드 클리어**, 15명중/불스아이 5/미스 0/2,380점 — 이동(R3+)·바운스(R5+) 패턴 포함 전 라운드 진행 확인
- 고의 미스 봇(과녁에서 먼 순간만 탭): 미스 3 → **over:true, reason:"misses"** 게임오버
- best 2,410 저장 · 콘솔/페이지 에러 0

## 검증 중 발견·수정한 결함 (fix→re-verify 완료)
1. **좀비 아트 태스크의 manifest 롤백**: 중단됐던 1차 아트 job이 뒤늦게 종료되며 구버전 manifest(만료 hazard/collectible)를 덮어씀 → 만료 엔트리 재제거+재승격.
2. **(팩토리) 고해상도 역차별**: 2160×3840 배경이 픽셀당 edge/hf 반감으로 placeholder 오탐 → 세로 2400px+ 이미지는 1920 기준 정규화 측정(캘리브레이션 보존). 실측 35.8/0.92 → 정규화 후 정상 대역.

## AI 에셋 (11종, 전부 codex image_gen 신규 생성)
사격장 배경 3종(초원 연습장 1080×1920/석양 토너먼트 2160×3840/등불 야시장 1080×1920) · 여궁수 시트 2048×512(4프레임 사격 사이클) · 불스아이 과녁/보너스 별/화살 · 버튼 2/FX 2

## 남은 확장 아이디어 (non-blocking)
승리 전용 결과 화면 · 과녁 궤도(원형/8자) 패턴 · 2연발 파워샷 아이템 · 데일리 챌린지 시드

## 2026-07-08 Native-FHD asset fidelity polish
- 증상: 390×844 논리 캔버스에서 1080×1920 배경과 대형 PNG가 축소된 뒤 다시 CSS 확대되어, 캐릭터 외곽과 목표물 아이콘이 흐리거나 깨져 보임.
- 원인 분류: `asset-fidelity/DPR mismatch`, `runtime-stretch`, `dirty-alpha-matte`, `oversized-resample-edge`.
- 수정: Phaser 기본 캔버스를 1080×1920으로 격상하고 기존 390×844 기준 좌표/폰트/속도/버튼 크기를 스케일 유틸로 변환. 데스크톱 landscape는 9:16 모바일 셸로 제한.
- 에셋: `assets/enemies/target.png`를 1024×1024 native-FHD 타깃으로 재제작, `assets/characters/player.png`는 2048×512 시트의 magenta/low-alpha 매트 제거 및 edge bleed 후처리.
- 증거: `qa-captures/native-fhd-2026-07-08/{390x844,1080x1920,1280x900}-{home,game}.png` 및 각 viewport `*-sample.json`.
- 검증: `npm run build` PASS, `factory:production-demo-qa --require-gpt-imagegen` PASS, `factory:visual-layout-qa --viewports 390x844,430x932,1080x1920,1280x900` PASS. `factory:image-quality-qa`와 `factory:scene-composite-qa`는 현재 Python 환경의 `PIL` 누락으로 실행 차단됨.

## 2026-07-08 Bright blurred outer-shell polish
- 증상: 1080×1920 캔버스 바깥 영역과 desktop/mobile shell 여백이 단색이라 화면이 끊기고 덜 화사해 보임.
- 원인 분류: visual presentation polish / native-FHD shell background mismatch.
- 수정: `body::before`와 `#game::before`에 `stage-1.png` 기반 blur/saturate/brightness 레이어를 추가하고, 캔버스 z-index를 위로 고정. 캡처 중 발견된 오른쪽 끝 조준 시 플레이어 일부 잘림은 aim margin을 확대해 함께 수정.
- 증거: `qa-captures/bright-blur-shell-2026-07-08/{390x844,1280x900}-{home,game}.png`, `390x844-game-right-edge.png`, 각 `*-sample.json`.
- 검증: blur background 적용 true, browserErrors 0, playerClipPass true.

## 2026-07-10 Full-resolution loader and asset-manifest cleanup
- 증상: runtime preload가 `images/hazard.svg` / `images/collectible.svg` scaffold SVG를 아직 로드했고, `target` / `star` / `arrow` production PNG는 `GameScene.preload()`에서 뒤늦게 로드됐다. `asset-manifest.json` stage backgrounds도 `source: placeholder`로 남아 있었다.
- 원인 분류: L. Asset Fidelity / F. Machine-Assertable Evidence.
- 수정: `src/game/constants/gameKeys.js`에 spritesheet/image/audio preload paths를 중앙화하고 `LoadingScene`이 production PNG를 모두 선로드하도록 변경. `GameScene`의 late image preload 제거. stage background manifest source를 `generated-for-game`으로 정정하고 SVG를 manifest allowed image format에서 제거.
- 추가 수정: image-quality QA가 `player.png` spritesheet top/side alpha padding을 잘림 위험으로 감지해, 각 512×512 frame content를 32px 이상 padding으로 재중앙화했다. 최종 frame pads: frame0 `32/52/32/52`, frame1 `32/53/32/54`, frame2 `32/43/32/44`, frame3 `32/56/32/56`.
- 증거: `qa-captures/full-resolution-2026-07-10/asset-fidelity-runtime-sample.json`, `qa-captures/full-resolution-2026-07-10/home-390x844-dpr3.png`, `dev_game/.tmp/visual-layout-qa/bullseye-rush`, `dev_game/.tmp/scene-composite-qa/bullseye-rush`.
- 검증: `npm run build` PASS, `factory:image-quality-qa` PASS, `factory:production-gate --require-gpt-imagegen --viewports 390x844,430x932,1080x1920,1280x900` PASS. Runtime sample assertions all true: `configIs1080x1920`, `backingStoreIs1080x1920`, `noAccidentalDprMultiplier`, `activeSceneIsHome`, `requiredTexturesLoaded`, `sourceSizesMeetRequired`, `noStaleSvgResources`, `noStaleSvgTextureKeys`, `browserErrorsZero`.
