# Production Demo Quality Contract — 고품질 1차 프로덕션급 데모 강제 기준

> `dev_game`은 단순 실행 데모를 찍어내는 템플릿이 아니다. 목표 산출물은 **고품질 1차 프로덕션급 데모**다. 즉, 사용자가 바로 플레이해도 장르 정체성·아트 품질·UI 안정성·오디오 피드백이 보이는 playable vertical slice여야 한다.

## 0. 비협상 원칙

```text
Build green is not production-demo green.
Template reskin is not a game.
Placeholder-only assets are not acceptable for final delivery.
```

다음 중 하나라도 실패하면 완료 보고를 금지한다.

- 기존 dodge/falling starter에 이름·라벨·아이콘만 바꾼 상태
- 장르 고유 핵심 액션이 런타임에서 보이지 않는 상태
- 배경이 없거나 한 장짜리 placeholder SVG 배경만 있는 상태
- 공통/루트/기존 프로젝트 에셋을 런타임 에셋으로 재사용하는 상태
- 주요 플레이 에셋이 단순 도형/SVG placeholder인 상태
- HUD, 버튼, 코인, 점수, pause 등 UI가 safe area 안에서 겹치는 상태
- 음악/SFX가 없거나 pause/home/background 상태 제어가 깨진 상태
- `production-demo-qa` 또는 `visual-layout-qa`가 실패한 상태

## 1. Production Demo 산출물 정의

| 축 | 최소 통과 기준 |
|---|---|
| 기획 | `01-GDD.md`에 핵심 재미, 30초 루프, 1분 쉬운 구간, 5분 혼돈 구간, 차별점이 명시됨 |
| 기술 설계 | `02-TECH-DESIGN.md`에 씬, 엔티티, 시스템, 상태 흐름, 충돌, 데이터 구조가 있음 |
| Gameplay | 아이디어별 custom entity/system이 실제 runtime에 연결됨 |
| 에셋 | 해당 게임 전용으로 신규 생성된 주요 배경/플레이어/위험/보상/목표물이 모바일 축소 화면에서도 판독 가능 |
| 배경 | 스테이지/테마 배경 최소 3종, 기준 canvas보다 크거나 같음 |
| 오디오 | UI click, 성공/수집, 실패/피격, 게임오버, gameplay BGM 최소 구성 |
| UI | 390×844, 430×932, 1080×1920 viewport에서 safe area 밖으로 나가거나 겹치지 않음 |
| QA | build, common smoke, gameplay smoke, asset/audio QA, production-demo QA, visual-layout QA 통과 |

## 2. Asset Manifest 필수 계약

생성/커스텀 게임의 `assets/asset-manifest.json`은 아래 필드를 포함해야 한다.

```json
{
  "assetsVersion": "1.0.0",
  "qualityTier": "production-demo",
  "assetIsolation": {
    "mode": "per-game",
    "generatedFor": "<game-id>",
    "noSharedRuntimeAssets": true
  },
  "stageBackgrounds": [
    {
      "id": "city-day",
      "stage": 1,
      "path": "assets/images/backgrounds/city-day.webp",
      "minWidth": 1080,
      "minHeight": 1920,
      "quality": "production-demo",
      "provenance": {
        "source": "generated-for-game",
        "generatedFor": "<game-id>"
      }
    }
  ],
  "images": []
}
```

### 2.0 게임별 에셋 독립성

`dev_game`에는 공통 런타임 에셋이라는 개념이 없다. 새 게임은 항상 그 게임 컨셉에 맞는 에셋을 신규 생성하고, 생성된 게임 폴더 안에 보관한다.

필수 규칙:

- 런타임 이미지/오디오/배경은 모두 `dev_game/generated/<game-id>/assets/**` 아래에 있어야 한다.
- 루트 `assets/`, 다른 generated 게임, 기존 `Don't Get Pooped!` 프로젝트 에셋을 직접 참조하지 않는다.
- 심볼릭 링크로 기존 에셋을 연결하지 않는다.
- 기존 에셋은 스타일/품질 참고 자료로만 볼 수 있으며, 최종 산출물에는 새로 생성한 파일만 포함한다.
- `asset-manifest.json`에는 `assetIsolation.mode: "per-game"`, `assetIsolation.generatedFor: "<game-id>"`, `assetIsolation.noSharedRuntimeAssets: true`를 명시한다.
- 모든 manifest entry는 `provenance.source: "generated-for-game"`, `provenance.generatedFor: "<game-id>"`를 가진다.

### 2.1 `qualityTier`

- `qualityTier`는 반드시 `production-demo`여야 한다.
- 값이 없거나 `foundation`, `prototype`, `placeholder`이면 생산 품질 게이트 실패다.

### 2.2 스테이지/테마 배경

- `stageBackgrounds` 최소 3종 필수.
- 배경 파일 확장자는 기본적으로 `png`, `webp`, `jpg`, `jpeg`만 허용한다.
- SVG 배경은 production-demo 배경으로 인정하지 않는다. 벡터 아이콘은 가능하지만, stage background는 고품질 raster로 만든다.
- 각 배경은 `minWidth >= canvas.width`, `minHeight >= canvas.height`여야 한다.
- 1080×1920 세로 기준 게임은 가능하면 1080×1920 이상, 고품질 배포 후보는 2160×3840 원본을 권장한다.

### 2.3 주요 gameplay 에셋

다음 role은 production-demo 품질로 표시되어야 한다.

```text
player, vehicle, parcel, hazard, obstacle, enemy, boss,
collectible, reward, sort-bin, item, powerup, projectile,
stage-background, background
```

- 주요 gameplay role의 `quality`는 `production-demo`이어야 한다.
- 주요 캐릭터/장애물/보상은 원칙적으로 `png` 또는 `webp`를 사용한다.
- SVG는 `ui-icon`, `feedback`, `debug`, `placeholder` 같은 보조 role에만 허용한다.
- production-demo에서 단순 placeholder 도형을 주요 에셋으로 제출하면 실패다.

## 3. Visual Layout Registry 필수 계약

브라우저 QA가 UI 겹침을 판단할 수 있도록 runtime은 화면 요소 bounds를 노출해야 한다.

```js
window.__GAME_LAYOUT_BOUNDS__ = [
  {
    id: 'hud-score-panel',
    scene: 'GameScene',
    x: 20,
    y: 20,
    width: 180,
    height: 72,
    visible: true,
    allowOverlap: false
  }
];
```

필수 규칙:

- 좌표는 브라우저 viewport 기준 CSS pixel이다.
- `id`, `x`, `y`, `width`, `height`를 반드시 제공한다.
- 보이는 요소는 viewport safe margin 안에 있어야 한다.
- `allowOverlap: true`가 아닌 visible 요소끼리는 겹치면 실패다.
- HUD, pause, coin, score, combo, stage, shop cards, modal buttons는 registry 대상이다.

## 4. QA 강제 게이트

Production Demo 완료 전 아래 명령을 실행해야 한다.

```bash
npm --prefix dev_game run factory:qa
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/<game-id>
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/<game-id>
```

`factory:qa`는 Foundation 품질만 본다. `factory:production-demo-qa`와 `factory:visual-layout-qa`가 실제 production-demo 완료 기준이다.

## 5. 실패 시 보고 규칙

게이트 실패 시 “완료”라고 말하지 않는다. 아래 형식으로 보고한다.

```text
현재 상태: production-demo 미통과
실패 게이트:
- stageBackgrounds 3종 누락
- 주요 에셋이 SVG placeholder
- visual layout registry 없음
다음 수정:
- 배경 3종 WebP/PNG 생성
- player/hazard/reward PNG 교체
- UI bounds registry 연결
```

## 6. 왜 강제하는가

단순 프롬프트로 만든 게임과 차별화되는 지점은 “실행된다”가 아니라 다음을 반복 가능하게 보장하는 것이다.

- 아이디어를 장르 고유 gameplay로 번역
- 고품질 에셋/오디오 계획과 manifest 계약
- 시각적 깨짐을 자동 QA로 잡는 실패 가능한 게이트
- 현재 산출물이 production-demo인지 아닌지를 명확히 판정
- 각 게임이 기존 프로젝트나 다른 generated 게임에 의존하지 않는 독립 패키지인지 검증

따라서 `dev_game`의 기본 철학은 **Foundation starter + LLM 전문 기획/구현 + 강제 QA 게이트**다.
