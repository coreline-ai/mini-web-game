# 07 · Regression Checklist — Castle Archer

캡처 리뷰에서 고친 결함의 재현 시나리오. game-polish 세션은 이것부터 재실행할 것.

1. **게임오버 후 디버그 훅**: 게임 진입→방치 ~8초(돌파 3회)→GameOver 전환 후 `window.__CASTLE_DEBUG__.get()` 호출 → throw 없이 `{over:true}` 반환해야 함. (390×844)
2. **크리티컬 판정**: 고블린 수평 중심 ±16% 이내로 조준 발사 → 'CRITICAL +60' 팝 + headshots 증가. 중심에서 빗겨 맞히면 '+30'.
3. **방패병 사이클**: 5번째 스폰마다 shield_goblin 텍스처(1.12배). 1발→'BREAK!'+일반 텍스처 복귀, 2발→처치. 처치/돌파 후 풀 재사용 시 일반 고블린이 방패 텍스처/HP를 물려받지 않아야 함(연속 10+ 스폰 관찰).
4. **성문 HP/회복**: 돌파마다 하트 1개 소등(알파 0.22)+흔들림. 물약 사격 or 접수 시 하트 재점등(최대 3), 만피면 '+50' 팝.
5. **조준 입력**: pointerdown 유지 중 점선 조준선+레티클 표시, 위쪽 반구 클램프(아래로 드래그해도 수평 이하로 안 내려감), pointerup에 화살 1발(쿨다운 170ms), 짧은 탭도 발사.
6. **화살 에셋 파편 회귀**: `assets/items/arrow.png`는 분리 컴포넌트 1개여야 하며, 상단에 궁수/몸통 조각이 없어야 한다. 중앙 상향 발사 캡처에서 화살 bounds가 캔버스 안에 있어야 한다.
7. **러너/브루트 시트 파편 회귀**: `goblin-runner-sheet.png` 각 768px 프레임 왼쪽에 이웃 프레임 방패 조각이 없어야 한다. `orc-brute-sheet.png`는 각 768px 프레임에 방망이/오른팔이 완전히 들어와야 하며 오른쪽 source-alpha padding이 최소 50px 이상이어야 한다.
8. **물약 소스 조각 회귀**: `assets/items/collectible.png`는 1024x1024 transparent no-label potion이어야 하고 alpha component 1개, tiny component 0개여야 한다. 런타임 물약 bounds는 390x844 캔버스 안에 있어야 한다.
9. **조준 레티클 화면 밖 회귀**: 좌하단/우하단으로 과하게 드래그해도 레티클 원 전체가 화면 안쪽에 남아야 한다. 기준 캡처: `04-aim-left-clamped-390x844.png`.
10. **성벽 겹침 회귀**: 적 중심이 성벽 돌파선에 닿으면 즉시 `damageGate()`로 비활성화되어야 하며, 하단 배경의 성벽 블록 위에 적이 계속 서 있으면 안 된다.
11. **에셋 애니메이션 적용 회귀**: 고웨이브 강제 캡처에서 `enemy_runner`, `enemy_shield`, `enemy_brute`가 각각 `enemy_runner_walk`, `enemy_shield_walk`, `enemy_brute_walk` 애니메이션으로 보이는지 확인한다.
12. **고해상도 캔버스 선명도 회귀**: 390x844, deviceScaleFactor 2 캡처에서 Castle Archer canvas backing store가 1080x1920이어야 한다. CSS 표시 크기는 390x693.33 내외이며, 브라우저가 다운스케일해야 한다.
13. **홈 버튼 짤림 회귀**: `play`, `sound`, `settings` 버튼 bounds가 390x844 논리 캔버스 안에 있어야 한다. 기준 bottom gap: play 약 250px, sound/settings 약 163px.
14. **캐릭터 외곽 조각 회귀**: `assets/characters/player.png`의 8개 프레임은 각 프레임당 alpha component 1개, tiny component 0개여야 한다. 발 밑에 분리된 검은 선이 보이면 실패.
15. **물약 외곽 조각 회귀**: `assets/items/collectible.png`는 alpha component 1개, tiny component 0개여야 한다. 별도 먼지/스파클 조각은 pickup 소스가 아니라 FX에서만 표현한다.
16. **전후 크롭 증거 회귀**: 후보정 후 `05-edge-crops-contact-sheet.png`, `edge-metrics.json`, `runtime-samples.json`을 함께 갱신한다. 화면상 개선만 보고 수치 증거를 생략하지 않는다.
17. **UI 소스 패딩 회귀**: `btn-frame`, `icon-sound-on/off`, `btn-pause`, `icon-settings`는 DPR2 표시 기준 최소 source-alpha padding 7px 이상이어야 한다. PLAY 하단, 사운드 오른쪽, pause 상단/오른쪽이 프레임 끝에 붙으면 실패.
18. **몬스터 해상도 회귀**: runtime enemy sheets는 4프레임 `3072x768`, frame size `768x768`이어야 한다. `LoadingScene`도 동일한 `frameWidth/frameHeight=768`로 로드해야 한다.
19. **UI/몬스터 전후 증거 회귀**: 홈 버튼/아이콘, gameplay pause, 몬스터 비교용 `04-hq-asset-contact-sheet.png`, `source-split-metrics.json`, `runtime-asset-fidelity-samples.json`을 같은 세션에서 갱신한다.
20. **HQ 아이콘 버튼 회귀**: PLAY/RESUME/HOME은 `safe_text_button_*` 텍스처를 사용해야 하고, 홈 sound/settings 및 gameplay pause는 regenerated 512x512 PNG button images를 직접 표시해야 한다. 이미지가 없을 때만 procedural frame+symbol fallback을 허용한다.
21. **방패병 소스 조각 회귀**: `goblin-shield-sheet.png`는 각 768 프레임에 방패병 본체 1개만 있어야 하며, 옆 브루트 무기/프레임 조각이 남으면 실패다. 연결 컴포넌트 정리 후 시트 컴포넌트 수는 프레임 4개와 일치해야 한다.
22. **Pause 버튼 눌림 크기 회귀**: gameplay pause 아이콘은 정상 display size 128px, pointerdown display size 약 120.32px이어야 한다. 눌렀을 때 512px 원본 기준으로 커지거나 overlay 진입 전 화면을 덮으면 실패다.
23. **브루트/물약 직접 렌더 증거 회귀**: 브루트와 물약을 같은 Game 씬에 강제 배치한 캡처에서 브루트 방망이 오른쪽 끝과 물약 외곽이 잘리지 않아야 한다. 기준 증거: `04-brute-potion-button-contact-sheet.png`, `asset-fix-metrics.json`, `runtime-brute-potion-button-samples.json`.
24. **런타임 로더 단일 소스 회귀**: `LoadingScene`은 `gameKeys.js`의 `SPRITESHEET_PATHS`, `IMAGE_PATHS`, `AUDIO_PATHS`만 순회해야 하며, `GameScene`이 `arrow` 또는 기타 PNG를 late preload하면 실패다.
25. **SVG 런타임 회귀**: 390x844 DPR2 홈 런타임 샘플에서 `resources`에 `/assets/images/*.svg` 요청이 없어야 하고, Phaser texture keys에도 `svg` 또는 `placeholder` 키가 없어야 한다. 기준 증거: `full-resolution-2026-07-10/asset-fidelity-runtime-sample.json`.
26. **FHD backing-store 회귀**: 390x844 DPR2 캡처에서 canvas backing store가 `1080x1920`이어야 하고, `3240x5760` 같은 DPR 재곱셈 backing store가 나오면 실패다.
27. **Runtime delivery 회귀**: `npm run qa:dist-runtime`은 28개 physical runtime 파일과 21 MiB 이하 payload를 보고해야 한다.
28. **Source 분리 회귀**: standalone `shield-goblin.png`, `runner-goblin.png`, `brute-orc.png`, `_source/**`, scaffold SVG, `audio/README.md`가 `dist`에 있으면 실패다.
29. **Loader/manifest 회귀**: 네 enemy sheet를 포함한 normalized loader URL set이 `dist/runtime-asset-manifest.json`과 정확히 일치해야 한다.
