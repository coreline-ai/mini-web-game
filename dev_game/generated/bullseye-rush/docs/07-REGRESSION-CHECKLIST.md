# 07 · Regression Checklist — Bullseye Rush

1. **타이밍 명중**: aimX가 과녁 중심 ±10px일 때 탭 → 명중. 중심 34% 이내면 'BULLSEYE xN' 팝+콤보 증가, 밖이면 '+30'+콤보 리셋.
2. **라운드 전환**: 모든 과녁 파괴 → 'CLEAR +bonus' → 0.7s 후 ROUND N+1 배너(배너 중 발사 잠금 locked=true → 해제).
3. **미스 3 실패**: 과녁 없는 지점으로 3발 → MISS 카운트 3/3 → 게임오버(reason misses). 씬 종료 후 __BULLSEYE_DEBUG__.get() throw 없음.
4. **화살 소진 실패**: 화살 0 + 공중 화살 소멸 + 과녁 잔존 → 게임오버(reason arrows). 화살 0일 때 탭해도 발사 안 됨.
5. **보너스 별**: R3+ 확률 등장, 명중 시 '+1 ARROW'+ARROWS 증가.
6. **manifest 무결성**: asset-manifest.json에 hazard/collectible 만료 엔트리 없음, qualityTier production-demo (아트 재실행 후에도).
7. **Native-FHD 캔버스**: `game.config.width/height`와 canvas backing store가 1080×1920이고, 1080×1920 viewport에서 CSS canvas도 1080×1920으로 1:1 표시됨.
8. **에셋 업스케일 금지**: 플레이어 512×512 프레임은 렌더 크기 277×277 이상으로 확대되지 않고, 타깃 1024×1024 소스는 렌더 크기 약 294×294 이상으로 확대되지 않음.
9. **투명 외곽 품질**: `target.png`는 magenta/purple alpha residue 0이어야 하고, `player.png`는 low-alpha dirty matte 제거 후 브라우저 캡처에서 외곽 색 번짐이 없어야 함.
10. **데스크톱 모바일 셸**: 1280×900 같은 landscape desktop viewport에서 `#game`은 중앙 9:16 프레임(폭 약 430px)으로 표시되고 전체 화면으로 늘어나지 않음.
11. **외부 blur 배경**: 390×844 letterbox 여백과 1280×900 desktop 외부 영역에는 `stage-1.png` 기반 blur/saturate/brightness 배경이 보이고, canvas는 z-index 1로 그 위에 표시됨.
12. **극단 조준 캐릭터 클립 방지**: aimX를 오른쪽 최댓값으로 강제해도 플레이어 bounds가 0~1080 캔버스 안에 있고 `playerClipPass=true`여야 함.
13. **runtime SVG placeholder 금지**: Home까지 부팅한 브라우저 sample에서 `images/hazard.svg`, `images/collectible.svg`, `images/player.svg` resource load가 0이고, Phaser texture keys에 `hazard` / `collectible` scaffold key가 없어야 함.
14. **LoadingScene production preload**: `target`, `star`, `arrow`, `bg_0`, `bg_1`, `bg_2`, `ui_frame`, `ui_pause`, `fx_hit`, `fx_collect`가 Home 진입 전에 로드되어야 하며 `GameScene.preload()`에 scene-local image loads가 없어야 함.
15. **player spritesheet crop safety**: `assets/characters/player.png`의 4개 512×512 frame이 각각 최소 32px 좌우 padding과 43px 이상 상단 padding을 유지해야 하며 `factory:image-quality-qa`가 crop-edge 오류 없이 통과해야 함.
