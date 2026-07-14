# 03 · Asset & Audio Plan — Firebreak Commander

## Scene-first 방향

Premium stylized tactical wildfire diorama. 중앙 10x15 playfield의 명암과 디테일을 낮추고 산맥, 관제 텐트, 연기층은 외곽과 원경에 배치합니다.

필수 artboard:

```text
assets/artboards/home.png
assets/artboards/game.png
assets/artboards/pause.png
assets/artboards/gameover.png
assets/artboards/slice-map.json
assets/qa/contact-sheets/*.png
```

## 고해상도 규격

해상도와 패딩 숫자의 authoritative source는 `dev_game/docs/production-demo-quality-contract.md`의 **공통 고해상도 에셋 규격**입니다. Firebreak는 배경/아트보드 2160x3840, 주요 유닛·목표 1024px 이상, UI/FX 512px 이상을 충족합니다. 일반 유닛·목표·상태 아이콘은 10% 가상 셀 패딩, 회전 풍향 및 강한 fire/water/smoke FX는 manifest에 기록된 최대 12% 예외를 사용합니다.

## 소유권

- Background-owned: 원경 산맥, 하늘, 비기능성 연기층
- Runtime-owned: terrain, 화재, 방화선, 목표물, 헬기, 소방차, 위험 예고
- UI-owned: HUD, 바람, 자원, 목표 내구도, 명령 버튼, runtime text

배경에 실제 화재·목표·유닛을 굽거나 이미지에 한글·숫자·버튼 문구를 넣지 않습니다.

## 전용 오디오

`home_ambient`, `fireline_gameplay_loop`, `ui_click`, `draw_firebreak`, `water_drop`, `truck_deploy`, `fire_ignite`, `fire_extinguish`, `wind_shift`, `objective_warning`, `stage_clear`, `game_over`를 게임 전용으로 제작합니다.

## 완료된 제작 파이프라인

- built-in imagegen 원본은 941x1672이며 `assets/_source`에 그대로 보존합니다.
- 배경은 Lanczos fit, 제한적 Gaussian cleanup, broad-edge contrast 보존 후 2160x3840 WebP로 제작했습니다. 이를 native 생성으로 표기하지 않습니다.
- 3x2 object/FX source sheet에서 equal-cell crop, chroma 제거, despill, connected-component 정리, 일반 오브젝트 10%, 강한 FX 12% 예외 패딩을 적용했습니다.
- `art-prompts.md`와 `assets/asset-manifest.json`에 prompt, rawPath, raw dimensions, cropBox, postprocess를 기록했습니다.
- 12개 WAV는 `scripts/generate_audio.py`로 게임 전용 합성했으며 manifest에 SHA-256을 보존합니다.
- Home/Game/Pause/GameOver 2160x3840 artboard와 runtime 9-state contact sheet를 생성했습니다.
