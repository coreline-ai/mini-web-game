# 07 · Regression Checklist — Jungle Arc Shot

1. **탄도 일치**: 드래그 중 점선 미리보기와 실제 화살 궤적이 동일 물리(중력 950+바람) — 바람 라운드(R2+)에서 미리보기 따라 쏘면 명중해야 함.
2. **관통 콤보**: 세로로 정렬된 과일 2개+ 를 관통하는 각도로 발사 → 화살이 멈추지 않고 'PIERCE x2 +80' 등 배수 팝, pierceBest 갱신.
3. **화살 경제 패배**: 표적 없는 곳으로 전 화살 소진 + 비행 화살 소멸 후 → 게임오버(reason arrows). 비행 중에는 게임오버 안 됨.
4. **새총 입력**: 아래로 당길수록 멀리(위쪽 반구 강제), 릴리즈에 1발(쿨다운 200ms), 화살 0이면 발사 거부. 발사 후 고무줄/미리보기 소거.
5. **바람 교대**: R2 → R3에서 WIND 방향 화살표 반대 + 세기 증가, aim.wind 값과 HUD 일치.
6. **훅 안전**: 게임오버 후 __JUNGLE_DEBUG__.get() throw 없이 {over:true, reason} 반환.
7. **HQ 에셋/1080 캔버스**: `390×844` DPR2 캡처에서 Phaser config와 canvas backing store가 `1080×1920`, camera zoom이 `1`이어야 하며, player frame `736×736`, `fruit`=`768×768`, `balloon`=`512×768`, `arrow`=`512×1024`, `ui_pause`=`512×512`이어야 한다.
8. **아이콘/버튼 클리핑**: Home/Game/Pause 캡처에서 pause·sound·home·retry 아이콘 알파 bbox가 source edge에 닿지 않고, pause 버튼 runtime bounds가 화면 밖으로 나가지 않는다.
9. **입력 견고성**: PLAY/RESUME/HOME/RETRY 텍스트 버튼은 더블/트리플 탭에도 한 번만 상태 전이를 발화하고, pause 아이콘은 누른 뒤 `56×56`으로 복원되며 누적 확대/고착이 없어야 한다.
10. **1080 안전 영역 매핑**: `390×844`, `430×932`, `1080×1920` 뷰포트에서 Home/Game/Pause 주요 UI의 `outOfViewportLayoutItems`가 0이어야 하며, `sourceFrameSize >= renderedWorldSize`가 player/fruit/balloon/arrow/pause icon에 대해 모두 참이어야 한다.
11. **데스크톱 모바일 셸**: `1280×900` 같은 가로형 데스크톱 뷰포트에서 `#game`은 전체 창 폭을 먹지 않고 중앙 모바일 스테이지로 제한되어야 한다. 기준: `#game.width <= 430`, 수평 중앙 정렬, 모바일 `390×844`에서는 `#game.width === viewport.width`.
12. **Scale.FIT 회귀**: `390×844` DPR2 홈 런타임 샘플에서 canvas CSS rect가 viewport 안에 있어야 한다. `scaleMode: "cover"`로 돌아가 `x < 0` 또는 `x + width > viewport.width`가 되면 실패다.
13. **런타임 로더 단일 소스 회귀**: `LoadingScene`은 `gameKeys.js`의 `SPRITESHEET_PATHS`, `IMAGE_PATHS`, `AUDIO_PATHS`만 순회해야 하며, `GameScene`이 `fruit`, `balloon`, `arrow` 또는 기타 PNG를 late preload하면 실패다.
14. **SVG/placeholder 런타임 회귀**: 홈 런타임 샘플에서 `/assets/images/*.svg` 요청이 없어야 하고, Phaser texture keys에 `svg` 또는 `placeholder` 키가 없어야 한다. `asset-manifest.json` runtime image formats에는 `svg`가 없어야 한다.
15. **runtime allowlist 무결성**: loader 22 refs/20 unique path와 manifest runtime 20개가 일치하고 `delivery` 누락이 0이어야 한다. `_source` 6개, README, scaffold SVG 3개는 source-only이며 dist에 포함되면 실패다.
16. **dist 재현성/예산**: `npm run build && npm run qa:dist-runtime`이 통과하고 runtime asset 합계가 `11,288,427 / 12,582,912` bytes 이하이며 source/dist SHA-256이 모두 일치해야 한다.
17. **stage-3 HQ 및 불변 범위**: stage-3은 1080×1920, edge 172.5, HF 1.46, 1,876,418 bytes여야 한다. stage-1 SHA `3d39a59f...5787`, stage-2 SHA `48f3591e...040e`, `src/**`, `_source/**`는 이 polish에서 불변이어야 한다.
