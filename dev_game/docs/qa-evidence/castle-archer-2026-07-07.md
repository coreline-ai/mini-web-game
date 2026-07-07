# QA Evidence — castle-archer (2026-07-07)

고품질 에셋 후보정 패스. 병렬 검토를 정적 에셋, 런타임 레이아웃, QA 게이트/evidence로 나누고 `game-polish` 흐름으로 수정했다.

## Fixed defects

- `assets/items/arrow.png`: 상단에 붙어 있던 분리된 캐릭터/몸통 조각 제거, 실제 화살 컴포넌트만 중앙 패딩으로 재배치.
- `assets/enemies/goblin-runner-sheet.png`, `runner-goblin.png`: 러너 왼쪽에 붙은 이웃 프레임/방패 파편 제거.
- `assets/enemies/orc-brute-sheet.png`, `brute-orc.png`: 하단 분홍 스트립/먼지 파편 제거.
- `assets/items/collectible.png`: 물약 왼쪽 초록색 소스 슬리버 제거.
- `assets/ui/btn-frame.png`: 하단 알파가 프레임 끝에 닿던 문제를 줄이고 런타임 버튼 패딩 복구.
- gameplay/runtime: 조준 레티클을 화면 안쪽으로 제한, 성벽 돌파 cleanup을 앞당김, 가장자리 burst FX 클램프 추가.

## Evidence

- Before samples: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/before/`
- After progression capture: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/`
- Static asset metrics: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/asset-metrics.json`
- Runtime JSON: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-asset-pass/after/runtime-samples.json`

Runtime JSON highlights:

- Browser console/page errors: 0.
- Reticle left-limit bounds: inside 390x844 canvas.
- Arrow visible-up bounds: inside 390x844 canvas using `arrow` texture.
- Enemy variety: `enemy_runner`, `enemy_shield`, `enemy_brute` visible with walk animations.
- Breach-line check: HP changed `3 -> 2`, test brute became inactive/invisible.

## Verification

```bash
npm --prefix dev_game/generated/castle-archer run build
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/castle-archer --require-gpt-imagegen
npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/castle-archer
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/castle-archer --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/castle-archer --viewports 390x844,430x932,1080x1920
```

Result: all PASS.

### Follow-up V2

사용자 재확인 결과 첫 UI padding pass가 화면상 충분히 해결되지 않은 것으로 보고되어, 버튼 렌더 구조를 더 강하게 변경했다.

- Text buttons no longer stretch `ui_frame`; they use runtime-generated `safe_text_button_*` textures.
- Home sound/settings and gameplay pause are frame+symbol containers, not full PNG icon images.
- Same-condition evidence:
  - `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after-runtime-safe-ui-v2/04-safe-ui-v2-contact-sheet.png`
  - `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after-runtime-safe-ui-v2/runtime-samples.json`

V2 verification: build, image-quality-qa, visual-layout-qa, scene-composite-qa, production-demo-qa all PASS.

## HQ asset regeneration pass

사용자 요청에 따라 방패병/적군/아이콘 버튼 이미지 에셋을 imagegen 기반으로 새로 생성하고 현재 1080x1920 런타임 기준에 맞춰 최적화했다.

### Fixed defects

- 적 4종 source sheet 신규 생성: basic goblin, runner goblin, shield goblin, brute orc.
- 각 적 cell에서 largest alpha component만 남겨 옆 프레임/무기 조각이 섞이지 않도록 정리.
- runtime enemy sheets를 `3072x768`, 4프레임 `768x768`로 업그레이드.
- `LoadingScene` spritesheet frame size를 `768x768`로 갱신.
- UI icon button source sheet 신규 생성 후 `btn-pause`, `icon-sound-on/off`, `icon-settings`, `icon-home`, `icon-retry`, `icon-close`를 `512x512` PNG로 교체.
- `makeIconButton()`은 새 PNG 아이콘 버튼을 직접 렌더하고, 이미지가 없을 때만 procedural fallback을 사용한다.
- `asset-manifest.json`, `asset-plan.json`, `03-ASSET-AUDIO-PLAN.md`, `07-REGRESSION-CHECKLIST.md`를 새 기준으로 갱신.

### Evidence

- Before/after and contact sheet: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-hq-asset-regeneration/`
- Contact sheet: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-hq-asset-regeneration/after/04-hq-asset-contact-sheet.png`
- Runtime JSON: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-hq-asset-regeneration/after/runtime-asset-fidelity-samples.json`
- Split metrics: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-hq-asset-regeneration/source-split-metrics.json`

Metric highlights:

- Enemy sheets: `2048x512 / 512px frame -> 3072x768 / 768px frame`.
- Runtime sample: enemy 4종 모두 `frameWidth=768`, `frameHeight=768`.
- UI pause source: `512x512`.
- Browser/page errors: 0.

Verification: build, image-quality-qa, visual-layout-qa, scene-composite-qa, production-demo-qa, production-gate all PASS.

## Brute / potion / pause-button correction pass

사용자 재지적: 4번째 방망이 든 적의 오른쪽이 깨져 보이고, pause 버튼을 누르면 버튼이 커지며, 물약 에셋이 현재 해상도와 맞지 않음.

### Root causes

- 브루트 적 시트는 프레임 경계 근처에 몸/무기가 붙어 있어 방망이와 오른쪽 외곽이 깨져 보일 수 있었다.
- `makeIconButton()`이 `setDisplaySize(128)` 이후 눌림 상태에 `setScale(0.94)`를 적용해, 표시 크기 128 기준이 아니라 원본 512 기준으로 버튼이 커졌다.
- 물약은 1024px 원본이었지만 검은 배경과 라벨 텍스트가 박힌 이미지라 런타임 pickup sprite 품질 정책과 맞지 않았다.

### Fixed defects

- 브루트 오크+방망이 원본을 imagegen으로 새로 생성하고 green chroma-key 제거 후 `brute-orc.png`, `orc-brute-sheet.png`를 재빌드.
- 브루트 시트는 `3072x768`, 4프레임 `768x768` 유지, 프레임별 오른쪽 padding 최소 59px 확보.
- 물약을 no-label transparent healing potion으로 새로 생성하고 `assets/items/collectible.png`를 `1024x1024`로 교체.
- pause 아이콘 눌림 효과는 source-relative scale이 아니라 display-size-relative `setDisplaySize()`로 수정.

### Evidence

- Contact sheet: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-brute-potion-button/after/04-brute-potion-button-contact-sheet.png`
- Runtime sample: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-brute-potion-button/after/runtime-brute-potion-button-samples.json`
- Direct sprite sample: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-brute-potion-button/after/runtime-brute-direct-sprite-samples.json`
- Metrics: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-brute-potion-button/after/asset-fix-metrics.json`

Metric highlights:

- Brute frame right padding: `[79, 64, 59, 65]`.
- Potion alpha padding: `L310 R309 T155 B154`.
- Pause button: `128px -> 120.32px` while pressed, no source-scale enlargement.
- Browser/page errors: 0.

Verification: build, image-quality-qa, visual-layout-qa, scene-composite-qa, production-demo-qa, production-gate all PASS.

## UI clipping and monster resolution pass

사용자 재지적: 홈 사운드 아이콘 오른쪽, PLAY 버튼 하단, gameplay pause 아이콘이 아직 잘려 보이고 몬스터 해상도가 낮아 보임.

### Root causes

- UI source alpha bbox가 PNG 가장자리에 너무 가까웠다. DPR2 표시 기준 padding이 사운드 약 2.66px, PLAY frame 약 3.84px, pause 약 3.5px뿐이었다.
- 몬스터 애니메이션 시트는 256px 프레임이었고, 플레이어 512px 프레임/1080x1920 배경과 품질 계층이 달랐다.

### Fixed defects

- `btn-frame`, `icon-sound-on/off`, `btn-pause`, `icon-settings`에 source alpha safety padding 적용.
- Home PLAY, sound/settings, gameplay pause 표시 크기/위치 조정.
- `btn-pause`의 1px detached alpha speckle 제거.
- 적 4종 runtime sprite sheet를 2048x512, 512px frames로 재빌드하고 `LoadingScene` 로더도 512px frame으로 갱신.

### Evidence

- Before/after: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/`
- Contact sheet: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after/04-ui-monster-contact-sheet.png`
- Runtime JSON: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after/runtime-samples.json`
- Metrics: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-ui-monster-pass/after/ui-monster-metrics.json`

Metric highlights:

- `btn-frame` min displayed padding `3.84px -> 9.58px`.
- `icon-sound-on` min displayed padding `2.66px -> 7.97px`.
- `btn-pause` min displayed padding `3.5px -> 7.5px`, tiny components `0`.
- Enemy runtime frame width `256px -> 512px`.
- Browser/page errors: 0.

### Verification

```bash
npm --prefix dev_game/generated/castle-archer run build
npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/castle-archer
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/castle-archer --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/castle-archer --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/castle-archer --require-gpt-imagegen
```

Result: all PASS.

## DPR/edge fidelity pass

두 번째 후보정 패스는 사용자가 지적한 홈 버튼 짤림, 물약/캐릭터 외곽 노이즈, 모바일 밀도 화면의 선명도 문제를 대상으로 진행했다.

### Root causes

- DPR2 환경에서 캔버스 backing store가 390x844로 남아 있어 780x1688 캡처에서 스프라이트 외곽이 업스케일됐다.
- 기존 PNG 일부에 작은 alpha component와 낮은 alpha 먼지가 남아 있었다.
- 홈 버튼 source padding과 runtime display height가 빡빡해 버튼 하단이 눌려 보였다.

### Fixed defects

- DPR-aware canvas sizing and logical camera mapping added.
- Pointer aiming converted back to logical coordinates after DPR scaling.
- Player/enemy sprite sheets cleaned to one component per frame.
- Healing potion rebuilt as a single clean pickup component.
- Home button positions, PLAY height, and sound/settings icon sizes adjusted.

### Evidence

- Before: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/before/`
- After: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/after/`
- Contact sheet: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/after/05-edge-crops-contact-sheet.png`
- Edge metrics: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/after/edge-metrics.json`
- Runtime JSON: `dev_game/generated/castle-archer/qa-captures/polish-2026-07-07-edge-pass/after/runtime-samples.json`

Metric highlights:

- DPR2 390x844: canvas backing store `780x1688`.
- Player max components per frame `46 -> 1`, tiny components `209 -> 0`.
- Collectible max components `30 -> 1`, tiny components `22 -> 0`.
- Button frame max components `4 -> 1`, tiny components `3 -> 0`.
- Browser/page errors: 0.

### Verification

```bash
npm --prefix dev_game/generated/castle-archer run build
npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/castle-archer
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/castle-archer --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/castle-archer --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/castle-archer --require-gpt-imagegen
```

Result: all PASS.
