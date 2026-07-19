# Regression Checklist — 철갑특송: 라스트 라인

아래 항목은 이번 제작/QA에서 실제 발견한 결함의 재현 조건과 회귀 검증 규칙이다.

## R-01 장거리 카메라에서 고정 배경·HUD 소실

- 재현: player x를 9,000px 이상으로 이동한다.
- 원인: `scrollFactor(0)` 오브젝트가 큰 world scroll에서 renderer culling 대상이 됐다.
- 수정: background/HUD/touch UI를 camera scroll 기준 world position으로 동기화하고 registry 좌표를 CSS canvas 좌표로 변환했다.
- 회귀: escort, mini-boss, Iron Mole 위치에서 전체 배경과 HUD가 모두 보여야 한다.

## R-02 Scene stop 중 ProjectilePool cleanup 예외

- 재현: Game을 Pause한 뒤 SceneManager에서 Pause와 Game을 연속 stop하고 Result를 start한다.
- 원인: Phaser가 group children을 먼저 정리한 뒤 custom cleanup이 `getChildren()`을 다시 호출했다.
- 수정: SHUTDOWN에서는 Phaser 소유 GameObject를 중복 파괴하지 않고 EventEmitter만 해제한다.
- 회귀: generic visual QA의 Pause → GameOver 전환에서 pageerror가 없어야 한다.

## R-03 구조 대상이 월드 아래로 낙하

- 재현: Game 진입 후 rescue target y를 2초 이상 관찰한다.
- 원인: RescueTarget에서 gravity를 꺼도 Physics Group 추가 시 group default가 다시 적용됐다.
- 수정: `RescueSystem.add()` 직후 `body.setAllowGravity(false)`와 velocity reset을 다시 적용한다.
- 회귀: engineer/medic/artillery y가 배치 좌표를 유지하고 실제 overlap 구조가 발생해야 한다.

## R-04 스프라이트 애니메이션 frame 8 경고

- 재현: Loading 완료 후 browser console 확인.
- 원인: Phaser texture `frameTotal`에 base frame이 포함되는데 이를 실제 sprite frame으로 계산했다.
- 수정: `getFrameNames()`에서 `__BASE`를 제외해 0~7만 등록한다.
- 회귀: player run animation은 8프레임이며 console warning 0이어야 한다.

## R-05 보스 교체 후 HP bar가 빈 상태

- 재현: Crane Sentinel을 제거한 뒤 Iron Mole encounter로 전환한다.
- 원인: 이전 boss healthChanged가 HP bar width를 0으로 만든 상태를 재사용했다.
- 수정: `bindBoss()`에서 매 보스 진입마다 width를 508로 초기화한다.
- 회귀: 두 보스 모두 등장 시 100% HP bar로 시작해야 한다.

## R-06 작은 viewport registry 좌표 오판

- 재현: 844×390에서 layout gate 실행.
- 원인: 1280×720 design 좌표를 CSS viewport 좌표처럼 게시했다.
- 수정: Phaser `canvasBounds`로 position/size를 CSS 픽셀로 변환한다.
- 회귀: landscape 4개 viewport에서 safe margin과 overlap gate가 통과해야 한다.

## R-07 Image quality gate 필수 역할 누락/노이즈 초과

- 재현: 초기 manifest로 `factory:image-quality-qa` 실행.
- 초기 실패: pause UI 없음, feedback FX 없음, Iron Mole HF 9.06, transport HF 8.58.
- 수정: pause/FX 신규 생성, Iron Mole/transport를 더 깨끗한 이미지로 재생성.
- 회귀: generic role-aware 대표 16개와 project HQ manifest 128개가 각각 품질 gate를 통과해야 한다.

## R-08 배경 경계 full-screen jump

- 재현: x=5,700→6,100, x=10,800→11,200을 각각 5초 동안 이동한다.
- 원인: 카메라 고정 배경 3장을 경계에서 화면 단위로 alpha 교체했다.
- 수정: zone별 far/mid/near/ambience layer와 1,280px spatial blend를 사용하는 `BackgroundLayerSystem`으로 교체했다.
- 회귀: 각 sample의 blend 합이 1이고 경계 내부에서 2개 이상 zone weight가 동시에 활성화되며 `backgroundSeams=0`이어야 한다.

## R-09 하단 점선·코드 생성 지형 노출

- 재현: x=0~16,800을 이동하며 캐릭터 발 아래 ground strip을 관찰한다.
- 원인: 32px pitch rivet이 있는 단일 Graphics texture를 16,800px 반복했다.
- 수정: 8종 ground/cap/platform/support 이미지와 충돌 배치를 함께 소유하는 `TerrainArtSystem`으로 교체했다.
- 회귀: `terrain-steel`, 반복 점선, gameplay generated texture가 0건이고 발 baseline이 collision 상단선과 일치해야 한다.

## R-10 구조 대상 primitive·낙하·중복 구조

- 재현: 기술자·의무병·포병을 각 1회 구조하고 exit까지 관찰한다.
- 원인: circle/rectangle 합성 대상과 Physics Group gravity 재적용, 즉시 숨김 흐름이 섞여 있었다.
- 수정: 3종 action sheet, marker/icon, freed→ability→exit 상태와 animation 완료 후 collider 정리를 구현했다.
- 회귀: 대상당 점수·효과 1회, ability 관찰 가능, exit 후 body/active/marker 잔존 0건이어야 한다.

## R-11 플레이어·적 정지 이미지 이동

- 재현: player shoot/jump/hurt와 적 4종 advance/attack/hurt/death를 관찰한다.
- 원인: velocity/flip 및 rotate/scale 변형만 있고 상태별 frame sequence가 없었다.
- 수정: player 58f, enemy 104f를 384px runtime cell로 등록하고 `AnimationRegistry` 상태·event 계약에 연결했다.
- 회귀: required state coverage 100%, projectile event 편차 1 frame 이하, death 중 중복 score/hit/collider 0건이어야 한다.

## R-12 전투 placeholder와 VFX 수명주기

- 재현: 모든 player/enemy/boss projectile, 파괴물, pickup, 포격 warning을 발생시킨다.
- 원인: `__WHITE`, 단색 circle, 정지 폭발과 미등록 임시 effect가 사용됐다.
- 수정: projectile 14종, 파괴물 14상태, pickup 2종, explosion/hit sequence 및 16종 combat VFX를 이미지화하고 transient cleanup을 추가했다.
- 회귀: `placeholderTextures=0`, VFX/pool active count가 지속 증가하지 않고 scene shutdown 후 transient image가 남지 않아야 한다.

## R-13 수송차·보스 단일 정지 상태

- 재현: 차량 HP 100/50/24/0%, 크레인 두 공격, Iron Mole phase 1/2/3을 강제한다.
- 원인: 정지 PNG와 tint/scale만으로 손상·페이즈를 표현했다.
- 수정: ATLAS 50f 계약, 크레인·Iron Mole 상태 sheet, 파츠 attachment/pivot metadata와 warning VFX를 연결했다.
- 회귀: 네 차량 상태 key, 크레인 공격 key, 세 phase key가 의도 값과 일치하고 이전 marker/tween/projectile이 남지 않아야 한다.

## R-14 UI 이미지 상태와 터치 복원

- 재현: 4 viewport에서 action button pointerdown→pointerup/out, Pause→Resume를 반복한다.
- 원인: circle/text button과 시각 상태 없는 touch zone을 사용했다.
- 수정: joystick/action/HUD/panel/icon, pressed/disabled texture와 image-based hit ownership을 적용했다.
- 회귀: overlap/out-of-bounds 0, pressed 복원, pause 하부 입력 차단, text 중복 bake 0건이어야 한다.

## R-15 모바일 texture memory 초과 위험

- 재현: 전체 manifest의 compressed bytes와 RGBA decoded bytes를 합산한다.
- 원인: 모든 entity sheet가 512px cell이고 사용하지 않는 정지/contact sheet도 public bundle에 남았다.
- 수정: source master는 유지하고 runtime entity cell을 384px로 최적화했으며 superseded public asset 9개를 제거했다.
- 회귀: 초기 자산 ≤64MiB, decoded RGBA ≤320MiB, asset budget gate PASS를 유지해야 한다.

## R-16 뒤로 이동·터치 포인터 캡처 불안정

- 재현: Game에서 오른쪽 이동 후 A/←를 700 game-ms 입력하고, 844×390/932×430에서 조이스틱을 왼쪽으로 드래그한 채 zone 경계를 통과하거나 Pause→Resume한다.
- 원인: 가상 조이스틱이 zone-local pointermove/up에만 의존했고 숨김 상태에서 interactive 차단과 이동값 reset이 분리돼 있었다.
- 수정: Scene 전역 pointermove/up 캡처, `resetJoystick()` 단일 정리, Pause visibility와 interactive 동시 전환을 적용했다.
- 회귀: 700 game-ms 기준 키보드 전진 ≥140px, 후진 ≤-140px, 터치 후진 ≤-140px, sampled action=-1, Resume 후 knob 중앙·moveX=0이어야 한다.

## R-17 와이드 화면 좌우 여백·상단 HUD 왜곡

- 재현: 844×390, 932×430, 1280×720에서 Game 상단 프레임과 canvas bounds를 비교한다.
- 원인: `FIT`가 19.5:9 화면에 pillarbox를 만들고 730×352 프레임을 1252×72로 anisotropic stretch했다.
- 수정: `EXPAND` 폭 확장, camera-size 배경/HUD/컨트롤 레이아웃, uniform-scale NineSlice 패널을 적용했다.
- 회귀: canvas CSS가 viewport를 2px 이내로 덮고, HUD bounds가 좌우 14 logical px 안쪽이며, X/Y 배율비 ≤1.35, layout overlap/out-of-bounds=0이어야 한다.

## R-18 안정성 soak의 정상 AI 탄환 오판

- 재현: 120초 합성 projectile soak 종료 직후 적 AI가 새 projectile을 발사하면 active count가 settle threshold를 넘는다.
- 원인: 풀 수명주기 검사가 정상 적 전투와 동일 세션에서 실행돼 누수가 아닌 신규 AI 탄환을 정착 실패로 계산했다.
- 수정: enemy combat은 runtime-art QA가 소유하고 stability soak에서는 enemyGroup을 비활성화해 합성 projectile만 격리한다.
- 회귀: 최종 게이트는 600초 soak + 10 restart에서 종료 active projectile=0, listener/timer 증가 0, BGM≤1, restart baseline 10/10이어야 한다.

## R-19 배경 구조물·파이프·연기 반복 이중노출

- 재현: 844×390과 1280×720에서 x=0, 5,700~6,100, 10,800~11,200을 관찰한다. 저투명 크레인·파이프·펜스·연기가 화면 양쪽과 중앙에 반복되면 실패다.
- 원인: 512px 구조물/ambience PNG와 4K full-scene plate를 TileSprite로 반복했다.
- 수정: far 4K plate만 비반복 Image로 렌더하고 1.06 overscan cover, zone-local pan, 800px blend를 사용한다. mid/near/ambience structural layer는 0개다.
- 회귀: snapshot `compositionMode=sharp-far-only`, `structuralTileSprites=0`, blend 합=1, max frame delta≤0.12, 화면 가장자리 반복 구조 0이어야 한다.

## R-20 정적 파괴물·보급품 중력 낙하

- 재현: Game을 10초 이상 실행한 뒤 destructible/pickup y와 spawnY를 비교한다.
- 원인: 동적 Physics Sprite를 Group에 추가한 뒤 group default가 gravity/movement 상태를 재적용했다.
- 수정: 소유권 이전 뒤 gravity=false, velocity=0, immovable=true, moves=false를 재설정한다.
- 회귀: 모든 viewport 입력 QA 종료 시 destructible/pickup 최대 Y drift≤1px이고 실제 폭발·pickup overlap이 가능해야 한다.

## R-21 고가 플랫폼 측면 영구 차단

- 재현: p1~p7 각 플랫폼을 좌→우·우→좌로 달리고 점프한다.
- 원인: 지면과 고가 플랫폼이 동일한 완전 고체 collider를 사용했다.
- 수정: ground와 elevated group을 분리하고 elevated는 하강 중 상단 착지만 허용한다.
- 회귀: 14경로 모두 entry edge를 통과하고 permanent side block=0, p5 `body.bottom=surfaceY=452`여야 한다.

## R-22 일반 적 고착으로 encounter 영구 잠금

- 재현: Warehouse 방패병이 플랫폼 측면 또는 화면 밖 후방에 남은 채 gate로 전진한다.
- 원인: commanded velocity가 있어도 실제 x가 변하지 않는 일반 적을 복구하는 규칙이 없었다.
- 수정: commanded-stuck/offscreen-rear monitor와 HP/alive 보존 위치 복구를 추가하고 보스는 제외한다.
- 회귀: 방패병이 1초 이상 고착되지 않고, 복구 전후 HP와 encounter alive가 동일해야 한다.

## R-23 모바일 멀티터치 순서 의존

- 재현: joystick→shoot, shoot→joystick 순서로 두 포인터를 누르고 세 번째 포인터로 jump 10회 입력한다.
- 원인: active pointer 용량 부족과 action별 포인터 소유권 부재였다.
- 수정: activePointers=4, joystick/action별 owner pointer, 독립 release/cancel을 적용한다.
- 회귀: 두 순서 모두 moveX≥0.9 + shoot=true, jump 10/10, 한 포인터 해제 후 다른 입력 유지, 최종 stuck input=0이어야 한다.

## R-24 Pause 버튼 depth·하부 입력 누출

- 재현: 3 viewport에서 Pause 진입 후 계속/철수를 클릭하고 ESC 왕복을 10회 반복한다.
- 원인: 공통 버튼 depth 100/101이 overlay 200·panel 205보다 낮았다.
- 수정: modal input mask, 버튼 220/텍스트 221, ESC resume와 controls reset을 적용한다.
- 회귀: 버튼 2개 visible/interactive, game elapsed delta=0, 10회 후 중복 Scene/stuck input=0, 철수→Home 성공이어야 한다.

## R-25 전투 gate 좌표 진동·투명 벽

- 재현: 적이 남은 첫 gate x=1700에서 D를 1.2초 유지한다.
- 원인: core 이동 후 sprite x를 매 프레임 되돌려 양의 속도와 clamp가 교대로 나타났다.
- 수정: core update 전에 전진 action을 차단하고 실제 overshoot만 body 동기화하며 방향·거리·잠금 안내를 표시한다.
- 회귀: x range≤1px, 양의 속도 sample≤1, gateBlocked≥80%, 잔존 적 화살표·거리 표시가 보여야 한다.

## R-26 호위 lead/lag 의미 역전

- 재현: player가 ATLAS보다 520px 이상 선행하거나 420px 이상 후방 지연한다.
- 원인: 두 방향 거리 모두 차량 정지 조건으로 처리했다.
- 수정: 선행 player는 catch-up 가속, 후방 지연/threat만 정지하며 진행률·남은 거리·정지 사유를 노출한다.
- 회귀: 선행 상태 1.8초에 차량 ≥100px 전진, 후방 지연은 `player-behind`, threat는 `threatened`여야 한다.

## R-27 HUD 동적 문자열·아이콘 겹침

- 재현: `SHOTGUN 999 · BOMB 99`, `SCORE 999,999,999`, 구조 아이콘 3개를 844/932/1280에서 표시한다.
- 원인: 중앙 원점 고정 좌표와 icon registry 누락이었다.
- 수정: 콘텐츠 폭 기반 cluster, 모바일 2행, 아이콘 registry, overlap/clipped 계산을 적용한다.
- 회귀: overlap/clipped=0, 모바일 CSS 글자≥15px, Pause safe area 침범=0이어야 한다.

## R-28 카메라 전방 시야 부족

- 재현: 전진/후진을 유지한 상태에서 player screenX 비율을 측정한다.
- 원인: 16% follow offset과 deadzone 결합으로 목표 35~45% 전방 구도가 안정적으로 확보되지 않았다.
- 수정: 진행 방향 반대 부호의 23% follow offset을 보간한다.
- 회귀: 전진 35~45%, 후진 55~65%, 방향 전환 시 순간 점프 없이 수렴해야 한다.

## 2026-07-13 실행 결과

| 범위 | 결과 | 증거 |
|---|---|---|
| R-21 | PASS, 14/14 + p5 landing | `qa-captures/polish-04/traversability-agent/after-traversability-report.json` |
| R-22/R-26 | PASS | `assets/qa/encounter-escort/encounter-escort-recovery.json` |
| R-23/R-24 | PASS, 3 viewport | `qa-captures/polish-05/phase3-mobile-pause/after-report.json` |
| R-25/R-27/R-28 | PASS, 3 viewport | `qa-captures/polish-04/input-hud-root/after-samples.json` |
| 실제 입력 완주 | PASS × 2 | `qa-captures/polish-04/fullplay-after/fullplay-input-report-run1.json`, `run2.json` |
| 빠른 안정성 | PASS, 120초+5 restart | `assets/qa/stability/runtime-stability-polish-05.json` |

## 공통 회귀 순서

```text
npm run build
→ qa:asset-coverage
→ qa:asset-budget
→ qa:runtime-art
→ qa:background-continuity
→ qa:runtime-stability 600s/10x
→ production-demo-qa
→ image-quality-qa
→ hq-screen-quality-qa
→ visual-layout-qa landscape matrix
→ scene-composite-qa landscape matrix
→ production-gate
```

기능 smoke는 이동·사격·2종 구조·호위·미니보스·Iron Mole phase 1/2/3·Result까지 실행한다.

## 최종 실행 결과 — 2026-07-12

| 범위 | 결과 | 증거 |
|---|---|---|
| R-01~R-15 | PASS | `assets/qa/completion-audit.json` |
| Runtime art/lifecycle | PASS, 20 captures, errors 0 | `assets/qa/asset-coverage/after-phase7/runtime-art-qa.json` |
| Background boundary | PASS, 42 samples, 5초×2 | `assets/qa/background-continuity/` |
| Layout/composite | PASS, 4 viewport | `assets/qa/layout/`, `assets/qa/scene-composite/` |
| Soak/restart | PASS, 600.9초 + 10/10 | `assets/qa/stability/` |
| Production gate | PASS, exit 0 | `assets/qa/final-gate-report.json` |

## R-29 production enemy config 미적용

- 재현: Stage 1 첫 basic 적의 HP/속도/projectile damage를 runtime에서 읽는다.
- 원인: `Enemy` prototype 기본값만 사용하고 `enemyConfig`를 spawn option에 병합하지 않았다.
- 수정: normalized role의 production config를 encounter spawn마다 병합한다.
- 회귀: 첫 basic 3기 모두 HP 42, speed 112, projectile damage 9여야 한다.

## R-30 다음 encounter 선행 생성

- 재현: `shore-entry` 종료 직후 player x<1800에서 `container-crossfire`의 spawned/alive를 검사한다.
- 원인: 완료 즉시 다음 definition을 spawn해 위치 trigger가 무시됐다.
- 수정: `pending`, `triggerX`, `activateCurrent()`를 분리한다.
- 회귀: x<1800 pending=true/spawn 0, x≥1800에서 정확히 6기 활성이어야 한다.

## R-31 enemy projectile 비가시·무피해

- 재현: no-fire player를 basic 적 전방에 두고 projectile fired/impact/player HP를 관찰한다.
- 원인: depth 0, 첫 frame 512px body cache, Group-vs-Sprite callback 인자 반전이 겹쳤다.
- 수정: depth 64, body update/reset 후 velocity, Projectile 타입 기반 actor 분기.
- 회귀: projectile depth=64, 50ms 이내 조기 비활성 0, 실제 9 damage impact가 2회 이상 발생해야 한다.

## R-32 일반 적 false boss bar

- 재현: production basic HP 42 상태에서 Stage 1 HUD를 확인한다.
- 원인: `maxHealth>=30`을 boss 판별로 사용했다.
- 수정: encounter definition의 `boss` 필드만 boss bar를 소유한다.
- 회귀: 일반 적 구간 boss-health item 0, 두 실제 boss에서는 bar가 보여야 한다.

## R-33 camera-fixed HUD·배경 한 프레임 지연

- 재현: Warehouse로 빠르게 이동한 뒤 HP 좌측 clipping과 Pause 아래 우측 black gap을 확인한다.
- 원인: `scrollFactor(1)` object에 camera scroll을 수동 합산해 follow보다 한 frame 늦었다.
- 수정: HUD/touch/far background를 `scrollFactor(0)`와 viewport 좌표로 통일한다.
- 회귀: 4 viewport×7 state에서 clipped 0, Pause 하부 black gap 0, background edge clear run≤3px여야 한다.

## R-34 모바일 visible target·조이스틱 실제 위치

- 재현: 844×390에서 Pause visible size/hit area와 joystick base/knob/spawn actor 교차를 측정한다.
- 원인: hit area만 확대하고 visible Pause는 작았으며 resize가 data만 바꾸고 object position을 바꾸지 않았다.
- 수정: Pause 82 logical, hit 46 CSS floor, joystick x96/base120/knob58, 모든 object `setPosition`.
- 회귀: Pause visible≥44 CSS px/hit≥46 CSS px, base-knob 중심 일치, spawn actor와 visible ring 고정 교차 0이어야 한다.

## R-35 terrain 투명 gutter seam·적 animation 동기화

- 재현: ground/platform 반복 경계와 동일 role 3기의 run frame을 관찰한다.
- 원인: source 투명 edge와 동일 animation start/time scale이었다.
- 수정: visual width 4px overlap/body 폭 보존, spawn 기반 phase와 0.96~1.04 loop time scale.
- 회귀: body gap 0, visual gap -4, 12 sample 전체 동기화 0, 플랫폼 14/14 통과여야 한다.

## R-36 방패 counter-play 무효

- 재현: 방패 정면에 rifle/shotgun/rocket/grenade를 각각 명중시킨다.
- 원인: frontal reduction이 모든 source에 동일 적용됐다.
- 수정: shotgun/rocket/grenade 및 blastRadius>0 source는 armor breaker로 처리한다.
- 회귀: rifle 정면 감소는 유지하고 산탄·폭발은 authored damage를 적용하며 실제 입력 full play가 rescue/warehouse를 통과해야 한다.

## R-37 공격 경고 누락·player death 사유 race

- 재현: basic attack과 player death를 각각 관찰한다.
- 원인: `telegraphMs` 미사용, escort의 mirrored `player-died`가 전용 death result보다 먼저 finish했다.
- 수정: pending attack wind-up/event, escort `player-died`는 전용 player result 경로가 처리한다.
- 회귀: projectile이 telegraph 이후 발사되고 player death result는 `특송대원 전투 불능`, 실제 transport 0 HP만 `ATLAS 수송차 파괴`여야 한다.

## 2026-07-14 실행 결과

| 범위 | 결과 | 증거 |
|---|---|---|
| R-29/R-30/R-32/R-37 | PASS | `qa-captures/polish-06/stage1-agent/stage1-after-report.json` |
| R-31 | PASS, fired 16/impact 15/damage 9×6 | `qa-captures/polish-06/stage1-agent/after-projectile-threat-probe.json` |
| R-33/R-34 | PASS, 4 viewport×7 state | `qa-captures/polish-06/layout-agent/after-final3-layout-scene-matrix.json` |
| R-35 | PASS | `qa-captures/polish-06/visual-agent/VISUAL-AUDIT-AFTER.md` |
| R-36 + actual full play | PASS, CLEAR 135.59초 | `qa-captures/polish-04/fullplay-after/fullplay-input-report-polish06-final6.json` |
| Build/asset coverage | PASS, 43 modules/findings 0 | `assets/qa/asset-coverage/current.json` |

## R-38 통과형 고형 장애물 실루엣·전투 depth 분리

- 재현: x=1140 전후의 striped barricade에서 player와 enemy의 앞뒤 관계 및 collider를 비교한다.
- 원인: 충돌 없는 장식물에 고형 장애물 이미지를 사용하고 player depth 40, enemy depth 0을 적용했다.
- 수정: barricade/crate/debris/pipe pile을 통과형 장식 목록에서 제거하고 모든 전투 actor를 depth 40으로 통일한다. 파괴 구조물은 경고 표식을 가진다.
- 회귀: 금지 장식 0, player/enemy/boss depth 동일, 배경 장식 depth<combat depth여야 한다.

## R-39 투사체 화면 끝 이전 소멸·one-way 플랫폼 옆면 충돌

- 재현: 844×390에서 rifle/shotgun/rocket을 수평 발사하고 platform p3 옆면도 통과시킨다.
- 원인: shotgun 수명 780ms와 elevated platform 전체 body 충돌이 수평 탄환을 조기 제거했다.
- 수정: 수명을 2200/2200/2800ms로 조정하고 하강 top-crossing만 elevated 충돌로 인정한다.
- 회귀: 세 무기 모두 logical camera width+60px 이상 진행하며 p3 옆면 수평 통과 시 terrain expire가 없어야 한다.

## R-40 공중 crouch·발 기준선·서기 hitbox 유지

- 재현: 지상 S와 `S+Space` 동시 입력을 각각 실행하고 crouch 두 프레임의 alpha foot와 body를 측정한다.
- 원인: jump tick이 이전 grounded 값을 재사용했고 movement crouch frame의 발이 shared baseline보다 51px 높았다.
- 수정: jump 즉시 grounded=false, crouch 지상·정지 제한, frame 4 move-only baseline alignment, crouch body 72px를 적용한다.
- 회귀: airborne crouch sample 0, 지상 foot gap≤3px, crouch body height≤80, 두 crouch frame alpha bottom 동일이어야 한다.

## R-41 투명 padding으로 인한 projectile subpixel 렌더링

- 재현: 844×390에서 enemy basic과 player rifle texture의 A128 불투명 bbox를 실제 CSS 크기로 환산한다.
- 원인: 512×512 투명 캔버스를 작은 display box에 맞춰 실제 탄두가 1px 미만으로 축소됐다.
- 수정: alpha-tight crop+12px gutter, visual/body 분리, glow trail, muzzle flash, 420ms 이상 경고를 적용한다.
- 회귀: mobile A128 최소 두께 enemy≥5 CSS px/player≥3.5 CSS px, enemy speed≤360, pre-fire telegraph≥420ms여야 한다.

## R-42 데스크톱 조작 HUD 숨김·Result 비활성 오인

- 재현: fine pointer 1280×720과 touch 844×390에서 Game/Result/Home 복귀를 실행한다.
- 원인: 포인터 타입에 따라 touch HUD를 숨겼고 복귀 버튼의 저채도 색상이 disabled로 읽혔다.
- 수정: `hideTouch=1` 외에는 6개 조작기를 항상 표시하고 Result 두 버튼을 active orange로 통일한다.
- 회귀: viewport별 visible control count=6, 실제 touch로 Home 복귀와 재시작 후 controls enabled=true여야 한다.

## 2026-07-14 후보정 세션 7 실행 결과

| 범위 | 결과 | 증거 |
|---|---|---|
| R-38/R-39/R-40 | PASS | `qa-captures/polish-07/after/world-contract-regression.json` |
| R-41 | PASS, mobile enemy 6.25px/player 4.21px | `qa-captures/polish-07/after/runtime-projectile-visibility.json` |
| R-42 | PASS | `qa-captures/polish-07/after/death-home-controls-after.json` |
| Enemy projectile threat | PASS, fired 15/impact 12/damage 9×5 | `qa-captures/polish-06/stage1-agent/after-projectile-threat-probe.json` |
| Runtime art | PASS, 20 captures/browser error 0 | `assets/qa/asset-coverage/after-phase7/runtime-art-qa.json` |
| Input HUD/traversability | PASS | `qa-captures/polish-04/input-hud-root/after-samples.json`, `qa-captures/polish-04/traversability-agent/after-traversability-report.json` |
| Actual-input full play | PASS, CLEAR 132.50초/구조 3/3 | `qa-captures/polish-04/fullplay-after/fullplay-input-report-current.json` |

## R-43 crouch가 직사탄을 실제로 회피하는가

- 재현: 844×390에서 같은 basic rifle shot을 standing과 S/↓ crouch에 각각 발사한다.
- 계약: standing body는 9 피해를 받고 crouch body는 피해/impact 0이며 projectile이 player 뒤 30px 이상 통과해야 한다.
- 구현: basic/shield는 수평 velocity와 `dodgeHint=crouch`; crouch는 지상·정지 body 72px이다. 별도 무적 플래그는 금지한다.
- 회귀: standingDamage=9, crouchDamage=0, crossed=true, bodyHeight=72, drone/grenade dodgeHint는 각각 `jump-or-move`/`move-out`이어야 한다.

## R-44 상단 구조물이 실제 점프 물리로 접근 가능한가

- 재현: container/warehouse/collapse route 입구 지면에서 실제 D+Space로 3단 상승한다.
- 기존 원인: 플랫폼 높이 132~224px가 점프 최대 상승 128.68px보다 높아 지면 진입 가능한 구조물이 0개였다.
- 구현: 입구 rise 96px, 연속 단차 80px, gap≤48px의 3개 5-step route와 boss vantage를 config로 생성한다.
- 회귀: 3개 route keyboard climb 3/3, 전 플랫폼 양방향 side pass 32/32, top-only landing, elevated pickup/rescue platformId anchor가 모두 통과해야 한다.

## R-45 모바일 조이스틱 숙이기 입력 누락

- 재현: 844×390 터치 환경에서 왼쪽 조이스틱을 아래로 끝까지 당긴다. 손잡이 이미지는 내려가지만 player가 계속 `idle`이면 실패다.
- 원인: `MobileControls.updateJoy()`가 y좌표로 knob 위치만 갱신하고 입력 값은 `moveX`만 생성했다. `GameScene`도 키보드 `aimY`만 crouch에 사용했다.
- 구현: `moveY`와 `crouchDown`을 생성하고 아래 입력 0.55 이상·좌우 입력 0.65 이하를 정지 숙이기로 스냅한다. 키보드와 터치 숙이기를 독립적으로 합성한다.
- 회귀: 실제 touch down에서 `moveY=1`, `crouchDown=true`, player state `crouch`, body 72px; release에서 모든 입력 0/state idle; right drag에서 `moveX>0.9`/crouch false여야 한다.
- 명령: `npm run qa:touch-crouch`

## 2026-07-15 후보정 세션 9 실행 결과

| 범위 | 결과 | 증거 |
|---|---|---|
| R-45 actual touch | PASS, moveY 1/crouch/body 72 | `qa-captures/polish-08/after-touch-crouch.json` |
| Touch visual | PASS, knob down+active tint | `qa-captures/polish-08/after-touch-joystick-crouch.png` |
| Keyboard crouch/traversal | PASS, damage 9→0/climb 3/3 | `qa-captures/polish-08/after-tactical-traversal.json` |
| Input HUD | PASS | `qa-captures/polish-04/input-hud-root/after-samples.json` |
| Multitouch/Pause | PASS, 3 viewport | `qa-captures/polish-05/phase3-mobile-pause/after-report.json` |
| Build | PASS, 43 modules | `npm run build` |

## 2026-07-15 후보정 세션 8 실행 결과

| 범위 | 결과 | 증거 |
|---|---|---|
| R-43/R-44 | PASS | `qa-captures/polish-08/after-tactical-traversal.json` |
| 16 platform traversability | PASS, 양방향 32/32 | `qa-captures/polish-04/traversability-agent/after-traversability-report.json` |
| World contract/Input HUD | PASS | `qa-captures/polish-07/after/world-contract-regression.json`, `qa-captures/polish-04/input-hud-root/after-samples.json` |
| Runtime art | PASS, 20 captures/error 0 | `assets/qa/asset-coverage/after-phase7/runtime-art-qa.json` |
| Actual-input full play | PASS, CLEAR 137.04초/구조 3/3/점수 35,199 | `qa-captures/polish-04/fullplay-after/fullplay-input-report-current.json` |

## R-46 Home 이미지 패널 내부 안전영역과 live resize

- 재현: Home을 844×390으로 cold load하거나 1280×720에서 844×390/932×430으로 live resize한다.
- 기존 원인: outer panel/canvas clipping만 검사했고 NineSlice slice를 제외한 실제 safe content containment와 Home resize handler가 없었다.
- 계약: `home-title`~`home-mobile-guide`의 `containmentFailures=0`, background gap≤1 CSS px, panel center delta≤1 CSS px, overlap/clipping 0.
- 최소 화면: 568×320에서도 font≥12 CSS px, play target≥44 CSS px, panel containment/overlap 0.
- 명령: `npm run qa:home-layout`
- 증거: `qa-captures/polish-09/home-layout/after-report.json`

## 2026-07-17 후보정 세션 10 실행 결과

| 범위 | 결과 | 증거 |
|---|---|---|
| Home cold load | PASS, 8/8 | `qa-captures/polish-09/home-layout/after-report.json` |
| Home live resize | PASS, 4/4 | `qa-captures/polish-09/home-layout/after-report.json` |
| Containment/overlap/clipping | 0/0/0 | `qa-captures/polish-09/home-layout/after-report.json` |
| Input HUD | PASS | `qa-captures/polish-04/input-hud-root/after-samples.json` |
| Multitouch/Pause | PASS | `qa-captures/polish-05/phase3-mobile-pause/after-report.json` |
| Runtime art | PASS, 20 captures | `assets/qa/asset-coverage/after-phase7/runtime-art-qa.json` |
| Build | PASS, 43 modules | `npm run build` |

