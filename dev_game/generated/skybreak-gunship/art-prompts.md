# Skybreak Gunship — Art Prompt Ledger

생성일: `2026-07-12`  
도구: built-in `image_gen.imagegen`  
후처리: `scripts/process_assets.py`

## 공통 아트 바이블

- premium stylized 3D military-rescue mobile render
- realistic proportions, crisp silhouettes, original IP
- high-oblique gunship camera, portrait 9:19.5
- navy/gunmetal world, cyan friendly, restrained red hostile, amber warning
- no chibi, no toy-like casual render, no baked text, no logo, no watermark
- 배경에는 사람·차량·항공기·드론·총탄·폭발·reticle·UI를 포함하지 않는다.

## Scene-first game artboard

- 파일: `assets/artboards/game.png`
- 원본: `assets/_source/game-artboard-raw.png`
- 프롬프트 핵심: 재난 도심 상공의 건십 시점, 중앙 구조 호송로, 아군 구조 차량과 적 보병·드론·장갑차를 겹치지 않게 분리, 상단 13% HUD·하단 15% 무기 dock 여백, cyan corner reticle, 텍스트 없음.

## 추가 scene-first artboards

| 장면 | 파일 | 핵심 구도 |
|---|---|---|
| Home | `assets/artboards/home.png` | 상단 title-safe 영역, 중앙 hero gunship, 하단 mission/button safe zones |
| Boss | `assets/artboards/boss.png` | bridge extraction, boss/convoy 분리, rotor/pod 약점 구도 |
| Pause | `assets/artboards/pause.png` | dimmed combat, 중앙 단일 tactical panel, resume/abort 영역 |
| Result | `assets/artboards/result.png` | 안전지대 도착, gunship/convoy, rank/stat/button 정렬 |

각 artboard의 원본은 `assets/_source/*-artboard-raw.png`에 보존한다.

## 배경 3종

| ID | 원본 | 런타임 | 프롬프트 핵심 |
|---|---|---|---|
| city-approach | `assets/_source/city-approach-raw.png` | `assets/backgrounds/city-approach.webp` | 맑은 아침, 넓고 비어 있는 미래 도심 진입로, 원거리 교량 |
| city-conflict | `assets/_source/city-conflict-raw.png` | `assets/backgrounds/city-conflict.webp` | 비가 갠 도심 교전 구역, 젖은 아스팔트와 측면 연기, 중앙 통로 보존 |
| bridge-extraction | `assets/_source/bridge-extraction-raw.png` | `assets/backgrounds/bridge-extraction.webp` | blue-hour 교량 철수 지점, 강과 원거리 안전지대, 중앙 교량 deck 보존 |

공통 제약: `maximum portrait resolution`, `environment only`, `unobstructed middle 55%`, `no baked gameplay entities`.

## Core entity source sheet

- 파일: `assets/_source/core-entities-magenta.png`
- 3×2: rifleman / rocketman / attack drone / APC / rescue truck / civilian group
- 배경: pure chroma magenta `#FF00FF`
- 카메라: 일관된 high-oblique 3/4 top-down
- 간격: equal cells, large gutters, full subject, no grid line, no crop
- 출력: `assets/images/*.png`, 768×768 RGBA, bottom-center anchor

## Boss/projectile source sheet

- 파일: `assets/_source/boss-projectiles-magenta.png`
- 3×2: intact boss / damaged boss / missile pod / enemy missile / friendly missile / debris
- 배경·카메라·셀 규칙은 core entity sheet와 동일하다.

## Hero gunship cutout

- 파일: `assets/_source/hero-gunship-magenta.png`
- 출력: `assets/images/hero-gunship.png`
- 프롬프트 핵심: twin-engine armored tilt-wing rescue gunship, navy/gunmetal/white, cyan navigation light, nose upper-right, full silhouette, no readable markings.

## QA 기록

- 처리 리포트: `qa/contact-sheets/asset-processing-report.json`
- 투명 배경 contact sheets:
  - `qa/contact-sheets/core-entities-magenta-processed.png`
  - `qa/contact-sheets/boss-projectiles-magenta-processed.png`
  - `qa/contact-sheets/hero-gunship-processed.png`
- 셀 경계 보정값: `assets/slice-map.json`
