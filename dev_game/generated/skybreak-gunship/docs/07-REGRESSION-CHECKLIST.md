# 07 · Regression Checklist — Skybreak Gunship

## 최우선 재현 시나리오

### R-FIRST · 첫 플레이가 실제 게임 행동을 가르치는가

- 시작 조건: localStorage clear, 390×844 DPR2
- Home: `게임 시작`, 구조차 보호·민간인 금지·보스 격추, 3단계 실전 훈련 문구가 보임
- Briefing: 빨간 마름모/하늘색 방패/흰 구조 원과 정확한 버튼 조작이 한국어로 보임
- Step 1: 전장 drag로 조준점을 적 위에 놓아야 다음 단계 진행
- Step 2: 실제 30MM 기관포 hold로 적을 제거해야 다음 단계 진행
- Step 3: 실제 미사일 hold 650ms 이상 후 release해야 완료
- 훈련 중: `elapsed === 0`
- 완료 후: `elapsed > 0`, score 0, combo 1, heat 0, ammo 4, tutorial 저장값 1
- 자동화: `GAME_QA_URL=http://127.0.0.1:5187 node qa/clarity-qa.mjs`
- 수동 재훈련 URL: `http://127.0.0.1:5187/?training=1`

### R-00 · 잘못된 개발 서버/포트

- 실행: `npm run dev`
- 기대 주소: `http://127.0.0.1:5187`
- 기대: 5187 listener의 cwd가 `skybreak-gunship`, 다른 프로젝트 포트를 사용하지 않음
- 실제 브라우저 확인: Home → Briefing → Game 진입, browserErrors 0

### R-01 · 재시도 후 죽은 Text 참조

- 경로: Home → Briefing → Game → Pause → Home을 6회 반복
- 조건: 각 Game run에서 20초 가속, 첫 run에 tracer 1,000회
- 기대: 두 번째 이상 Game 진입 성공, `pageerror` 0
- 계측: scene stack 1, BGM/rotor 각각 1 이하, tracer pool 16, missile pool 4 이하
- 자동화: `npm run test:lifecycle`

### R-02 · 빠른 장면 전환 Canvas 경합

- 경로: Home의 MISSION BRIEFING과 Briefing의 LAUNCH를 준비 즉시 입력
- 기대: `drawImage` null 오류 없음, Game layout publish 성공
- 관련 수정: scene transition 32ms defer, scene display object 이중 파괴 금지

### R-03 · 기관포 release 누락

- 입력: GUN rapid down/up, pointerout, Pause
- 기대: `gunHeld=false`, 추가 shot 0, gun loop 0 또는 pause 상태
- 자동화: `qa/input-hostility-qa.mjs`, `qa/combat-systems-qa.mjs`

### R-04 · 미사일 lock 경계

- 649ms release: ammo 변화 없음
- 650ms 이상 release: ammo 정확히 1 감소
- ammo 0: lock 시작/발사 없음
- 민간인/아군/cover 대상: lock 후보 아님

### R-05 · 엄폐 보병

- 상태: expose → aim → fire → cover
- 기대: cover에서 marker 숨김, alpha 감소, `getTargetAt(..., true) === null`
- 로켓병 fire: convoy damage attack payload 1회

### R-06 · 장갑차 부위 파괴

- 포탑 HP 0: 이후 공격 없음
- 엔진 HP 0: 이동 속도 40%
- 차륜 HP 0: 이동 정지
- 부위 파괴 점수: +250

### R-07 · 보스 3페이즈

- HP 비율 >67%, 34~67%, <34%에서 phase 1/2/3
- phase 2/3: damaged texture, 공격 간격 단축
- pod HP 0: missile payload 재발생 없음
- rotor HP 0: 1.2초 stun과 피해 창

### R-08 · 세션/오디오 연속성

- Home → Briefing → Game → Pause → Home 3회
- 기대: active scene Home 1개, gameplay BGM 0, 최대 BGM instance 1
- corrupted `skybreak-gunship_settings`: 기본값 복구
- 자동화: `qa/session-continuity-qa.mjs`

### R-09 · Approach 초반 적 위협 인지

- 시작 조건: `?skipTutorial=1`, 390×844, Game 진입
- 기대: mission elapsed 1.5초 전후에 첫 rifleman과 red-diamond marker가 보이고 `HOSTILE CONTACT` 경고는 한 번만 표시됨
- 계측: `window.__SKYBREAK_QA__.activeTargets`에 hostile target 존재, `scene.firstHostileCueShown === true`
- 회귀 금지: tutorial 전용 target(`at=-1`)은 첫 hostile cue를 소비하지 않음

### R-10 · Coach 후속 메시지 one-shot

- 시작 조건: 첫 실행 tutorial 또는 `?training=1`, Game 재진입/Retry 반복
- 기대: tutorial 중 coach timer가 예약되지 않고, 완료 후 coach follow-up timer가 최대 1개만 존재하며 shutdown 시 제거됨
- 회귀 금지: 6회 lifecycle에서 timer/tween/BGM 단조 증가 없음

### R-11 · Home mission panel 하단 여백

- 시작 조건: Home, 390×844 DPR2
- 기대: `90초 작전 · 구조차 보호 · 민간인 금지 · 보스 격추` 설명 아래 여백이 panel 상단의 내부 여백과 시각적으로 균형을 이룸
- 계측: panel `336x88 @ y507`, description y527, panel bottom 551
- 증거: `qa-captures/polish-04-home-spacing.png`

### R-12 · 플레이어 건십과 무기 발사 실체

- 시작 조건: `?skipTutorial=1`, Game, 390×844 DPR2
- 기대: 전장 상단에 `hero_gunship`이 보이고, 기관포는 건십 chin-gun에서 주황색 ballistic streak와 muzzle flash를 생성함
- 기대: 유도 미사일은 건십 missile rack에서 실제 missile sprite와 cyan launch flash/trail을 생성함
- 오디오: 무기 버튼 down에서 audio unlock, gun loop와 missile launch SFX가 입력과 함께 재생됨
- 증거: `qa-captures/polish-04-game-gunship.png`, `polish-04-gun-fire.png`, `polish-04-missile-fire.png`

### R-13 · 보병 엄폐 시각

- 시작 조건: Game에서 rifleman이 expose→aim→fire→cover로 전이
- 기대: cover에서 marker는 숨지만 soldier sprite가 유지되고, 하단 barricade silhouette만 표시되며 큰 에너지 사각형으로 대체되지 않음
- 계측: `state=cover`, `exposed=false`, `sprite.alpha=0.84`
- 증거: `qa-captures/polish-04-soldier-cover.png`

## 화면 회귀

- [x] 390×844 DPR2 contact sheet에서 HUD·무기 dock overlap 0
- [x] 430×932 DPR3 contact sheet에서 safe-area 이탈 0
- [x] 1080×1920 DPR1 contact sheet에서 canvas 중심과 backing scale 정상
- [x] hostile diamond, friendly shield, civilian rescue ring 형태가 구분됨
- [x] tracer/missile/폭발이 HUD 앞을 가리지 않음
- [x] gunship muzzle, ballistic tracer, missile sprite/trail이 전투 playfield 안에서 보임
- [x] rifleman cover에서 soldier가 유지되고 낮은 barricade만 표시됨
- [x] Pause가 Game 위에만 존재하며 terminal scene에 잔존하지 않음
- [x] Result/GameOver 버튼과 패널이 잘리거나 늘어나지 않음

## 실행 순서

```bash
cd /Users/hwanchoi/project_202606/game-dd/dev_game/generated/skybreak-gunship
npm run build
npm run test:rules
npm run test:combat
GAME_QA_URL=http://127.0.0.1:5187 node qa/input-hostility-qa.mjs
GAME_QA_URL=http://127.0.0.1:5187 node qa/session-continuity-qa.mjs
GAME_QA_URL=http://127.0.0.1:5187 node qa/clarity-qa.mjs
GAME_QA_URL=http://127.0.0.1:5187 npm run test:lifecycle
npm --prefix ../.. run factory:production-gate -- --project generated/skybreak-gunship --require-gpt-imagegen --viewports 390x844,430x932,1080x1920
```

## 합격 기준

- 모든 명령 exit code 0
- captured-state: overlap/out-of-bounds/missing/assertion/browser error 모두 0
- combat assertions 13개 모두 true
- lifecycle assertions 9개 모두 true
- 반복 진입 후 scene/audio/pool count 단조 증가 없음
- Severity 1/2 회귀 결함 0
