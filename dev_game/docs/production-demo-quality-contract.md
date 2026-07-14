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
- DPR 물리 해상도 기준으로 원본 에셋이 부족해 실제 브라우저 캡처에서 흐리거나 업스케일되는 상태
- 공통/루트/기존 프로젝트 에셋을 런타임 에셋으로 재사용하는 상태
- 주요 플레이 에셋이 단순 도형/SVG placeholder인 상태
- HUD, 버튼, 코인, 점수, pause 등 UI가 safe area 안에서 겹치는 상태
- 음악/SFX가 없거나 pause/home/background 상태 제어가 깨진 상태
- 이미지 자산 생성이 `gpt 이미지젠 스킬` 경로가 아니거나, 생성물에 외부 이미지 서비스 스크립트가 남아 있는 상태
- `production-demo-qa --require-gpt-imagegen`, `visual-layout-qa`, `image-quality-qa`, `scene-composite-qa` 중 하나라도 실패한 상태

## 1. Production Demo 산출물 정의

| 축 | 최소 통과 기준 |
|---|---|
| 기획 | `01-GDD.md`에 핵심 재미, 30초 루프, 1분 쉬운 구간, 5분 혼돈 구간, 차별점이 명시됨 |
| 기술 설계 | `02-TECH-DESIGN.md`에 씬, 엔티티, 시스템, 상태 흐름, 충돌, 데이터 구조가 있음 |
| Gameplay | 아이디어별 custom entity/system이 실제 runtime에 연결됨 |
| 에셋 | 해당 게임 전용으로 신규 생성된 주요 배경과 `requiredAssetRoles` 에셋이 모바일 DPR 캡처에서도 판독 가능하며 업스케일되지 않음 |
| 배경 | 스테이지/테마 배경 최소 3종, 논리 canvas가 아니라 DPR 물리 타깃을 cover-fit 후에도 충족 |
| 오디오 | UI click, 성공/수집, 실패/피격, 게임오버, gameplay BGM 최소 구성 |
| UI | 390×844, 430×932, 1080×1920 viewport에서 safe area 밖으로 나가거나 겹치지 않음 |
| QA | build, common smoke, gameplay smoke, asset/audio QA, production-demo QA, visual-layout QA, scene-composite QA 통과 |

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
  "assetFidelity": {
    "logicalCanvas": { "width": 390, "height": 844 },
    "maxTargetDpr": 3,
    "physicalCanvasTarget": { "width": 1170, "height": 2532 }
  },
  "stageBackgrounds": [
    {
      "id": "city-day",
      "stage": 1,
      "path": "assets/images/backgrounds/city-day.webp",
      "minWidth": 1170,
      "minHeight": 2532,
      "quality": "production-demo",
      "display": { "fit": "cover", "logicalWidth": 390, "logicalHeight": 844 },
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

### 2.0.1 gpt 이미지젠 스킬 provenance

최종 production-demo 이미지 자산은 `gpt 이미지젠 스킬` built-in mode로 생성한 뒤 프로젝트에 복사/통합한다. 생성물 안에 이미지 SDK runner, 외부 인증 대기 스크립트, 서비스 호출 스크립트를 두지 않는다.

이미지/배경 manifest 항목은 아래 provenance를 가져야 한다.

```json
{
  "provenance": {
    "source": "generated-for-game",
    "generatedFor": "<game-id>",
    "method": "codex-gpt-imagegen-skill",
        "sourceSkill": "imagegen",
    "promptHash": "<sha256-prefix>",
    "quality": "high"
  }
}
```

시트 방식으로 생성/후처리한 경우 `sourceSheet`와 `rawPath`도 남긴다. `$CODEX_HOME/generated_images/**`는 임시 원본 위치일 뿐이며, 런타임은 반드시 `dev_game/generated/<game-id>/assets/**` 내부 파일만 참조한다.

품질 미달 이미지(저해상도, 흐림, 찌그러짐, 잘림, chroma/회색 잔여물, 스타일 불일치, 임의 텍스트)는 수정 코드로 감추지 말고 더 강한 프롬프트로 재생성한다.

### 2.0.2 DPR/소스 픽셀 품질 계약

`asset-manifest.json` 또는 QA 샘플은 게임의 에셋 품질 타깃을 명시해야 한다.

필수 필드:

- `assetFidelity.logicalCanvas`: 런타임 좌표계
- `assetFidelity.maxTargetDpr`: 모바일 기본값 3
- `assetFidelity.physicalCanvasTarget`: `logicalCanvas * maxTargetDpr`
- 각 주요 이미지의 `display.logicalWidth/logicalHeight`, `sourceWidth/sourceHeight`, `frameWidth/frameHeight`, `requiredSourceWidth/requiredSourceHeight`

통과 규칙:

- 배경은 cover-fit 후 물리 캔버스를 업스케일 없이 덮어야 한다.
- 플레이어/적/몬스터/보상/아이콘/버튼은 `sourceFrameSize >= renderedLogicalSize * maxTargetDpr`를 만족해야 한다.
- 텍스트가 들어가는 액션 버튼은 저해상도 라벨 이미지를 쓰지 않고 런타임 텍스트 + 고해상도/9-slice/코드 기반 버튼 베이스를 사용한다.
- 모든 sprite/UI/FX는 아래 공통 고해상도 규격의 투명 패딩 계약을 따른다. 일반 에셋은 6~10%, 회전 아이콘·강한 FX만 사유를 manifest에 기록하고 최대 12%까지 허용한다.
- `1080x1920`은 모든 게임의 만능 통과 기준이 아니다. `390x844` DPR3는 `1170x2532`, `430x932` DPR3는 `1290x2796` 이상이 필요하다.

`factory:image-quality-qa`가 아직 이 모든 항목을 자동 검사하지 못하는 경우, Playwright 상태 샘플이나 별도 JSON 검증으로 같은 값을 기록하고 `06-FINAL-QA-SUMMARY.md`에 첨부한다.

### 2.0.3 역할별 이미지 Alpha/패딩 품질 계약

AI 시트 crop 후 투명 배경을 만드는 과정에서 “반투명으로 녹아내린” 에셋은 production-demo가 아니다. 아래 항목은 asset QA가 실패 처리해야 한다.

- `parcel`, `vehicle`, `player`, `hazard`, `sort-bin`, `scanner`, `conveyor` 같은 gameplay 구조물은 속이 빈 선화처럼 보이면 실패다. 충분한 불투명 면적과 내부 구조가 남아 있어야 한다.
- 컨베이어/도로/바닥/분류 chute처럼 판정과 연결되는 기능성 오브젝트는 투명 외곽선만 있으면 실패다. 코드 기반 solid backing 또는 고품질 래스터 면을 반드시 가진다.
- raw crop 대비 production PNG에서 박스·차량·캐릭터의 윗면/몸체/라벨이 사라지면 실패다.
- 반투명 픽셀이 과도하면 실패다. 이는 대개 background removal tolerance가 높아 오브젝트 내부까지 지운 신호다.
- UI 버튼/스탬프/패널은 glow, bevel, 원형 badge가 canvas edge에 닿으면 실패다. 일반 투명 padding 6~10%를 확보한다.
- feedback stamp는 원형/정사각 badge로 생성한다. 짧은 가로 배너 canvas에 원형 stamp를 욱여넣는 것은 실패다.
- 버튼은 런타임에서 원본 비율을 보존하거나 9-slice/procedural base를 사용한다. 상단 하이라이트가 어두운 슬롯처럼 보이거나 라벨을 가리면 실패다.

### 2.0.4 Scene-first Composite Art QA 계약

에셋 파일 단위로는 정상이어도 실제 화면에 재조합되면 깨질 수 있다. 따라서 production-demo에서는 **전체 장면 아트보드 → 에셋 분리 → 런타임 재조합 → 스크린샷 비교/검사** 흐름을 필수로 둔다.

필수 산출물:

- `assets/artboards/home.png`, `game.png`, `pause.png`, `gameover.png` 또는 이에 준하는 scene-first 기준 이미지
- `assets/artboards/slice-map.json`: 원본 아트보드에서 어떤 crop이 어떤 runtime asset이 되었는지 기록
- `assets/qa/contact-sheets/`: 원본 시트, crop 결과, runtime 스크린샷을 한 장으로 비교하는 QA 이미지
- `asset-manifest.json`의 `sourceSheet`, `rawPath`, `cropBox`, `postprocess` provenance

자동 실패 처리해야 하는 예:

- GameOver warning/stamp 아이콘이 잘리거나 톱니/찌꺼기 조각이 남음
- 버튼 상단 하이라이트가 긴 회색/검은 슬롯처럼 보여 라인이 깨져 보임
- 택배 박스/차량/캐릭터의 윗면·몸체·라벨 일부가 투명 처리되어 사라짐
- chute/컨베이어/도로 같은 기능성 오브젝트가 선만 남거나 중간이 끊겨 보임
- Home/Modal 외곽 패널 테두리가 배경에 묻혀 안 보임
- 브라우저/OS tooltip, floating bubble, 확장 프로그램 오버레이가 캡처에 섞임

`factory:scene-composite-qa`는 Loading/Home/Game/Pause/GameOver를 실제 브라우저에서 캡처하고, 위 유형의 화면 단위 결함을 검사한다. 파일 품질 QA가 통과해도 scene-composite QA가 실패하면 production-demo 미통과다.

### 2.1 `qualityTier`

- `qualityTier`는 반드시 `production-demo`여야 한다.
- 값이 없거나 `foundation`, `prototype`, `placeholder`이면 생산 품질 게이트 실패다.

### 2.2 스테이지/테마 배경

- `stageBackgrounds` 최소 3종 필수.
- 배경 파일 확장자는 기본적으로 `png`, `webp`, `jpg`, `jpeg`만 허용한다.
- SVG 배경은 production-demo 배경으로 인정하지 않는다. 벡터 아이콘은 가능하지만, stage background는 고품질 raster로 만든다.
- 각 배경은 논리 canvas가 아니라 `assetFidelity.physicalCanvasTarget` 이상이어야 하며, cover-fit 계산 후 업스케일되지 않아야 한다.
- 390×844 논리 세로 게임은 DPR3 기준 최소 1170×2532, 430×932 논리 세로 게임은 DPR3 기준 최소 1290×2796을 권장한다. 가능하면 1440×3120 이상 원본을 사용한다.

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
- 주요 gameplay 에셋은 런타임 표시 크기와 `maxTargetDpr` 기준의 최소 프레임 크기를 만족해야 하며, 몬스터/적/캐릭터가 흐리게 보이면 source-too-small 또는 backing-store-too-small 결함으로 처리한다.

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

- `capture-matrix.json`에 선언된 모든 Scene/overlay 상태가 registry와 `requiredIds`를 게시한다.
- registry는 `requiredIds`를 선언할 수 있으며, `visual-layout-qa`는 선언된 필수 요소가 누락/투명/0크기이면 실패 처리한다.
- canvas는 viewport 중앙에 있어야 하며 오른쪽/왼쪽 치우침은 실패다.
- HUD 점수/최고점수/스테이지 영역은 상하 여백이 균등해야 하고, 코인 아이콘과 숫자는 같은 baseline에 있어야 한다.
- 우측 상단 코인 영역은 safe-area와 우측 edge에서 충분히 떨어져야 한다.
- pause 버튼은 HUD 텍스트와 겹치지 않으며, pause modal 버튼/패널은 원본 비율을 유지해야 한다.
- shop/item cards는 캐릭터 머리·하단 텍스트가 card border에 닿지 않도록 inner padding을 가진다.
- 버튼 상단 하이라이트/투명 영역이 라벨을 가리거나 패널 밖으로 튀면 실패다.
- `id`, `x`, `y`, `width`, `height`를 반드시 제공한다.
- 보이는 요소는 viewport safe margin 안에 있어야 한다.
- `allowOverlap: true`가 아닌 visible 요소끼리는 겹치면 실패다.
- HUD, pause, coin, score, combo, stage, shop cards, modal buttons는 registry 대상이다.

### 3.1 장면별 registry 최소 범위

게임 장르가 달라도 “사용자가 보고 누르는 것”은 빠짐없이 registry에 올린다.

| Scene | 최소 registry 대상 |
|---|---|
| Loading | 로딩 패널, 로고/타이틀, 진행률 bar/back/fill, percent/status |
| Home | 타이틀, 핵심 데모/캐릭터, Play, Sound/Settings/Shop 등 주요 버튼 |
| Game | HUD panel, score/combo/stage/life/coin text, pause, 핵심 playfield, 판정선, hit zone, 주요 goal/target label |
| Pause | modal panel, title, resume/restart/home/sound 버튼 |
| GameOver | panel, title, stamp/result icon, score, best, stats, retry, home |

장르별 기능성 오브젝트 예:

- 택배 분류: `game-belt`, `game-floor-panel`, `game-scanner`, `game-miss-line`, `game-bin-hit-zone-*`, `game-bin-label-*`
- 레이싱: `game-road`, `game-lane-*`, `game-player-car`, `game-hud-speed`, `game-pause-button`
- 회피/슈터: `game-player`, `game-safe-zone`, `game-boss-health`, `game-warning-banner`

registry가 성기면 QA는 “겹침 없음”이라고 잘못 판단한다. 따라서 시각적으로 문제가 난 요소는 반드시 registry에 등록하고, 필요하면 `mustBeInside`, `innerPadding`, `allowOverlapWith`를 명시한다.

## 4. QA 강제 게이트

Production Demo 완료 전 아래 명령을 실행해야 한다.

```bash
npm --prefix dev_game run factory:qa
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/<game-id> --require-gpt-imagegen
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/<game-id> --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:image-quality-qa -- --project dev_game/generated/<game-id>
npm --prefix dev_game run factory:scene-composite-qa -- --project dev_game/generated/<game-id> --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --viewports 390x844,430x932,1080x1920
```

`factory:qa`는 Foundation 품질만 본다. `factory:production-demo-qa`, `factory:image-quality-qa`, `factory:visual-layout-qa`, `factory:scene-composite-qa`가 실제 production-demo 완료 기준이다.

`factory:hq-screen-quality-qa`는 DPR/source-size 또는 market-event depth를 추가로 확인하는 선택형 게이트다. `marketConfig.js`가 없는 게임에서는 market-event 검증을 건너뛰며, market-event를 반드시 검사해야 할 때만 `--require-market-events`를 사용한다. Python Pillow가 필요하다.

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

## 2.0.5 공통 고해상도 에셋 규격 — authoritative source

이 표와 규칙이 `dev_game` 에셋 해상도·패딩의 단일 원본이다. 다른 문서는 이 절을 링크하고 숫자를 복제하지 않는다.

| 에셋 | 제작 원본 | 런타임 권장 |
|---|---:|---:|
| 세로 배경 | 2160×3840 | 1080×1920 WebP/PNG |
| 풀 씬 아트보드 | 2160×3840 | QA·슬라이스 기준 |
| 주요 캐릭터 | 1024×1024 이상 | 실제 표시 크기의 2~3배 |
| 애니메이션 시트 | 4096×1024 이상 | 프레임별 충분한 여백 |
| 게임 오브젝트 | 768~1024px | 256~384px 렌더 |
| UI 버튼 | 1024×320 이상 | 9-slice 또는 비율 고정 |
| 정사각형 아이콘/FX | 512~1024px | 128~256px 렌더 |

배경은 위 고정 규격과 `cover` 후 DPR 물리 캔버스를 덮는 계산값 중 더 큰 원본을 사용한다. 배경에는 실제 플레이 오브젝트를 굽지 않고 중앙 플레이 영역의 디테일을 줄이며 외곽에 집중한다. 한글·점수·버튼 문구는 이미지에 굽지 않는다. 일반 스프라이트의 가상 셀 제작 패딩은 6~10%이고, 회전 아이콘·강한 FX만 `transparentPadding.kind`와 사유를 manifest에 남기고 최대 12%를 허용한다. 색상뿐 아니라 아이콘과 실루엣으로 역할을 구분한다. 최종 판정은 원본 단독이 아니라 실제 390×844 렌더와 declared capture-state contact sheet를 우선한다.

schema v2/custom-loop는 `requiredAssetRoles`를 필수로 선언하며 공통 role은 `response-unit`, `protected-objective`, `hazard-fx`, `command-unit`, `risk-indicator`, `status-icon`을 포함한다. v1의 `player/hazard/collectible`은 compatibility alias일 뿐 custom-loop 필수 조건이 아니다.

## 4.1 Declared Capture States와 Custom-loop Full Gate

고정 5 Scene만 캡처하는 방식 대신 `qa/capture-matrix.json`이 게임의 모든 주요 화면·overlay·동적·terminal 상태를 선언한다. 각 상태는 `expectedScene`, `requiredIds`, 선택적 `assertions`, `terminal`, `capture`를 갖는다. 공통 runner는 같은 `runId`로 screenshot, 상태 JSON, contact sheet, report를 생성한다.

```bash
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/<game-id> --mode custom-loop-full
```

schema v1은 compatibility mode에서 기존 게이트를 유지한다. schema v2/custom-loop는 capture matrix, first-play clarity, hostile input, session continuity, docs-runtime sync, image/HQ, 장시간 안정성, `qa-session-report.json`을 필수로 실행한다.
