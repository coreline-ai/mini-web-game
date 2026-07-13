# Runtime Asset Delivery Baseline — 2026-07-13

이 문서는 `implement_20260713_110501.md` Phase 1의 구현 전 기준선이다. 값은 각 프로젝트를 실제로 `vite build`한 뒤 `dist` 파일 byte 합계를 계산한 결과이며, `node_modules`와 source tree 크기를 섞지 않는다.

## 저장소 기준선

- HEAD: `b7fd2cb75b8e9abb76133b57b5a2d88e9be25176`
- Branch/upstream: `main...origin/main`, divergence `0 / 0`
- 공통 canvas: 10개 모두 `1080x1920`, `scaleMode: fit`
- manifest가 선언한 파일의 source 누락: 0
- 구현 전 manifest `delivery`/`assetLayout`: 10개 모두 없음

## 프로젝트별 build 및 payload 기준선

| 프로젝트 | Build | Dist files | Dist bytes | Loader↔manifest | 구현 전 핵심 source/provenance payload |
|---|---:|---:|---:|---|---|
| `bullseye-rush` | PASS | 24 | 15,853,741 | 16/16 일치 | scaffold SVG 3 + audio README |
| `castle-archer` | PASS | 50 | 37,419,410 | standalone enemy 3 manifest-only | `_source` 11개, 16,165,238B |
| `jungle-arcshot` | PASS | 34 | 21,763,904 | 22 refs / 20 unique, alias 정상 | `_source` 6개, 6,882,945B |
| `market-panic` | PASS | 45 | 19,602,205 | 27 unique 일치 | inactive PNG/SVG + README |
| `meteor-dash` | PASS | 26 | 3,291,808 | 18/18 일치 | scaffold SVG 3 + audio README |
| `parcel-sort-rush` | PASS | 70 | 25,236,584 | background 3 중복, supervisor manifest-only | `imagegen/raw|sheets` 31개, 13,250,138B |
| `road-stream-racer` | PASS | 55 | 41,285,361 | loader-only 5, manifest-only 1 | `references` 10개, 15,946,724B |
| `rush-lane-racer` | PASS | 53 | 18,124,512 | 30/30 일치 | legacy SVG 18 + README |
| `sky-archer` | PASS | 26 | 9,584,314 | 18/18 일치 | scaffold SVG 3 + audio README |
| `target-shooter-rush` | PASS | 33 | 18,880,712 | crosshair manifest-only | `imagegen/raw` 9개, 9,462,847B |

## Loader/manifest 특수 계약

- `parcel-sort-rush`: chute/stamp URL의 query string은 비교 시 제거하지만 manifest path에는 허용하지 않는다.
- `target-shooter-rush`: 여러 texture key가 같은 target/hit 파일을 사용한다. runtime 파일은 물리 파일 단위로 dedupe한다.
- `jungle-arcshot`: `hazard/fruit`, `collectible/balloon` texture alias가 같은 물리 파일을 사용한다.
- `market-panic`: Boot/Loading에서 같은 stage 파일을 반복 요청할 수 있으나 runtime file-set에는 한 번만 기록한다.
- provenance의 `rawPath`, `sourceSheet`, `alphaSourceSheet`, `referenceAssets`는 source metadata이며 runtime path가 아니다.
- manifest `assets/x`는 기존 publicDir 계약과 같은 URL/dist `x`로 배포한다.

## HQ 기준선

| 프로젝트 | Image QA | Production-demo QA | HQ QA | Browser smoke |
|---|---:|---:|---:|---:|
| `bullseye-rush` | PASS | PASS | FAIL 6 | PASS, canvas 1080x1920 |
| `jungle-arcshot` | PASS | PASS | FAIL 2 | PASS, canvas 1080x1920 |
| `meteor-dash` | PASS | PASS | PASS | PASS, canvas 1080x1920 |
| `rush-lane-racer` | PASS | PASS | PASS | PASS, canvas 1080x1920 |
| `sky-archer` | PASS | PASS | PASS | PASS, canvas 1080x1920 |

### Bullseye Rush 실패

| 파일 | 현재 치수/크기 | 실패 |
|---|---:|---|
| `stage-2.png` | 2160x3840 / 5,247,039B | edge 35.8, 3.5MiB 초과 |
| `player.png` | 2048x512 / 1,019,735B | 512KiB 초과 |
| `star.png` | 1254x1254 / 742,736B | 512KiB 초과 |
| `fx-hit.png` | 1254x1254 / 890,307B | 512KiB 초과 |
| `fx-collect.png` | 1254x1254 / 763,825B | 512KiB 초과 |

HQ gate의 여섯 번째 오류는 `stage-2.png`가 edge와 용량 두 조건을 각각 위반한 것이다.

### Jungle Arcshot 실패

| 파일 | 현재 치수/크기 | 실패 |
|---|---:|---|
| `stage-3.png` | 2160x3840 / 3,938,426B | edge 22.1, 3.5MiB 초과 |

## Phase 1 검증 결과

- 10개 build: PASS
- 10개 manifest JSON parse: PASS
- 10개 source manifest path existence: PASS
- 담당 5개 browser smoke: PASS, console/page error 0
- 구현 전 HQ 실패는 계획의 예상치와 동일하게 `bullseye-rush` 6건, `jungle-arcshot` 2건으로 재현됨
- 다음 단계 입력 schema: `assetLayout` rollout marker + 각 runtime collection entry의 명시적 `delivery` + 양수 `runtimeBudgetBytes`
