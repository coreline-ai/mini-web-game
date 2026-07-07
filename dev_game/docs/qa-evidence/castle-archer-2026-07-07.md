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
