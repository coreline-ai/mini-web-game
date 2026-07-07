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
