# Parcel Sort Rush — Asset & Audio Plan

## 원칙

- 공통/루트/다른 게임 에셋을 런타임에 사용하지 않는다.
- 모든 런타임 이미지·오디오는 `parcel-sort-rush` 전용으로 새로 생성하고 `assets/**` 아래에 보관한다.
- `assets/asset-manifest.json`의 모든 항목은 `provenance.source = generated-for-game`, `provenance.generatedFor = parcel-sort-rush`를 가진다.
- Foundation SVG/WAV placeholder는 최종 production-demo 자산이 아니므로 제거한다.

## 이미지

| asset group | 파일 | 용도 | QA |
|---|---|---|---|
| Stage backgrounds | `assets/images/production/backgrounds/warehouse_day.png` | 기본 주간 택배센터 배경 | 1080x1920 PNG, UI 방해 없음 |
| Stage backgrounds | `assets/images/production/backgrounds/warehouse_rush.png` | 물량 폭주 경고 배경 | 1080x1920 PNG, 러시 상태 색감 차별 |
| Stage backgrounds | `assets/images/production/backgrounds/warehouse_night.png` | 게임오버/야간 배경 | 1080x1920 PNG, 어두운 오버레이와 조화 |
| Parcels | `assets/images/production/parcels/*.png` | A/B/냉장/취급주의 택배 | 투명 배경, 라벨 판독 가능, 비율 왜곡 없음 |
| Chutes | `assets/images/production/chutes/*.png` | 4개 분류 슈트 | 각 슈트 색상/라벨 구분 가능 |
| Machines | `scanner_gate.png`, `conveyor_tile.png` | 스캐너/컨베이어 연출 | 러시 속도감과 스크롤 표현 |
| Feedback | `stamp_correct.png`, `stamp_wrong.png`, `combo_perfect.png` | 판정 피드백 | 화면 중앙에서 읽힘; wrong stamp는 512x512 고해상도 badge 기준 |
| UI | `assets/images/production/ui/*.png` | HUD/버튼 | 모바일 터치 크기 44px 이상, 겹침 없음 |

## 오디오

| trigger | 파일 | 동작 |
|---|---|---|
| 버튼/시작 | `assets/audio/production/ui/button_click.ogg` | 사용자 제스처 후 재생 |
| 정분류 | `assets/audio/production/sfx/sort_success_ding.ogg` | 성공 보상 |
| 오분류 | `assets/audio/production/sfx/sort_wrong_buzz.ogg` | 실패 경고 |
| 미분류 | `assets/audio/production/sfx/parcel_miss_thud.ogg` | 놓친 택배 충격 |
| 러시 시작 | `assets/audio/production/sfx/rush_warning_alarm.ogg` | 물량 폭주 시작 알림 |
| 게임오버 | `assets/audio/production/sfx/shift_over_jingle.ogg` | 종료 피드백 |
| 게임 중 루프 | `assets/audio/production/music/parcel_factory_loop.ogg` | GameScene에서만 loop, Pause/Home/GameOver에서 중지 |

## 생성 방식

현재 production 이미지 자산은 **Codex `imagegen` 스킬의 built-in image generation 경로**로 만든 시트를 프로젝트 안으로 복사한 뒤, `scripts/integrate_gpt_imagegen_skill_sheets.py`가 각 자산으로 crop/postprocess 해서 런타임 경로에 저장한다. 외부 공통 에셋이나 다른 게임 에셋은 사용하지 않는다.

## GPT Imagegen skill production pipeline

이미지 생성은 `gpt 이미지젠 스킬` built-in mode로 수행한다. 생성 결과는 기본 저장 위치인 `$CODEX_HOME/generated_images/...`에 생기므로, 프로젝트에서 사용할 최종 시트는 반드시 `assets/imagegen/sheets/**`로 복사한 뒤 통합한다. 프로젝트에는 이미지 SDK runner나 외부 인증 대기 스크립트를 두지 않는다.

```bash
# 생성된 imagegen 시트를 프로젝트 전용 raw/runtime asset으로 통합
npm run assets:imagegen:integrate-sheets

# 모든 필수 이미지가 imagegen skill provenance와 파일 품질 조건을 만족하는지 확인
npm run assets:imagegen:verify
```

통합 스크립트는 GPT 원본 crop을 `assets/imagegen/raw/**`에 저장하고, 후처리 결과를 현재 런타임 production 경로인 `assets/images/production/**`에 저장한다. 객체/버튼/패널/피드백 스프라이트는 평면 배경을 border-connected flood-fill alpha mask로 제거한다. 배경은 opaque cover crop으로 1080×1920 이상을 보장한다.

런타임 preload 경로에는 브라우저 캐시 무효화를 위한 query string이 붙을 수 있다. `asset-manifest.json`과 provenance의 `path` 값은 query string을 제외한 실제 파일 경로만 기록하며, verifier도 manifest 기준 파일 경로를 검사한다.

필수 이미지 TASKS는 배경 3종, 플레이어/오퍼레이터 아바타, 택배 4종, 분류함 4종, 컨베이어, 스캐너, 피드백 이펙트 3종, HUD/모달 패널, 주요 버튼을 모두 포함한다. 통합이 성공하면 `assets/asset-manifest.json`의 각 이미지 항목은 다음 provenance를 갖는다.

- `method: codex-gpt-imagegen-skill`
- `sourceSkill: imagegen`
- `source: generated-for-game`
- `generatedFor: parcel-sort-rush`
- `sourceSheet: assets/imagegen/sheets/<sheet>.png`
- `rawPath: assets/imagegen/raw/<asset>.png`
- `promptHash: <current prompt sha256 prefix>`
- `quality: high`

## 고품질 재생성 기준

아래 중 하나라도 보이면 해당 시트는 통합하지 않고 `imagegen` 스킬로 더 강한 프롬프트를 사용해 다시 만든다.

- 배경이 1080×1920보다 작거나 모바일 화면에서 흐림
- 캐릭터/택배/버튼이 찌그러짐, 잘림, 여백 부족
- chroma/회색 배경 잔여물이 런타임에서 박스로 보임
- UI 버튼/패널이 늘어나거나 텍스트/아이콘이 중복됨
- 같은 게임 안에서 스타일·광원·외곽선이 크게 불일치
- Loading/Home/Game/Pause/GameOver 스크린샷에서 겹침 또는 safe-area 위반 발생
