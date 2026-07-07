# 07 · Regression Checklist — Castle Archer

캡처 리뷰에서 고친 결함의 재현 시나리오. game-polish 세션은 이것부터 재실행할 것.

1. **게임오버 후 디버그 훅**: 게임 진입→방치 ~8초(돌파 3회)→GameOver 전환 후 `window.__CASTLE_DEBUG__.get()` 호출 → throw 없이 `{over:true}` 반환해야 함. (390×844)
2. **크리티컬 판정**: 고블린 수평 중심 ±16% 이내로 조준 발사 → 'CRITICAL +60' 팝 + headshots 증가. 중심에서 빗겨 맞히면 '+30'.
3. **방패병 사이클**: 5번째 스폰마다 shield_goblin 텍스처(1.12배). 1발→'BREAK!'+일반 텍스처 복귀, 2발→처치. 처치/돌파 후 풀 재사용 시 일반 고블린이 방패 텍스처/HP를 물려받지 않아야 함(연속 10+ 스폰 관찰).
4. **성문 HP/회복**: 돌파마다 하트 1개 소등(알파 0.22)+흔들림. 물약 사격 or 접수 시 하트 재점등(최대 3), 만피면 '+50' 팝.
5. **조준 입력**: pointerdown 유지 중 점선 조준선+레티클 표시, 위쪽 반구 클램프(아래로 드래그해도 수평 이하로 안 내려감), pointerup에 화살 1발(쿨다운 170ms), 짧은 탭도 발사.
6. **화살 에셋 파편 회귀**: `assets/items/arrow.png`는 분리 컴포넌트 1개여야 하며, 상단에 궁수/몸통 조각이 없어야 한다. 중앙 상향 발사 캡처에서 화살 bounds가 캔버스 안에 있어야 한다.
7. **러너/브루트 시트 파편 회귀**: `goblin-runner-sheet.png` 각 256px 프레임 왼쪽에 이웃 프레임 방패 조각이 없어야 하고, `orc-brute-sheet.png` 각 프레임 하단에 분홍/마젠타 스트립이 없어야 한다.
8. **물약 소스 조각 회귀**: `assets/items/collectible.png` 왼쪽 외곽에 별도 초록색 소스 슬리버가 없어야 한다. 런타임 물약 bounds는 390x844 캔버스 안에 있어야 한다.
9. **조준 레티클 화면 밖 회귀**: 좌하단/우하단으로 과하게 드래그해도 레티클 원 전체가 화면 안쪽에 남아야 한다. 기준 캡처: `04-aim-left-clamped-390x844.png`.
10. **성벽 겹침 회귀**: 적 중심이 성벽 돌파선에 닿으면 즉시 `damageGate()`로 비활성화되어야 하며, 하단 배경의 성벽 블록 위에 적이 계속 서 있으면 안 된다.
11. **에셋 애니메이션 적용 회귀**: 고웨이브 강제 캡처에서 `enemy_runner`, `enemy_shield`, `enemy_brute`가 각각 `enemy_runner_walk`, `enemy_shield_walk`, `enemy_brute_walk` 애니메이션으로 보이는지 확인한다.
12. **DPR2 외곽 선명도 회귀**: 390x844, deviceScaleFactor 2 캡처에서 canvas backing store가 780x1688이어야 한다. CSS 크기는 390x844, `ratioX=2`, `ratioY=2`.
13. **홈 버튼 짤림 회귀**: `play`, `sound`, `settings` 버튼 bounds가 390x844 논리 캔버스 안에 있어야 한다. 기준 bottom gap: play 약 250px, sound/settings 약 163px.
14. **캐릭터 외곽 조각 회귀**: `assets/characters/player.png`의 8개 프레임은 각 프레임당 alpha component 1개, tiny component 0개여야 한다. 발 밑에 분리된 검은 선이 보이면 실패.
15. **물약 외곽 조각 회귀**: `assets/items/collectible.png`는 alpha component 1개, tiny component 0개여야 한다. 별도 먼지/스파클 조각은 pickup 소스가 아니라 FX에서만 표현한다.
16. **전후 크롭 증거 회귀**: 후보정 후 `05-edge-crops-contact-sheet.png`, `edge-metrics.json`, `runtime-samples.json`을 함께 갱신한다. 화면상 개선만 보고 수치 증거를 생략하지 않는다.
