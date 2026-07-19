# 08. 이미지 에셋 누락·연속 배경·애니메이션 전수 감사

검토일: 2026-07-12  
대상: `iron-courier-last-line`  
판정: **RESOLVED — 2026-07-12 이미지 에셋 후보정 구현 완료, 최종 통합 QA 진행 중**

## 0. 구현 후 종결 요약

아래 본문은 구현 전 감사 기준선으로 보존한다. 실제 런타임은 감사에서 식별한 누락을 다음과 같이 교체했다.

| 감사 결함 | 구현 결과 | 증거 |
|---|---|---|
| 전체 화면 배경 카드 교체 | 3개 zone별 far/mid/near/ambience와 1,280px spatial blend | `assets/qa/asset-coverage/after-phase7/background-x*.png` |
| 점선·코드 생성 지형 | 8종 terrain tile/cap/support와 159개 deterministic 배치 | `TerrainArtSystem`, runtime state JSON |
| 구조 대상 도형 | 기술자·의무병·포병 3종 8프레임 action sheet와 marker/HUD icon | `assets/runtime/characters/rescue/` |
| 플레이어·적 정지 이동 | 플레이어 58f, 적 4종 104f, state/animation/event 계약 | `asset-manifest.json`, `runtime-art-qa.json` |
| 차량·보스 정지 PNG | ATLAS 50f, 크레인·아이언 몰 상태 sheet와 attachment metadata | `assets/runtime/characters/vehicle/`, boss manifest |
| projectile/pickup/VFX placeholder | projectile 14종, 파괴물 14상태, pickup 2종, 전투 VFX 19종 | asset coverage `0` findings |
| primitive UI | 이미지 joystick/action/HUD/panel/icon과 pressed/disabled 상태 | `assets/runtime/ui/`, 7개 artboard |
| manifest coverage 누락 | family/state/event/file/source scan을 포함한 project coverage gate | `assets/qa/asset-coverage/current.json` |

현재 manifest는 이미지 125개, entity animation physical frame 252개를 등록한다. 모바일 런타임은 player/enemy 384×384, vehicle/boss 512×512 cell로 최적화하면서 source/cleaned master를 보존했으며, 초기 자산 51.84MiB와 추정 decoded RGBA 309.32MiB로 각각 64/320MiB budget을 통과한다.

## 1. 결론

현재 빌드는 게임 로직이 동작하고 13개 선언 에셋에 대한 자동 품질 게이트도 통과하지만, 최종 화면은 원래 `03-ASSET-AUDIO-PLAN.md`가 요구한 production-demo 에셋 범위를 충족하지 않는다. 게이트는 manifest에 선언된 13개만 검사했기 때문에, 코드로 그린 구조물·구조 대상·버튼·탄환과 미선언 애니메이션 누락을 잡지 못했다.

핵심 원인은 다음 네 가지다.

1. `GameScene.createRuntimeTextures()`가 지형·연료통·구조 대상 3종을 단순 도형으로 생성한다.
2. 배경 3장은 월드 레이어가 아니라 카메라에 붙은 전체 화면 카드이며 x=5,900/11,000에서 통째로 교차 전환된다.
3. 실제 Phaser animation은 플레이어 `courier-run` 한 개뿐이다. 적·구조 대상·차량·보스는 정지 이미지가 위치만 이동한다.
4. projectile과 weapon pickup은 `__WHITE` 텍스처를 늘리고 tint한 사각형이다.

따라서 현재 상태는 **기능형 프로토타입에 고화질 대표 이미지가 일부 올라간 단계**이며, 전 화면이 고화질 에셋으로 일관되게 구성된 production demo 단계는 아니다.

## 2. 사용자 지적별 재현과 원인

| 사용자 지적 | 분류 | 심각도 | 확인된 원인 | 코드 증거 |
|---|---|---:|---|---|
| 구조물이 고화질 이미지 에셋이 아님 | L Asset Fidelity | P0 | 지면·플랫폼·연료통을 Graphics로 생성 | `GameScene.js:42-51`, `77-87` |
| 구출되는 형상이 고화질 이미지가 아님 | L Asset Fidelity | P0 | technician/medic/artillery를 원·사각형 조합으로 생성 | `GameScene.js:49-51`, `132-135` |
| 하단 점 위로 이동함 | C Visual Ambiguity + L | P0 | `terrain-steel` 상단에 32px 간격 원을 찍고 16,800px 반복; 96px 평면 타일이 하단을 덮음 | `GameScene.js:47`, `79-81` |
| 배경이 연속 이동하지 않고 갑자기 바뀜 | L Runtime Composition | P0 | 배경을 매 프레임 cameraX 중앙에 고정하고 5,900/11,000에서 650ms alpha 교체 | `GameScene.js:69-75`, `235-259` |
| 적이 움직이는 이미지가 아님 | L Animation Coverage | P0 | 적은 단일 PNG, `Enemy.update()`는 velocity/flip만 변경, animation 재생 없음 | `LoadingScene.js:21-24`, `Enemy.js:56-89` |
| 전반적으로 이미지가 사용되지 않음 | L + F Evidence Gap | P0 | pickup/projectile/UI/VFX 다수가 `__WHITE`, Graphics, circle/rectangle | 아래 전수 목록 참조 |

기준 캡처:

- `assets/qa/runtime-captures/game-early.png`
- `assets/qa/runtime-captures/rescue-success.png`
- `assets/qa/runtime-captures/escort.png`
- `assets/qa/runtime-captures/mini-boss.png`
- `assets/qa/runtime-captures/iron-mole-phase-3.png`

## 3. 현재 실제 에셋 커버리지

| 영역 | 현재 상태 | 판정 |
|---|---|---|
| 배경 | 3840×2160 단일 합성 이미지 3장 | 화질은 높지만 16,800px 월드용 연속 레이어가 아님 |
| 플레이어 | run 8프레임만 존재 | idle/jump/shoot/hurt/death 등 11개 상태군 누락 |
| 일반 적 | 역할별 정지 PNG 4장 | 이동·공격·피격·사망 애니메이션 0개 |
| 구조 대상 | 코드 생성 도형 3종 | 전부 교체 필요 |
| 지면/플랫폼 | 코드 생성 256×96 단일 타일 | 하단 점선·평면 띠 발생, 전부 교체 필요 |
| 파괴 구조물 | 코드 생성 연료통 한 종류 | 계획된 5종/14상태 중 실이미지 0개 |
| 수송차 | 정지 PNG 한 장 | 주행·피격·파손·수리·폭발 상태 누락 |
| 미니/최종 보스 | 정지 PNG 각 1장 | 파츠 동작·약점·페이즈·파괴 상태 누락 |
| projectile | `__WHITE` 사각형 tint | 모든 무기/적/보스 탄환 교체 필요 |
| pickup | `__WHITE` 상자 + R/S 텍스트 | 보급 상자·무기 아이콘 필요 |
| VFX | 정지 폭발 PNG 1장 + 원형 particle | 총구·피격·장갑·연기·파편·경고 누락 |
| 터치 UI | pause만 이미지, 나머지는 circle/text | joystick/action icon 세트 필요 |
| HUD/메뉴 | rectangle/text 기반 | 9-slice panel과 아이콘 체계 필요 |
| Scene artboard | 배경 성격의 3장만 존재 | 계획된 Loading/Home/Pause/Result 포함 7상태 승인본 미완성 |

정량 비교:

- manifest가 검사하는 이미지: **13개**
- 실제 등록된 animation clip: **1개 (`courier-run`)**
- 계획된 플레이어 프레임: **58프레임**, 현재 8프레임
- 계획된 일반 적 프레임: **최소 92~116프레임**, 현재 역할별 정지 이미지 1장씩
- 계획된 파괴물 상태: **14상태 이상**, 현재 실이미지 0개
- 현재 world segment: **8개**, 배경 화면 카드: **3개**

## 4. 이미지 추가·구현이 필요한 전체 항목

### P0-A. 연속 횡스크롤 배경 시스템

생성할 에셋:

| 묶음 | 필수 결과 |
|---|---|
| 해안 구역 | far 하늘/바다, mid 항구/선박, near 철망/파편 |
| 컨테이너·창고·호위 | far 항만 실루엣, mid 컨테이너/크레인, near 케이블/연기 |
| 붕괴 교량·아이언 몰 | far 화재 도시, mid 교량/요새, near 강재/불꽃 |
| 전환 구간 | 해안→컨테이너, 컨테이너→교량 연결 strip 각 1세트 |
| 대기 효과 | fog, smoke, ember, rain/spray 투명 layer |

구현 규칙:

1. 전체 화면 image를 `camera.scrollX + W/2`에 고정하는 현재 방식을 삭제한다.
2. far/mid/near를 독립 `TileSprite` 또는 긴 chunk image로 구성하고 각각 0.08/0.24/0.55 수준의 parallax를 적용한다.
3. 구역 경계는 최소 960~1,280px의 spatial blend 구간을 두며 단일 프레임에서 화면 전체 텍스처를 교체하지 않는다.
4. 모든 배경 프롬프트에서 플레이어·적·차량·충돌 플랫폼을 제외해 runtime entity와 중복되지 않게 한다.
5. 16,800px 전 구간에서 horizon, 조명 방향, 지면 높이가 연속되어야 한다.

승인 기준: x=5,700→6,100 및 x=10,800→11,200을 연속 이동하는 영상에서 jump cut 0, 반복 seam 0, 배경 속도 계층 3개 이상.

### P0-B. 지면·플랫폼·구조물 타일셋

현재 점선 하단 띠를 완전히 제거하고 실제 충돌 구조와 보이는 구조를 일치시킨다.

필수 모듈:

- 항구 콘크리트/강철 지면 A/B/C, 좌우 cap, 파손 edge, 경사 연결부
- 컨테이너 야드 바닥 A/B/C, 배수구, 레일, 웅덩이 overlay
- 창고 catwalk, 강철 플랫폼, 지지대, 사다리, 난간, 계단
- 붕괴 교량 상판, 파손 상판, 연결 joint, 아래 truss, 낙하 edge
- 보스 arena rail/track/armor plate/door threshold
- foreground: 철망, 케이블, 파이프, 강재, 잔해 12종 이상

권장 소스: 타일 768~1536px, runtime cell 256/512px, 동일 광원과 상단 collision line. 단순 stretch 금지, 너비 변경은 반복 가능한 center tile과 cap 조합으로 처리한다.

### P0-C. 구조 대상 3종 캐릭터

기존 도형 3개를 전부 삭제하고 같은 세계관의 독립 캐릭터 시트로 교체한다.

| 캐릭터 | 필수 상태 | 최소 프레임 |
|---|---|---:|
| 기술자 | bound idle, struggle, rescued stand, repair gesture, exit run | 18 |
| 의무병 | bound idle, signal, rescued stand, heal gesture, exit run | 18 |
| 포병 관측수 | bound idle, radio request, rescued stand, targeting gesture, exit run | 18 |

추가 에셋:

- 머리 위 rescue marker
- 기술자/의무병/포병 HUD 아이콘
- 구출 성공 flare/ring 8프레임
- 수리·회복·포격 요청 각각의 작은 effect

기술 규칙: 512×512 동일 셀, 우측 기준 측면, 공통 baseline/root, 투명 PNG, 구출 전/후 collider 변화와 animation 완료 후 비활성화.

### P0-D. 일반 적 4종 애니메이션

| 적 | 필요한 상태 | 목표 프레임 |
|---|---|---:|
| 소총 약탈병 | idle, run, aim, burst fire, recoil, hurt, death | 28~34 |
| 방패 집행병 | idle, march, guard, bash, stagger, shield break, death | 26~32 |
| 곡사 폭파병 | idle, run, windup, throw, recover, hurt, death | 24~30 |
| 해리어 드론 | hover, bank L/R, charge, fire, hit, explode | 18~24 |

구현 규칙:

- `Enemy.state`의 `idle/advance/retreat/attack/dead`를 역할별 animation key에 매핑한다.
- 발사 프레임 이벤트에서 projectile을 생성해 이미지 동작과 판정을 동기화한다.
- death는 즉시 `disableBody(true,true)`하지 않고 death animation 완료 후 비활성화한다.
- 같은 적의 모든 시트는 얼굴/헬멧/장비/무기/크기/기준선을 고정한다.

### P0-E. 플레이어 전체 상태 시트

run 외에 다음 50프레임을 추가한다.

- idle 6, jump 3, fall 2, crouch 2
- shoot forward 4, diagonal 4, up 4
- grenade 6, melee 6, hurt 3, death 10

현재의 rotate/scale 변형으로 jump/crouch/grenade를 흉내 내는 처리를 제거하고 상태별 시트를 재생한다. 총구 화염과 탄피는 본체 프레임에서 분리한다.

### P1-A. 파괴 가능한 구조물 5종

| 구조물 | 상태 |
|---|---|
| fuel drum | normal, damaged, rupture/explode |
| container lock | locked, broken |
| crane part | intact, damaged, detached |
| bridge joint | intact, cracked, collapsed |
| enemy power cell | charged, damaged, overload |

각 구조물은 파괴 전·중·후 이미지를 갖고, 파편/연기/불꽃 atlas와 연결한다. 현재 실제 배치가 연료통 11개뿐이므로 stage config의 나머지 4종을 world에 배치하는 작업도 포함한다.

### P1-B. 무기·탄환·보급품

필수 projectile/weapon visual:

- player rifle tracer, shotgun pellet, rocket + exhaust, grenade spin
- enemy rifle bolt, shield pistol round, grenadier grenade, drone pulse
- crane burst, crane hook + cable, Iron Mole cannon, missile, overdrive orb
- muzzle flash small/medium/heavy, casing, rocket smoke trail
- shotgun/rocket supply crate closed/open, 무기 아이콘 4종

모든 `Projectile`이 weaponId→texture/animation/trail profile을 조회하게 하고 `__WHITE` fallback은 production build에서 fail 처리한다.

### P1-C. 차량 애니메이션·파손 상태

- idle engine 4f, drive/track 8f
- hit 2f, damaged smoke loop 8f, critical fire loop 10f
- engineer repair 6f, destroyed 12f
- headlamp, wheel/track, exhaust를 필요 시 분리 파츠로 구성

차량 HP ratio가 normal/damaged/critical/destroyed visual state를 직접 선택해야 한다.

### P1-D. 보스 파츠·페이즈 애니메이션

크레인 센티널:

- body, boom, claw, turret, cable, weak core, cargo 3종
- idle servo, cannon recoil, hook launch/return, stagger, damaged, death

아이언 몰:

- chassis, tracks, drill, turret, missile pods, core, front/rear armor
- phase 1 track/drill, phase 2 heat/missile, phase 3 rupture/core pulse
- armor break, weak core expose, hit, destroyed variant

현재의 단일 이미지 tint만으로 페이즈를 표현하는 방식을 파츠 상태와 실제 공격 동작으로 교체한다.

### P1-E. VFX·공격 예고

- explosion small/medium/large 각 8f
- flesh/metal/armor impact 각 6f
- muzzle flash 3종×4f
- smoke/fire 각각 10~12f, dust 6f, casing 4f
- artillery drop marker, boss line/circle/drop telegraph
- weak-core pulse 12f, shield break, rescue success 8f
- death debris, vehicle critical smoke, water spray/rain splash

현재 `hitBurst()`의 단색 원 particle과 정지 폭발 한 장을 역할별 animation atlas로 교체한다.

### P1-F. HUD·모바일 컨트롤·메뉴 UI

이미지화 대상:

- joystick base/knob
- shoot/jump/grenade button base와 아이콘
- HUD 9-slice frame, HP frame/fill, ammo plate
- rifle/shotgun/rocket/grenade icon
- rescue 3종 icon, escort/boss HP frame
- warning/callout plate
- Pause panel, Result panel, retry/home/continue/retreat button base
- mission complete/failed emblem

텍스트·숫자는 이미지에 굽지 않고 Phaser text로 유지한다. 버튼 배경과 icon만 에셋화하며 pressed/disabled 상태를 제공한다.

### P2-A. 환경 소품과 생활감

- 컨테이너 6종, 화물 상자 4종, concrete barrier 3종
- fencing 3종, lamp/beacon 4종, pipe/vent 4종
- danger sign 4종, cable/net 4종, debris 8종
- buoy, pallet, tarp, ladder, stair, crane hook, rail switch
- foreground near overlay 6종

같은 배경이 반복되어 보이지 않도록 stage segment별 prop set과 deterministic placement seed를 둔다.

### P2-B. Scene별 승인 아트보드

Loading, Home, 초기 전투, 구조/호위, 보스전, Pause, Result 총 7상태를 1280×720과 844×390으로 다시 합성한다. 이것은 배경을 게임에 그대로 굽는 용도가 아니라, 각 런타임 에셋의 크기·대비·레이어·safe area를 승인하는 기준 이미지다.

## 5. 구현 파일 변경 범위

| 파일/신규 모듈 | 변경 |
|---|---|
| `LoadingScene.js` | 모든 atlas/image load, animation 등록, production fallback 금지 |
| `GameScene.js` | runtime placeholder 제거, background/terrain system 사용, VFX/UI texture 연결 |
| `BackgroundLayerSystem.js` 신규 | zone chunk, parallax, spatial transition, ambience layer |
| `TerrainArtSystem.js` 신규 | tile/cap/support 배치와 collision-art 정합 |
| `AnimationRegistry.js` 신규 | player/enemy/rescue/vehicle/boss 상태→animation 매핑 |
| `Enemy.js` | 역할별 animation state, 발사 frame event, death 완료 처리 |
| `Player.js` | 전체 상태 clip와 action lock/overlay |
| `WorldActors.js` | 구조/차량/파괴물 visual state 구현 |
| `Projectile.js` | weaponId 기반 texture/atlas/trail, `__WHITE` 제거 |
| `MobileControls.js`, `ui.js` | 이미지 버튼/9-slice/아이콘 적용 |
| `asset-manifest.json` | 모든 family/state/frame/pivot/approved status 등록 |
| QA scripts | placeholder·animation coverage·background seam 검사 추가 |

## 6. 자동 게이트가 놓친 이유와 보완

현재 `factory:hq-screen-quality-qa`는 `asset-manifest.json`에 선언된 13개 파일의 픽셀/품질만 검사한다. 선언하지 않은 구조 대상·지형·projectile·UI는 검사 대상이 아니므로 PASS가 실제 화면 완성도를 보장하지 못한다.

다음 assertion을 추가해야 한다.

1. production source에서 gameplay entity의 `__WHITE` 사용 0건.
2. allowlist 밖 `generateTexture`, `add.circle`, `add.rectangle` 기반 gameplay visual 0건.
3. player/enemy/rescue/vehicle/boss별 `requiredStates`와 실제 animation key 100% 일치.
4. 8개 segment 모든 대표 x에서 active texture key와 source resolution 기록.
5. x=5,700~6,100, 10,800~11,200 연속 영상의 full-screen texture jump 0건.
6. terrain tile seam, 반복 pitch, stretch ratio 자동 검사.
7. screenshot과 같은 세션의 `activeTextureKeys`, `activeAnimationKeys`, `placeholderTextures`, `backgroundZoneBlend` JSON 저장.

## 7. 제작 우선순위와 배치

| 배치 | 내용 | 완료 조건 |
|---|---|---|
| Batch 1 | 연속 배경 + 지면/플랫폼 + 구조 대상 | 사용자가 지적한 세 문제의 before/after 캡처 |
| Batch 2 | 적 4종 + 플레이어 전체 animation | 이동/공격/피격/사망 clip과 판정 동기화 |
| Batch 3 | projectile/pickup/destructible/VFX | `__WHITE` 및 gameplay primitive 0건 |
| Batch 4 | 차량/보스 파츠 + phase visual | HP/phase/state가 실제 파츠 이미지로 보임 |
| Batch 5 | HUD/모바일 UI + 환경 props + scene artboard | 전 scene의 이미지 소유권과 품질 일관성 |
| Batch 6 | 전 구간 재캡처·production gate 강화 | 4 viewport, seam video, 상태 JSON 모두 PASS |

대략적인 최소 제작량은 **36개 에셋 family, 250~330개 animation frame/환경 module**이다. 파일 수를 줄이기 위해 family별 atlas와 JSON metadata로 묶되, manifest에서는 상태별 커버리지를 개별 검증한다.

## 8. 최종 승인 기준

- 하단 점선/평면 띠가 사라지고 캐릭터 발이 실제 지면 이미지 위에 접지한다.
- 카메라 이동 중 far/mid/near가 서로 다른 속도로 연속 이동한다.
- 배경 경계 두 곳에서 화면 전체가 갑자기 바뀌지 않는다.
- 구조 대상 3종이 캐릭터로 보이고 구출 전/후 동작이 다르다.
- 적 4종이 걷기·공격·피격·사망 animation을 실제로 재생한다.
- 플레이어·차량·보스가 상태별 정지 이미지 변형이 아니라 animation/part state를 사용한다.
- gameplay layer의 `__WHITE` placeholder와 미승인 Graphics visual이 0건이다.
- 구조물·pickup·projectile·VFX·HUD가 같은 아트 디렉션을 사용한다.
- 모든 변경은 동일 구간 before/after 캡처, 상태 JSON, build, image-quality, HQ screen, layout, scene-composite, production gate로 재검증한다.
