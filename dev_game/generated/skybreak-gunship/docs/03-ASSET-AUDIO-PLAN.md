# 03 · Asset & Audio Plan — Skybreak Gunship

## Art direction

premium stylized 3D military-rescue render, realistic proportions, high-oblique gunship camera. Navy/gunmetal environment, cyan friendly, restrained red hostile, amber warning. Chibi·toy-like casual render·baked text는 사용하지 않는다.

## Ownership

- 배경: 도시/도로/교량/건물/원경 연기만 소유.
- runtime: 적, convoy, 민간인, 보스, projectile, reticle, marker, FX, 모든 텍스트.
- 동일 논리 엔티티를 배경과 runtime에 중복 배치하지 않는다.

## Delivered high-resolution art

- Game artboard: `assets/artboards/game.png`
- Backgrounds: `city-approach.webp`, `city-conflict.webp`, `bridge-extraction.webp`, 모두 1440×3120.
- Runtime sprites: rifleman, rocketman, drone, APC, rescue truck, civilians, intact/damaged boss, missiles, debris. 표준 source canvas 768×768 RGBA.
- Home hero: `assets/images/hero-gunship.png`.

## Pipeline and evidence

- raw output: `assets/_source/`
- prompt ledger: `art-prompts.md`
- slice provenance: `assets/slice-map.json`
- hash/dimension manifest: `assets/asset-manifest.json`
- processing: `scripts/process_assets.py`, `scripts/build_asset_manifest.py`
- contact sheets/report: `qa/contact-sheets/`

## UI

HUD와 button panel은 Phaser Graphics로 렌더링한다. hostile diamond, friendly shield, civilian ring은 색상과 실루엣을 동시에 달리한다. 이미지에 UI 문구를 굽지 않는다.

## Audio status

`scripts/generate_audio.py`로 게임 전용 22.05kHz mono WAV를 결정적으로 생성한다. 30mm loop, overheat/ready, missile lock/complete/launch, metal impact, small/large explosion, convoy/civilian warning, boss phase, mission clear/fail과 Home·mission·rotor·boss 4개 layer를 분리했다. 기관포는 전역 loop handle 1개, music/rotor/boss도 slot별 handle 1개만 유지한다. foundation 기본음은 호환성 파일로만 남고 runtime에서는 전용 파일을 사용한다.
