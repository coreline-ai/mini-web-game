# 03. 고화질 에셋·오디오 제작 계획

## 제작 원칙

모든 런타임 에셋은 `iron-courier-last-line`만을 위해 새로 만든다. 공유/common/root 에셋, 다른 generated 게임 에셋, symlink, 최종용 단순 SVG 플레이스홀더를 사용하지 않는다. 이미지 생성은 Codex `imagegen` 스킬 경로만 사용하며 외부 이미지 SDK·API key·runner를 프로젝트에 추가하지 않는다.

## 비주얼 바이블

### 스타일 키워드

`HD 2D 네오 아케이드`, 선명한 잉크 외곽선, 해양 산업 재질, 과장된 실루엣, 제한된 팔레트, 따뜻한 화재와 차가운 청록 그림자의 대비, 모바일에서 읽히는 중간 크기 디테일.

### 세계 디자인 언어

- 아군: 둥근 모서리, 흰색 구조 표식, 청록 램프, 실용적 방수 장비.
- 적 세력: 날카로운 삼각형, 검붉은 산화금속, 황색 위험등, 조류/갈고리 모티프.
- 보스: 산업 기계의 기능이 공격 예고와 일치해야 한다. 약점은 청록 코어와 맥동 조명으로 통일한다.
- 배경: 캐릭터 영역의 채도·명도 대비를 낮추고, 경고색 주황/노랑은 게임 오브젝트에 양보한다.
- 광원: 화면 좌상단의 차가운 환경광 + 우하단 화재 반사광.
- 외곽선: 캐릭터/적 5~8px@1024 원본, 소품 3~6px, 배경은 외곽선 대비 50% 이하.

### 팔레트

| 용도 | HEX |
|---|---|
| 심해 남색 | `#10263A` |
| 강철 청록 | `#2F7180` |
| 구조대 청록 | `#55D6C2` |
| 방수 크림 | `#E8E2CF` |
| 산화 적갈 | `#7C3030` |
| 적 위험 주황 | `#F08A32` |
| 경고 황색 | `#FFD35A` |
| 화염 적색 | `#E34B35` |
| 코어 백색 | `#F3FFF9` |
| 먹선 | `#10151C` |

색만으로 팀/위험을 구분하지 않는다. 실루엣, 아이콘, 동작 경고를 함께 쓴다.

## Scene-first 제작 순서

먼저 3840×2160 아트보드 7장을 승인한다.

1. Loading — 폭풍 속 항구와 ATLAS-9 실루엣
2. Home — 주인공, 수송차, 원거리 아이언 몰
3. 초기 전투 — 플레이어/기본병/폭발물/터치 UI 합성
4. 장갑차 호위 — 차량 HP, 세 방향 위협, 기술자 효과
5. 보스전 — 아이언 몰 페이즈 2, 약점/경고/HUD
6. Pause — 전투가 흐려진 배경 위 패널
7. Result — 구조·차량·점수 정보 위계

승인 기준: 1280×720 축소 및 844×390 크롭에서 플레이어·적·탄·위험 마커가 구분되고, HUD/터치 안전영역이 확보되며, 배경이 gameplay를 덮지 않아야 한다.

## 에셋 우선순위

| 우선 | 영역 | 제작 비중 | 승인 조건 |
|---:|---|---:|---|
| P0 | scene artboards·플레이어 기준 5포즈 | 15% | 캐릭터 정체성과 전체 화면 대비 잠금 |
| P0 | 플레이어 애니메이션 | 22% | 셀/기준선/루트 고정, 모바일 가독성 |
| P0 | 4종 적·탄·경고 | 16% | 실루엣으로 역할 판별 |
| P0 | 3구간×3 배경과 지형 | 17% | 1280×720 이상, parallax 재조합 가능 |
| P0 | 미니보스·최종보스 파츠 | 18% | 내부 면이 차고 부위 연결이 자연스러움 |
| P1 | VFX·파괴 상태 | 8% | 판정과 경고를 가리지 않음 |
| P1 | HUD·터치 UI | 4% | 9-slice/정비율, 텍스트 미포함 |

## 전체 이미지 목록과 해상도

### 배경/환경

| 구간 | Far | Mid | Near | Terrain/Props |
|---|---|---|---|---|
| 해안 진입 | 폭풍하늘·바다 3840×2160 | 방파제·도시 4096×1536 | 철망·물보라 2048×1024 alpha | 콘크리트 8모듈, 부표/상자 10종 |
| 컨테이너/창고/호위 | 하늘·크레인군 3840×2160 | 창고·선박 4096×1536 | 케이블·연기 2048×1024 alpha | 플랫폼 12모듈, 컨테이너/표지 14종 |
| 교량/보스 | 화재도시 3840×2160 | 교량·레일 4096×1536 | 불꽃·강재 2048×1024 alpha | 교량 10모듈, 잔해/레일 12종 |

런타임 배경은 최소 1280×720 이상 WebP/JPEG. 반복 가능한 긴 레이어는 이음새를 QA하고, 투명 불필요 이미지에는 alpha를 제거한다.

파괴물: 연료통 3상태, container lock 2상태, crane part 3상태, bridge joint 3상태, enemy power cell 3상태. 각 512~1024px 원본, 런타임 256~512px.

### 플레이어

- 승인 reference: 2048×2048 이상, 우측 완전 측면.
- 프레임 원본: 1024×1024 transparent PNG.
- 런타임 가상 셀: 512×512, 발 사이 중점 root, 동일 baseline.
- 표시 높이: 180~230px@1280×720.

| 동작 | 프레임 | 루프 |
|---|---:|---|
| idle | 6 | 8fps loop |
| run | 8 | 12fps loop |
| jump | 3 | hold last |
| fall | 2 | 6fps loop |
| crouch | 2 | hold |
| shoot forward | 4 | 16fps one-shot/overlay |
| shoot diagonal | 4 | 16fps one-shot/overlay |
| shoot up | 4 | 16fps one-shot/overlay |
| grenade | 6 | 12fps one-shot |
| melee | 6 | 18fps one-shot |
| hurt | 3 | 12fps one-shot |
| death | 10 | 12fps one-shot |

총구 화염·그림자·탄피는 플레이어 프레임에 굽지 않고 별도 에셋으로 둔다.

### 일반 적

| 적 | 원본/런타임 | 필수 상태 | 예상 프레임 |
|---|---|---|---:|
| 조류 약탈병 | 1024/512 셀 | idle, run, aim, burst, hurt, death | 28~34 |
| 방벽 집행병 | 1024/512 셀 | march, guard, bash, stagger, death | 24~30 |
| 곡사 폭파병 | 1024/512 셀 | idle, move, windup, throw, hurt, death | 24~30 |
| 해리어 드론 | 1024/512 셀 | hover, bank, fire, hurt, explode | 16~22 |

### 보스 파츠

크레인 센티널: `body`, `boom`, `claw`, `turret`, `weakCore`, cable, cargo 3종, damage overlay 2단계. 본체 2048px, 부위 1024px 이상.

아이언 몰: `chassis`, `drill`, `turret`, `missilePod`, `core`, `armorFront`, `armorRear`, wheel/track, phase-2 heat overlay, phase-3 rupture overlay, destroyed variant. 차체 3072px, 부위 1024~2048px. 투명 파츠는 내부 면이 비지 않아야 하고 pivot/attachment 좌표를 manifest metadata에 기록한다.

### VFX

| 효과 | 변형/프레임 | 런타임 권장 |
|---|---|---|
| 총구 화염 | 소·중·대 × 4 | 256px |
| 일반/장갑 스파크 | 각 6 | 256px |
| 폭발 | 소·중·대 × 8 | 512px |
| 연기/화염 | 각 10~12 | 512px |
| 먼지/탄피 | 6 / 4 | 256px |
| 코어 에너지 | 12 | 512px |
| 구조 성공 | 8 | 512px |
| 공격 경고 | 원형·선형·낙하 | 512px, 투명 |

### UI

shoot/jump/grenade/pause 버튼, joystick base/knob, rifle/shotgun/rocket/grenade 아이콘, HP frame/fill, boss HP, escort HP, rescue icon 3종, ammo plate, result panel, retry/home buttons. 원본 512~1024px, 런타임 128~512px. 텍스트와 숫자는 이미지에 굽지 않는다. 패널은 9-slice margin을 기록한다.

## 이미지 생성 프롬프트 계약

### 공통 스타일 블록

```text
Original production asset for Armored Courier: Last Line, an HD 2D neo-arcade
side-scrolling rescue action game. Crisp consistent ink outline, strong readable
silhouette, restrained navy/teal/rust/orange palette, cool upper-left ambient
light and warm lower-right fire bounce, functional maritime-industrial design,
mobile-game readability, clean high-resolution edges. No resemblance to any
existing game character, vehicle, faction, logo, UI or sprite. No words, letters,
numbers, logo, watermark, border, mockup frame or unrelated object.
```

### 캐릭터 프레임 블록

```text
Use the approved same-character reference. Produce only frame {N} of {ACTION},
perfect right-facing orthographic side view, identical face, hair, waterproof
cream jacket, teal rescue harness, gloves, boots, ARC-7 weapon, body proportions,
outline, rendering density and lighting. Full body within 8 percent safe padding,
feet on the same baseline, root at midpoint between feet, 1024x1024 transparent
canvas. No floor, shadow, muzzle flash, smoke, UI or text. Do not crop any weapon
or body part.
```

### 배경 블록

```text
3840x2160 or larger seamless-feeling side-scrolling background layer for a storm-
damaged maritime industrial city. Layer: {FAR|MID|NEAR}, zone: {ZONE}. Reserve the
lower gameplay band for high character contrast. No characters, enemies, bullets,
UI, text or implied collision platforms. Straight edges, no blur, no fisheye.
```

### 보스 파츠 블록

```text
Separate opaque mechanical part {PART} of the original Iron Mole drilling train,
strict side view, function readable at mobile size, connection edges and pivot
clear, solid filled internal faces, 10 percent transparent padding. No hollow or
see-through machinery, no background, ground, shadow, explosion, UI or text.
```

## 캐릭터 일관성 게이트

대량 생성 전에 side idle, run contact, forward shoot, jump apex, hurt 5포즈를 승인한다. 얼굴, 머리, 피부, 의상, 장갑, 신발, harness, 무기, 비율, 팔레트, 외곽선, 광원이 모두 같아야 한다. 다중 프레임에서 흔들리면 한 장씩 생성한다.

## 투명화·정리 절차

1. 원본을 `assets/source/raw`에 무손실 보관.
2. 배경 제거/edge decontamination 후 `source/cleaned`에 보관.
3. alpha bbox, 내부 투명 hole, 색 번짐을 자동/육안 검사.
4. 동일 512×512 가상 셀 중앙, 공통 baseline/root로 위치만 정렬.
5. 런타임 크기로 Lanczos 축소 후 outline/얼굴 가독성 확인.
6. 4096×4096 이하 atlas와 JSON frame metadata 생성.
7. runtime screenshot에서 재검수 후 manifest status를 `approved`로 변경.

완성 프레임의 문제점이 간격/기준선뿐이면 재생성하지 않고 **이동만** 한다. 크기, 포즈, 순서, 색, 형태, timing은 바꾸지 않는다. 흐림, 잘림, identity drift, 잘못된 시점, 내부 면 소실은 재생성한다.

## 저장 구조

```text
assets/artboards/
assets/source/{style,raw,cleaned,character-references,animation-frames}/
assets/runtime/backgrounds/
assets/runtime/characters/{player,enemies,bosses}/
assets/runtime/{environment,weapons,vfx,ui,atlases}/
assets/qa/{contact-sheets,alpha-reports,runtime-captures}/
assets/asset-plan.json
assets/asset-manifest.json
```

## Manifest 계약

최상위 필수값:

```json
{
  "gameId": "iron-courier-last-line",
  "qualityTier": "production-demo",
  "assetIsolation": {
    "mode": "per-game",
    "generatedFor": "iron-courier-last-line",
    "noSharedRuntimeAssets": true
  }
}
```

모든 image/audio/background entry 필수값:

```json
{
  "id": "stable-role-id",
  "path": "assets/runtime/...",
  "quality": "production-demo",
  "provenance": {
    "source": "generated-for-game",
    "generatedFor": "iron-courier-last-line",
    "method": "codex-gpt-imagegen-skill",
    "model": "gpt 이미지젠 스킬",
    "sourceSkill": "imagegen",
    "promptHash": "sha256:..."
  },
  "sourceSize": { "width": 1024, "height": 1024 },
  "runtimeSize": { "width": 512, "height": 512 },
  "alpha": true,
  "status": "approved"
}
```

오디오 entry의 method는 실제 게임 전용 제작 경로를 기록하되 `source`와 `generatedFor`는 동일하게 유지한다.

## 이미지 QA

- 배경은 캔버스 이상, 비율 왜곡·검은 박스·이음새 없음.
- 투명 스프라이트 6~10% padding, 잘린 body/weapon 0건.
- 내부 alpha hole: 차량/보스/소품의 의도치 않은 빈 면 0건.
- character identity 5포즈 승인 후 전체 확장.
- 모든 셀 동일 크기, baseline/root 고정, 프레임 간 불투명 픽셀 비접촉.
- 모바일 실제 화면에서 적 4종을 색 없이 실루엣으로 판별.
- 폭발 중에도 적탄·낙하 마커·보스 코어가 보임.
- UI 버튼은 정비율/9-slice이고 텍스트 중복·회색 slot line 없음.
- 1280×720에서 원본보다 과확대되는 gameplay 에셋 0건.

## 오디오 목록과 트리거

| ID군 | 수량 | 트리거/규칙 |
|---|---:|---|
| rifle-01..03 | 3 | 발사마다 무작위, 동일 voice 최대 4 |
| shotgun | 1+tail | 발사, tail은 ambience duck |
| rocket-launch | 1 | 발사 |
| grenade-throw | 1 | 투척 |
| explosion-small/medium/large | 각 2 variant | 폭발 크기, 동시 voice 6 |
| enemy-hit/armor-hit/player-hit | 각 2 | DamageSystem event |
| footsteps | 표면별 3 | run animation contact frame |
| rescue-success | 3 motif | rescue type별 layer 추가 |
| escort-engine/damage/critical | 3 loop/event | 호위 active/피격/25% 이하 |
| boss-intro/attack/phase/death | 8+ | BossPhaseSystem event |
| ui-focus/confirm/warn | 3 | UI action |
| home-bgm | 1 loop | Home only |
| stage-bgm | 1 loop+stems | Game, boss 전까지 |
| boss-bgm | 1 loop+3 intensity | 각 phase stem 전환 |
| result-music | win sting+loop | Result |
| harbor-ambience | 1 loop | Game zone, pause 동기화 |

오디오 목표: 48kHz 원본, 런타임 OGG 우선 + 브라우저 호환 fallback. 음악 -14~-12 LUFS, SFX peak -1dBFS 이하. BGM은 gameplay에서만, pause/blur/home에서 pause/stop. 중요 경고는 BGM duck 2~4dB와 함께 재생한다.

## 최종 승인 체크

`factory:image-quality-qa`, `factory:scene-composite-qa`, 실제 화면 capture 검사를 모두 통과하기 전 에셋을 완료로 표시하지 않는다. 아트보드와 runtime 재합성이 다르거나 AI 결함을 코드/필터로 숨긴 경우 승인하지 않는다.
