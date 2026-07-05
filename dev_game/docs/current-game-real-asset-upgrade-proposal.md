# Current Game Asset Upgrade Proposal — 게임별 신규 에셋 기반 업데이트 제안

> 기준: 업데이트된 `game-factory` production-demo 계약과 **per-game asset isolation** 원칙을 적용한다. 공통 런타임 에셋은 없다. 기존 루트 `assets/`나 다른 generated 게임의 에셋은 최종 런타임에 재사용하지 않는다. 모든 이미지/오디오/배경은 현재 게임 전용으로 신규 생성해 `dev_game/generated/parcel-sort-rush/assets/**` 안에 포함해야 한다.

## 1. 현재 상태 요약

| 항목 | 현재 상태 | production-demo 판정 |
|---|---|---|
| 대상 게임 | `dev_game/generated/parcel-sort-rush` | custom-loop는 있으나 production-demo 미통과 |
| 현재 핵심 이미지 | `assets/images/*.svg` placeholder | 실패 |
| stage backgrounds | manifest에 `stageBackgrounds` 없음 | 실패 |
| asset isolation | `assetIsolation` 없음 | 실패 |
| provenance | manifest entry에 `generated-for-game` 출처 없음 | 실패 |
| 오디오 | 생성 WAV placeholder | production-demo 교체 필요 |
| UI layout registry | `window.__GAME_LAYOUT_BOUNDS__` 없음 | 실패 |

## 2. 핵심 정책

```text
기존 프로젝트 에셋을 복사/참조/심볼릭 링크하지 않는다.
루트 assets/는 참고용 레퍼런스일 뿐 런타임 소스가 아니다.
새 게임은 새 게임 전용 에셋 패키지를 가진다.
```

허용:

- 기존 에셋의 스타일, 품질, 해상도 기준을 참고
- 동일한 아트 방향을 문서화
- 새 프롬프트/절차 생성/이미지 생성으로 현재 게임 전용 파일 제작

금지:

- `../../assets/...` 같은 루트 에셋 직접 참조
- 루트 `assets/` 파일을 그대로 복사해서 “신규 에셋”으로 표시
- 다른 generated 게임의 에셋 재사용
- symlink로 외부 에셋 연결
- 공통 CDN/public asset pool에 의존

## 3. Parcel Sort Rush 전용 신규 에셋 목록

### 3.1 Stage backgrounds — 1080×1920 PNG/WebP 3종 이상

| ID | 파일 위치 | 설명 |
|---|---|---|
| `warehouse-day` | `assets/images/production/backgrounds/warehouse_day.png` | 밝은 택배 공장, 컨베이어와 분류 슈트가 보이는 기본 배경 |
| `warehouse-rush` | `assets/images/production/backgrounds/warehouse_rush.png` | 경고등, 많은 박스, 러시 이벤트용 배경 |
| `warehouse-night` | `assets/images/production/backgrounds/warehouse_night.png` | 야간 근무, 네온/차가운 조명, 고난도 구간 |

### 3.2 Gameplay sprites

| 역할 | 신규 파일 |
|---|---|
| 일반 택배 | `assets/images/production/parcels/parcel_standard.png` |
| 취급주의 택배 | `assets/images/production/parcels/parcel_fragile.png` |
| 냉장 택배 | `assets/images/production/parcels/parcel_cold.png` |
| 중량 택배 | `assets/images/production/parcels/parcel_heavy.png` |
| A권역 슈트 | `assets/images/production/chutes/chute_a.png` |
| B권역 슈트 | `assets/images/production/chutes/chute_b.png` |
| 냉장 슈트 | `assets/images/production/chutes/chute_cold.png` |
| 취급주의 슈트 | `assets/images/production/chutes/chute_fragile.png` |
| 스캐너 게이트 | `assets/images/production/machines/scanner_gate.png` |
| 컨베이어 타일 | `assets/images/production/machines/conveyor_tile.png` |
| 성공 스탬프 | `assets/images/production/feedback/stamp_correct.png` |
| 실패 스탬프 | `assets/images/production/feedback/stamp_wrong.png` |
| 콤보 스탬프 | `assets/images/production/feedback/combo_perfect.png` |

### 3.3 UI

| 역할 | 신규 파일 |
|---|---|
| HUD 패널 | `assets/images/production/ui/hud_panel.png` |
| Pause 버튼 | `assets/images/production/ui/button_pause.png` |
| Play 버튼 | `assets/images/production/ui/button_play.png` |
| Resume 버튼 | `assets/images/production/ui/button_resume.png` |
| Home 버튼 | `assets/images/production/ui/button_home.png` |

### 3.4 Audio — OGG 권장

| 역할 | 신규 파일 |
|---|---|
| BGM | `assets/audio/production/music/parcel_factory_loop.ogg` |
| UI click | `assets/audio/production/ui/button_click.ogg` |
| Sort success | `assets/audio/production/sfx/sort_success_ding.ogg` |
| Sort wrong | `assets/audio/production/sfx/sort_wrong_buzz.ogg` |
| Miss | `assets/audio/production/sfx/parcel_miss_thud.ogg` |
| Rush warning | `assets/audio/production/sfx/rush_warning_alarm.ogg` |
| Game over | `assets/audio/production/sfx/shift_over_jingle.ogg` |

## 4. Manifest 계약

`dev_game/generated/parcel-sort-rush/assets/asset-manifest.json`은 아래 구조로 승격한다.

```json
{
  "assetsVersion": "1.0.0",
  "qualityTier": "production-demo",
  "assetIsolation": {
    "mode": "per-game",
    "generatedFor": "parcel-sort-rush",
    "noSharedRuntimeAssets": true
  },
  "stageBackgrounds": [
    {
      "id": "warehouse-day",
      "stage": 1,
      "path": "assets/images/production/backgrounds/warehouse_day.png",
      "minWidth": 1080,
      "minHeight": 1920,
      "quality": "production-demo",
      "provenance": {
        "source": "generated-for-game",
        "generatedFor": "parcel-sort-rush"
      }
    }
  ]
}
```

모든 `images`, `audio`, `stageBackgrounds` entry는 동일하게 `provenance.source: "generated-for-game"`와 `provenance.generatedFor: "parcel-sort-rush"`를 가져야 한다.

## 5. 구현 단계

1. `assets/images/production/**`, `assets/audio/production/**` 생성
2. Parcel Sort Rush 전용 이미지/오디오 신규 생성
3. `LoadingScene.js`에서 production assets preload
4. `gameKeys.js`에 production key 추가
5. `HomeScene`, `ConveyorSystem`, `Parcel`, `HudUI`, `PauseScene`, `GameOverScene`에서 placeholder SVG/도형을 production asset으로 교체
6. `LayoutBounds.js` 추가 후 `window.__GAME_LAYOUT_BOUNDS__` 노출
7. `asset-manifest.json`을 production-demo + per-game isolation으로 갱신
8. production gate 실행

## 6. 완료 검증

```bash
npm --prefix dev_game/generated/parcel-sort-rush run build
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/parcel-sort-rush
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/parcel-sort-rush
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/parcel-sort-rush
```

## 7. 결론

이전의 “루트 실제 에셋 재사용” 접근은 폐기한다. 새 기준은 다음이다.

1. 기존 프로젝트에는 영향 없음
2. 기존 프로젝트 에셋에는 의존 없음
3. 새 게임별로 신규 에셋 생성
4. generated game 폴더 안에 self-contained asset package 포함
5. QA가 공통/외부 에셋 의존을 실패로 판정
