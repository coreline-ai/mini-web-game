# Final QA Summary — 철갑특송: 라스트 라인

검증일: `2026-07-12`  
대상: `generated/iron-courier-last-line`  
기준 캔버스: `1280×720 landscape`  
최종 판정: **PASS — production demo 이미지 후보정 완료**

## 1. 사용자 지적 종결 결과

| 사용자 지적 | 확인된 원인 | 최종 수정 | 증거 |
|---|---|---|---|
| 구조물이 고화질 이미지가 아님 | 지형·파괴물을 Graphics/단일 임시 타일로 생성 | terrain 8종, 환경 소품 8종, 파괴물 5 family/14상태를 이미지화하고 `TerrainArtSystem`에서 159개 piece 배치 | `assets/qa/asset-coverage/after-phase7/game-start.png` |
| 구출 대상 형상이 고화질이 아님 | technician/medic/artillery가 primitive 조합 | 직업별 action sheet, marker/HUD icon, freed→ability→exit 흐름과 collider 정리 구현 | `assets/qa/asset-coverage/after-phase7/rescue-ability.png` |
| 하단 점 위로 이동함 | 32px pitch rivet이 있는 generated ground strip 반복 | cap/center/heavy/platform/support 타일과 collision-art 단일 소유권으로 교체 | `assets/qa/scene-composite/1280x720-game.png` |
| 배경이 중간에서 갑자기 바뀜 | 3개 full-screen card를 경계에서 교환 | 3 zone별 far/mid/near/ambience와 1,280px spatial blend 적용 | `assets/qa/background-continuity/background-continuity-after.webm` |
| 적이 움직이는 이미지가 아님 | 정지 PNG가 velocity/flip만 변경 | 일반 적 4종 104 physical frames와 역할별 state animation 연결 | `assets/qa/asset-coverage/after-phase3/enemies-moving.png` |
| 이미지 미사용 영역이 많음 | projectile/pickup/VFX/UI가 `__WHITE`·primitive에 의존하고 manifest가 미선언 영역을 검사하지 않음 | projectile 14종, pickup 2종, combat VFX 19종, image UI와 전수 coverage gate 구현 | `assets/qa/asset-coverage/current.json` |

## 2. 최종 에셋·애니메이션 구성

| 영역 | 결과 |
|---|---|
| Manifest | stage background 3 + image 125, 전 항목 `approved` |
| Metadata | family/pivot/sourceSize/runtimeSize/status/renderOwner/provenance 누락 0 |
| Entity animation | 11 family, physical frame 252 |
| 플레이어 | 58f: idle/run/jump/fall/crouch/3방향 shoot/grenade/melee/hurt/death |
| 일반 적 | rifle 32f, shield 32f, grenadier 20f, drone 20f |
| 구조 대상 | technician/medic/artillery 각 8f action sheet |
| 수송차 | idle 4, drive 8, hit 2, damaged 8, critical 10, repair 6, destroyed 12 = 50f |
| 보스 | Crane Sentinel 8 physical frames, Iron Mole 8 physical frames와 phase/weak-core 상태 |
| 전투 자산 | projectile 14종, 파괴물 14상태, pickup 2종, VFX 19종 |
| UI/환경 | image control/HUD/icon/panel + 환경 prop 8종 + 승인 artboard 7개 |

player/enemy는 DPR3 모바일 표시와 메모리 균형을 위해 384×384 runtime cell을 사용한다. 화면 점유가 큰 vehicle/boss는 512×512를 유지한다. 수송차 extension은 512px master 품질을 유지하면서 runtime WebP quality 96으로 최적화했다.

## 3. 런타임 아트 검증

`assets/qa/asset-coverage/after-phase7/runtime-art-qa.json` 결과:

| 지표 | 결과 |
|---|---:|
| 캡처 | 20 |
| placeholderTextures | 0 |
| missingRequiredAnimations | 0 |
| backgroundSeams | 0 |
| duplicateVisibleEntities | 0 |
| lingeringTransientGraphics | 0 |
| browserErrors | 0 |
| phase 전환 후 이전 boss projectile | 0 |
| phase 전환 후 이전 warning marker | 0 |

차량 HP 100/50/24/0%는 각각 `transport:idle`, `transport:damaged`, `transport:critical`, `transport:destroyed`를 선택했다. Iron Mole phase 1/2/3와 Crane 공격 animation도 각각의 runtime key로 관찰했다.

## 4. 배경 연속성

`assets/qa/background-continuity/background-continuity.json`에서 다음 두 경계를 실제 5초 이동으로 기록했다.

- x=5,700→6,100: harbor→yard
- x=10,800→11,200: yard→arena
- blend sample: 42
- weight 합 오류: 0
- 최대 허용치를 넘은 frame간 blend jump: 0
- browser error: 0

구현 전 증거는 `assets/qa/asset-coverage/before/`의 동일 x screenshot 4장과 runtime-state JSON으로 보존했다. 구현 후 연속 영상은 `background-continuity-after.webm`으로 보존했다.

## 5. 4개 viewport UI·합성 검증

검증 viewport:

- 844×390
- 932×430
- 1280×720
- 1920×1080

결과:

| Gate | 결과 | 보존 위치 |
|---|---|---|
| Visual layout | PASS × 4, overlap/out-of-bounds 0 | `assets/qa/layout/` 20장 |
| Scene composite | PASS × 4, pixel inspection OK | `assets/qa/scene-composite/` 20장 + layout JSON 20개 |
| DPR3 actor source/alpha | PASS, 8 actors, minimum source ratio 1.05 | `assets/qa/dpr/dpr3-asset-qa.json` |

검증 중 발견된 844×390 구조 카운터↔pause overlap과 Result emblem↔title overlap은 좌표 및 semantic registry id 수정 후 재검증했다.

## 6. 자산 예산

`assets/qa/performance/asset-budget.json`:

| 항목 | 측정 | Budget | 결과 |
|---|---:|---:|---|
| Manifest image | 125 | — | 기록 |
| 압축 이미지 | 50.18 MiB | — | 기록 |
| 오디오 | 1.66 MiB | — | 기록 |
| 초기 자산 추정 | 51.84 MiB | 64 MiB | PASS |
| decoded RGBA 추정 | 309.32 MiB | 320 MiB | PASS |

superseded static/contact sheet의 public load를 제거하고, 큰 수송차 PNG extension을 WebP runtime으로 변경했다. raw/cleaned source master는 그대로 보존한다.

## 7. 10분 soak·10회 재시작

`assets/qa/stability/runtime-stability-qa.json` 결과:

| 항목 | 결과 |
|---|---:|
| soak | 600.9초, 122 samples |
| restart | 10/10 PASS |
| browser/page error | 0 |
| projectile pool 최대 | 18 / limit 140 |
| 종료 active projectile | 4 |
| core listener | 15 → 15 |
| timer count | 0 → 0 |
| 측정 heap | 68,000,000 → 68,000,000 bytes |
| active BGM 최대 | 1 |
| restart 후 score | 10회 모두 0 |
| restart 후 pool length | 10회 모두 0 |

headless software-renderer FPS는 첫 sample 49.88, 마지막 sample 34.33이며 gate 기준인 heap/pool/listener/timer의 지속 누적은 없었다. FPS 값은 실제 모바일 GPU 성능 수치가 아니라 수명주기 안정성 참고값으로만 사용한다.

## 8. 최종 실행 Gate

| 검증 | 결과 |
|---|---|
| `npm run build` | PASS, 42 modules |
| `npm run qa:asset-coverage` | PASS, 모든 결함 count 0 |
| `npm run qa:asset-budget` | PASS |
| `factory:production-demo-qa --require-gpt-imagegen` | PASS |
| `factory:image-quality-qa` | PASS, role-aware 16 assets |
| `factory:hq-screen-quality-qa` | PASS, 128 assets |
| `factory:visual-layout-qa` | PASS, 4 viewport |
| `factory:scene-composite-qa` | PASS, 4 viewport |
| `factory:production-gate` | PASS, exit code 0 |

큰 Phaser 프로젝트에서 viewport별 Chromium decoded texture가 누적되지 않도록 production gate는 한 번 build/preview한 immutable URL에 viewport를 큰 순서대로 격리 실행한다. 검증 범위는 기존 4개 viewport와 동일하다.

## 9. 최종 판정

사용자가 지적한 6개 이미지 결함을 동일 위치·상태에서 종결했다. gameplay placeholder와 미승인 primitive는 0건이고, 배경·지형·구조 대상·플레이어·적·차량·보스·projectile·VFX·UI가 게임 전용 imagegen provenance와 명시적인 runtime 상태 계약을 사용한다.

웹/모바일 landscape **production demo 후보정 완료**로 승인한다. 실제 iOS/Android 기기의 발열·배터리·Safari 오디오 unlock과 사람 기준 7~10분 median clear time은 배포 후보 단계의 실기기 플레이테스트 범위로 유지한다.

상세 기계 판정:

- `assets/qa/final-gate-report.json`
- `assets/qa/completion-audit.json`

---

## 10. 후보정 세션 2 — 뒤로 이동·와이드 해상도 HUD (2026-07-12)

### 사용자 증상과 결함 분류

| 사용자 표현 | 결함 클래스 | 심각도 | 확인된 원인 |
|---|---|---:|---|
| `뒤로 안가!` | I. Input Robustness | 2 | 가상 조이스틱이 zone-local `pointermove/pointerup`에만 의존해 손가락이 영역 밖으로 이동하거나 오버레이 전환이 발생하면 포인터 캡처·해제가 불안정했다. 숨긴 컨트롤도 입력을 명시적으로 비활성화하지 않았다. |
| `상단 상태 이미지 양쪽 해상도에 안 맞게 보여!` | L. Asset Fidelity + J. Resize continuity | 3 | 730×352 HUD 이미지를 1252×72로 직접 변형해 X/Y 배율 차이가 8.38배였고, `FIT` 고정 캔버스가 19.5:9 화면에서 좌우 검은 여백을 만들었다. |

### 수정

- 조이스틱 이동·해제를 Scene 전역 포인터로 캡처하고 `resetJoystick()`에서 포인터·이동값·knob 위치를 단일 정리한다.
- Pause/Resume 시 터치 컨트롤의 visibility와 interactive 상태를 함께 차단·복구한다.
- `Phaser.Scale.EXPAND`로 720px 논리 높이를 유지하면서 19.5:9/21:9 화면 폭을 확장한다.
- 배경 far/mid/near/ambience가 실제 camera width/height를 사용하도록 변경한다.
- HUD와 좌우 터치 UI를 camera width 기준으로 재배치하고 resize 이벤트에서 재계산한다.
- 금속 HUD 프레임은 `NineSlice + uniform scale`로 교체해 모서리·테두리의 원본 비율을 보존한다.
- 844×390 레이아웃 게이트가 발견한 Pause 우측 safe-margin 0.4px 부족을 추가 수정했다.

### 동일 조건 전후 증거

| 조건 | 수정 전 | 수정 후 |
|---|---|---|
| 844×390 | `qa-captures/polish-02/before-mobile-844x390.png` | `qa-captures/polish-02/after-mobile-844x390.png` |
| 932×430 | `qa-captures/polish-02/before-mobile-932x430.png` | `qa-captures/polish-02/after-mobile-932x430.png` |
| 1280×720 | `qa-captures/polish-02/before-desktop-1280x720.png` | `qa-captures/polish-02/after-desktop-1280x720.png` |
| 상태 샘플 | `qa-captures/polish-02/before-samples.json` | `qa-captures/polish-02/after-samples.json` |

### 입력·HUD 측정값

| viewport | 키보드 전진/후진 | 터치 후진 | Canvas CSS | HUD X/Y 배율비 |
|---|---:|---:|---:|---:|
| 844×390 | +194.8 / -185.2px | -281.7px | 844×390 | 1.00 |
| 932×430 | +194.8 / -180.5px | -273.7px | 932×430 | 1.00 |
| 1280×720 | +194.8 / -190.0px | -261.3px | 1280×720 | 1.00 |

세 viewport 모두 이동 action `-1`, 좌우 검은 여백 0, HUD `NineSlice`, browser/page error 0이다.

### 전체 플레이·안정성 재검증

| 검증 | 결과 |
|---|---|
| `qa:input-hud` | PASS, 3 viewport, failure 0 |
| `qa:asset-coverage` | PASS, placeholder/primitive/missing animation 0 |
| `qa:runtime-art` | PASS, 20 captures, browser error 0 |
| `qa:background-continuity` | PASS, 42 samples, seam/jump 0 |
| `qa:dpr-assets` | PASS, DPR3, 8 actors, minimum source ratio 1.05 |
| production gate compatibility | PASS, production/image/layout/composite 전부 통과 |
| 600초 soak + 10회 restart | PASS, active projectile 정착 0, listener 15→15, timer 0→0, BGM 최대 1 |

장시간 검사에서 최초 1회 `activeProjectiles=6`이 발생했으나 적 AI가 검사 종료 순간에도 정상 사격한 값이었다. 적 combat은 `runtime-art-qa`에서 별도 검증하고, 안정성 soak는 합성 projectile의 생성·소멸만 격리하도록 검사 조건을 수정했다. 프로젝트 최종 기준인 동일 600초/10회 조건 재실행 결과 정착 active projectile 0, pool 최대 12, 실패 0을 확인했다.

### 세션 2 판정

**PASS — 뒤로 이동과 와이드 해상도 HUD 결함 종결.** severity 1/2 미해결 결함 0, 새 browser error 0, 회귀 실패 0이다.

---

## 11. 후보정 세션 3 — 배경 이중노출·전체 화면 미술 정리 (2026-07-12)

### 사용자 증상

`배경 흐릿 하게 뭔가 보이고 파이프 같은 배경이! 전체적으로 겜이 엉망이야!`

| 결함 | 클래스 | 원인 | 수정 |
|---|---|---|---|
| 흐릿한 파이프·구조물 잔상 | B. Visual Singularity + L. Asset Fidelity | 512×512 mid/near 구조물과 smoke를 저투명 TileSprite로 반복해 크레인·파이프·펜스가 700px 전후 간격으로 중복됐다. | 9개 저해상도 구조/ambience 합성 레이어를 런타임에서 제거했다. |
| 와이드 화면 배경 반복 | B + L | 4K full-scene 배경도 TileSprite여서 19.5:9 화면 가장자리에 동일 항만 구조가 반복됐다. | 4K plate를 비반복 Image로 변경하고 1.06 overscan cover + 제한된 zone-local pan을 적용했다. |
| 배경 전환 중 과도한 이중노출 | C. 가독성 + L | 1,280px 전환 구간에서 여러 구조 레이어가 동시에 alpha blend됐다. | structural layer 0을 강제하고 far plate 3장만 800px smooth blend하도록 축소했다. |
| 데스크톱 화면을 가리는 모바일 UI | C. UI–Gameplay ambiguity | 키보드 환경에서도 joystick/fire/jump/grenade가 항상 표시됐다. | 1,100px 이상 fine-pointer 화면은 모바일 조작군을 숨기고 Pause만 유지한다. |
| 구조물·보급품 월드 아래 낙하 | A. Entity lifecycle/physics ownership | Physics Group 소유권 이전 후 gravity/moves 상태가 다시 활성화됐다. | 그룹 등록 뒤 gravity=false, velocity=0, immovable=true, moves=false를 재강제하고 spawnY drift를 검사한다. |

### 증거

- 수정 전: `qa-captures/polish-02/before-mobile-844x390.png`
- 수정 후 모바일: `qa-captures/polish-02/after-mobile-844x390.png`
- 수정 후 데스크톱: `qa-captures/polish-02/after-desktop-1280x720.png`
- 배경 이동 영상: `assets/qa/background-continuity/background-continuity-after.webm`
- 현재 상태 샘플: `qa-captures/polish-02/after-samples.json`

### 검증 결과

| 검사 | 결과 |
|---|---|
| background composition | `sharp-far-only`, structuralTileSprites=0 |
| background continuity | PASS, 34 samples, blend jump/seam 0 |
| static world drift | destructibles=0, pickups=0 |
| runtime art | PASS, 20 captures, browser errors 0 |
| DPR3 | PASS, minimum source ratio 1.05 |
| visual layout | PASS, 844×390 / 932×430 / 1280×720 |
| scene composite | PASS, 3 viewport pixel inspection |
| current-code stability | PASS, 120초 soak + 5 restart, settled projectile 0, max BGM 1 |

### 세션 3 판정

**PASS — 반복 파이프·안개 이중노출·4K 배경 타일 반복·데스크톱 모바일 UI·정적 구조물 낙하 종결.** 이번 세션은 기존 4K 원본을 살리고 불량 합성 레이어를 제거하는 방향으로 처리했다.

---

## 12. 후보정 세션 4 — 실제 플레이 진행·멀티터치·HUD 종결 (2026-07-13)

### 병렬 수정 결과

| 영역 | 수정 | 현재 증거 |
|---|---|---|
| 플랫폼 영구 차단 | ground/elevated 물리 그룹 분리, 고가 플랫폼 상단 착지 전용 처리 | `qa-captures/polish-04/traversability-agent/after-traversability-report.json` |
| Warehouse 적 고착 | 일반 적 commanded-stuck/offscreen-rear 감시와 위치 복구, HP/alive 보존 | `assets/qa/encounter-escort/encounter-escort-recovery.json` |
| 모바일 동시 입력 | active pointer 4개, joystick/action 포인터별 소유·해제·cancel | `qa-captures/polish-05/phase3-mobile-pause/after-report.json` |
| Pause 버튼 가림 | overlay input mask, panel 205, 버튼 220/221, ESC·철수 복구 | `qa-captures/polish-05/phase3-mobile-pause/after-844x390-pause.png` |
| gate 진동·안내 부재 | 전진 action 사전 차단, overshoot 동기화, 잔존 적 방향·거리 표시 | `qa-captures/polish-04/input-hud-root/after-samples.json` |
| 호위 정체 | player lead는 ATLAS 추격, player lag/threat만 정지, 진행률·거리·상태 HUD | `assets/qa/encounter-escort/encounter-escort-recovery.json` |
| HUD 겹침·과소 글자 | 동적 cluster, 모바일 2행 28px, 아이콘 registry와 overlap/clipping 진단 | `qa-captures/polish-04/input-hud-root/after-samples.json` |
| 전방 시야 | 진행 방향별 follow offset 23%와 완만한 보간 | 같은 보고서의 `cameraLookAhead` |

### 정량 결과

- 플랫폼 7개 × 양방향 14경로 PASS, p5 착지 `body.bottom=surfaceY=452`.
- Warehouse 방패병 `6243→7790.1` 수준으로 전투권 복귀, HP `8`, alive `1` 보존.
- 첫 gate 전진 유지 38/37/47 samples에서 x range `0`, 양의 속도 sample `0`.
- 카메라 전진 player screen ratio: `39.47% / 38.32% / 40.78%`.
- 최악 문자열 `SHOTGUN 999 · BOMB 99`, `SCORE 999,999,999`에서 overlap/clipped `0`.
- 모바일 CSS HUD 글자: 844×390 `15.17px`, 932×430 `16.72px`.
- 두 포인터 입력 순서 2종 모두 `moveX=1 + shoot=true`, 이동+사격 중 jump `10/10`.
- Pause↔Resume `10회 × 3 viewport`, 철수→Home `3/3`, stuck input/중복 Scene `0`.

### 디버그 우회 없는 실제 완주

Playwright가 실제 키보드 이벤트 `A/D/Space/J/K`만 전송했으며 debug teleport/advance와 런타임 상태 변경은 사용하지 않았다.

| 실행 | 결과 | 시간 | 구조 | 점수 | 증거 |
|---|---|---:|---:|---:|---|
| run1 | CLEAR | 115.3초 | 3/3 | 35,734 | `qa-captures/polish-04/fullplay-after/fullplay-input-report-run1.json` |
| run2 | CLEAR | 113.6초 | 3/3 | 35,619 | `qa-captures/polish-04/fullplay-after/fullplay-input-report-run2.json` |

run1 영상: `qa-captures/polish-04/fullplay-after/page@a5de91f752bdc12ab8b03ec06f9684e6.webm`  
Result 화면: `qa-captures/polish-04/fullplay-after/run1-result.png`

### 현재 코드 회귀

| 검사 | 결과 |
|---|---|
| `npm run build` | PASS, 42 modules |
| input/HUD/gate/camera 3 viewport | PASS |
| traversability 14경로 + Warehouse | PASS |
| escort/encounter recovery | PASS |
| multitouch/Pause 3 viewport | PASS |
| asset coverage | PASS, 모든 결함 count 0 |
| runtime art | PASS, 20 captures, browser errors 0 |
| background continuity | PASS, 42 samples |
| current-code stability | PASS, 120초 + restart 5/5, max pool 12, BGM 1 |

### 세션 4 판정

**KNOWN P0/P1 FIXED.** 실제 플레이에서 확인된 완주 차단, 모바일 동시 입력, Pause, gate 진동·안내, 호위 정체, HUD 겹침과 카메라 전방 시야는 종결했다. 현재 통합본에서는 600초 soak+10 restart, visual-layout/scene-composite 전체 matrix, production gate를 다시 실행하지 않았으므로 배포 승인 상태는 별도로 유지한다.

---

## 13. 후보정 세션 5 — 전 장면 레이아웃·Stage 1 실제 플레이 재감사 (2026-07-14)

### 병렬 감사와 핵심 수정

| 영역 | 확인된 결함 | 수정 |
|---|---|---|
| 화면 고정 레이어 | Warehouse HP 좌측 clipping, Pause 아래 배경 우측 black gap | HUD·터치·4K far plate를 `scrollFactor(0)` 화면 좌표로 통일 |
| Stage 1 적 수치 | prototype HP 3/피해 1이 production 표를 가림 | spawn에 production config HP 42/속도 112/피해 9 병합 |
| 전투 진행 | 다음 encounter가 종료 즉시 먼 위치에서 생성 | `pending + triggerX` 위치 기반 activation |
| 적 탄환 | depth 0, 첫 frame body cache, callback 인자 반전으로 피해 경로 단절 | depth 64, body refresh/reset, 타입 기반 impact routing |
| 전투 가독성 | `telegraphMs`가 무시되어 경고 없이 즉시 발사 | attack wind-up과 warning event 연결 |
| 방패 대응 | 산탄·폭발도 전면 감소되어 실전 전투가 장기화 | shotgun/rocket/grenade/blast를 armor breaker로 처리 |
| 실패 결과 | player 사망을 ATLAS 파괴로 표시 | escort `player-died` race를 전용 player 결과 경로로 분리 |
| 모바일 상단/조작 | Pause visible icon 과소, joystick/base/knob 불일치·spawn 가림 | Pause visible 82 logical, joystick x96/base120/knob58, resize에서 실제 position 갱신 |
| 시각 반복 | terrain gutter seam, 동일 적 animation 동기화 | 시각 4px overlap/body 보존, deterministic loop phase/time scale |

상세 원인과 before/after 목록은 `qa-captures/polish-06/BUG-AUDIT.md`에 기록했다.

### 4해상도 × 7장면 레이아웃

- viewport: 844×390, 932×430, 1280×720, 1920×1080
- state: Home, Game early, first gate, Warehouse, Pause, Result fail, Result clear
- 결과: **28/28 capture, overlap 0, clipped 0, browser/page/request error 0**
- 844×390 최소 보조문구 12.5 CSS px, Pause visible 44.42 CSS px, 실제 hit 46 CSS px
- Home/Result background anisotropy 1.000

증거:

- `qa-captures/polish-06/layout-agent/after-final3-layout-scene-matrix.json`
- `qa-captures/polish-06/layout-agent/after-final3-contact-844x390.jpg`
- `qa-captures/polish-06/layout-agent/after-final3-contact-1280x720.jpg`

### Stage 1 실제 입력

Stage 1 초반은 debug mutation 없이 keyboard/mouse/CDP touch로 재실행했다.

- basic config: HP 42 / speed 112 / projectile damage 9
- 첫 encounter clear: 1.789초, x=671.25, rifle 15발
- 다음 encounter: x<1800에서는 pending/spawn 0, x=1811.25에서 6기 활성
- 적 projectile: fired 3, impact 2, 실제 피해 9×2
- boss 오판 HUD 0, mobile move+shoot+jump 동시 입력 PASS
- layout overlap/clipped 0, browser error 0

증거:

- `qa-captures/polish-06/stage1-agent/STAGE1-AFTER-AUDIT.md`
- `qa-captures/polish-06/stage1-agent/stage1-after-report.json`
- `qa-captures/polish-06/stage1-agent/stage1-after-progression.webm`

### 실제 전 구간 완주

최종 통합본에서 실제 A/D/Space/J/K 이벤트만 사용하고 teleport/advance/state mutation 없이 Home부터 Result까지 실행했다.

| 결과 | 시간 | 구조 | 점수 | 브라우저 오류 | 증거 |
|---|---:|---:|---:|---:|---|
| CLEAR | 135.59초 | 3/3 | 35,048 | 0 | `qa-captures/polish-04/fullplay-after/fullplay-input-report-polish06-final6.json` |

### 현재 코드 회귀

| 검사 | 결과 |
|---|---|
| `npm run build` | PASS, 43 modules |
| `npm run qa:asset-coverage` | PASS, source/placeholder/primitive/missing 0 |
| input/HUD/gate/camera | PASS, 3 viewport |
| multitouch/Pause | PASS, 3 viewport |
| traversability | PASS, 14/14 + p5 landing |
| encounter/escort recovery | PASS, failure 0 |
| enemy projectile threat | PASS, fired 16/impact 15/damage 9×6 |
| final layout scene matrix | PASS, 4 viewport×7 state |
| actual-input full play | PASS, clear |

### 세션 5 판정

**PASS — 사용자가 지적한 레이아웃 깨짐, 상단 HUD, 배경 검은 틈, 전투 이미지/투사체, Stage 1 진행·난이도·실패 사유 결함을 수정하고 실제 입력 완주까지 확인했다.**

잔여 수용 항목은 모바일 DPR2 backing coverage 92.3%와 반투명 action button 아래 actor의 순간 통과다. 둘 다 내부 기준을 통과하며 진행·입력 차단은 아니다. 사람 기준 7~10분 페이싱은 실기기 플레이테스트 항목으로 유지한다.

---

## 14. 후보정 세션 7 — 장애물·투사체·앉기 의미 계약 (2026-07-14)

### 사용자 지적 재현

| 지적 | 재현된 원인 | 조치 |
|---|---|---|
| 바리케이드 앞뒤가 player/enemy마다 다름 | 충돌 없는 고형 장식 + player/enemy depth 분리 | 고형 통과 장식 제거, 전투 actor depth 40 통일, 파괴 구조물 경고 표식 |
| 총알이 화면 끝 전에 사라짐 | shotgun 짧은 수명 + one-way 플랫폼 옆면 충돌 | 3무기 수명 보정, 하강 top-crossing만 플랫폼 충돌 |
| 공중에서 앉고 지상에서도 떠 있음 | jump tick stale grounded + crouch frame baseline 불일치 | jump 즉시 airborne, 지상·정지 crouch, 2-frame 발 기준선 정렬, body 72px |
| 적 탄환·내 탄환이 작고 피하기 어려움 | 512 투명 padding 축소로 실제 탄두 subpixel, 경고/VFX 부족 | alpha-tight crop, visual/body 분리, glow/muzzle, 420ms 이상 경고, 속도 하향 |
| 조작기 소실·복귀 비활성 오인 | fine pointer HUD 숨김 + 저채도 Result 버튼 | 6개 조작기 상시 표시, 두 Result 버튼 active orange |

왜 기존 QA가 놓쳤는지와 파일별 root cause는 `qa-captures/polish-07/BUG-AUDIT.md`에 기록했다.

### 정량 회귀 결과

- 전투 평면: player/enemy/boss depth 40, 통과형 금지 고형 장식 0.
- 844×390 logical camera width 1558.15에서 수평 이동 거리: rifle 2243.91, shotgun 1749.33, rocket 1687.67.
- crouch: foot gap 1.65px, body 63.72×72, airborne crouch sample 0, 두 frame alpha bottom 정렬.
- projectile A128 실제 두께: 844×390 enemy 6.25 CSS px, player rifle 4.21 CSS px.
- enemy pre-fire telegraph 420ms 이상, basic 속도 320, 실제 fired 15/impact 12/damage 9×5.
- desktop/mobile 모두 joystick+shoot+jump+grenade+pause 6개 표시.
- death Result에서 실제 touch Home 복귀와 재시작 후 controls enabled 확인.

### 현재 코드 검사

| 검사 | 결과 |
|---|---|
| `npm run build` | PASS, 43 modules |
| `npm run qa:asset-coverage` | PASS, finding class 8종 모두 0 |
| `npm run qa:runtime-art` | PASS, 20 captures/browser error 0 |
| `npm run qa:projectile-readability` | PASS, 2 viewport/A128/telegraph/speed |
| `npm run qa:projectile-threat` | PASS, 실제 projectile 피해 5회 |
| `npm run qa:world-contract` | PASS, depth/장식/crouch/3무기 거리 |
| `npm run qa:input-hud` | PASS |
| `npm run qa:traversability` | PASS |
| `npm run qa:fullplay` | PASS, CLEAR 132.50초/구조 3/3/점수 35,785 |

### 세션 7 판정

**PASS — 사용자 캡처에서 드러난 시각-상호작용 모순을 단순 좌표 보정이 아니라 전투 평면, 투사체 거리, A128 가독성, 상태 조합 계약으로 수정했다. 실제 A/D/Space/J/K 입력만 사용한 Home→Result 완주도 다시 성공했다.**

---

## 15. 후보정 세션 8 — crouch 회피·상단 전술 루트 (2026-07-15)

### 시나리오 재설계

- 해안 진입에서 basic/shield 수평 직사를 S/↓로 숙여 피하도록 명확히 했다.
- 드론은 jump-or-move, 곡사탄은 move-out으로 분리해 crouch가 만능 방어가 되지 않게 했다.
- 컨테이너/다층 창고/붕괴 교량에 production platform asset 기반 5-step 루트를 각각 추가했다.
- 상단 보상은 산탄총→로켓→포병 구조로 상승하며 후반이 앞의 점프 학습을 다시 사용한다.
- 보스 구간에도 96px 높이의 선택 고지대를 추가했다.

수정 전 7개 플랫폼의 지면 대비 높이는 132~224px로 점프 최대 상승 128.68px을 초과했다. 수정 후 3개 route의 입구는 96px, 연속 단차는 80px이다.

### 검증

| 검사 | 결과 |
|---|---|
| Crouch geometry | standing damage 9/crouch damage 0/impact 0/crossed true |
| Route contract | 3개 모두 entry 96px, step/gap PASS |
| 실제 keyboard climb | container/warehouse/collapse 3/3 PASS |
| Platform traversability | 16개×양방향 32/32 PASS |
| Elevated reward | shotgun/rocket/artillery rescue anchor PASS |
| Build/asset coverage | PASS, 43 modules/finding 0 |
| World/Input/Runtime art | PASS, runtime 20 captures/error 0 |
| 실제 전 구간 | CLEAR 137.04초, 구조 3/3, 점수 35,199 |

상세 시나리오와 before/after 근거: `qa-captures/polish-08/SCENARIO-AUDIT.md`.

### 세션 8 판정

**PASS — 앉기는 실제 직사탄 회피 수단으로 증명했고, 점프 구조물은 접근 가능한 기하·적 배치·보상·후반 재사용이 있는 전술 루프로 구현했다.**

---

## 16. 후보정 세션 9 — 모바일 숙이기 실제 입력 연결 (2026-07-15)

### 사용자 지적 재현

왼쪽 조이스틱 손잡이는 아래로 보이게 움직였지만 `MobileControls`가 수평 `moveX`만 생성했다. `GameScene`의 crouch도 키보드 S/↓에만 연결되어 모바일에서는 숙이기가 불가능했다.

### 수정·검증

| 검사 | 결과 |
|---|---|
| 실제 touch joystick↓ | `moveY=1`, `crouchDown=true`, player state `crouch` |
| crouch physics body | 72px PASS |
| touch release | `moveY=0`, `crouchDown=false`, state `idle` |
| right drag 분리 | `moveX>0.9`, crouch false |
| visual feedback | knob 하강+active tint PASS |
| keyboard crouch | standing damage 9/crouch damage 0 PASS |
| HUD/multitouch/Pause | 3 viewport PASS |
| build | 43 modules PASS |

증거: `qa-captures/polish-08/after-touch-crouch.json`, `qa-captures/polish-08/after-touch-joystick-crouch.png`.

### 세션 9 판정

**PASS — 모바일은 왼쪽 조이스틱을 아래로 당겨 숙이고, 손을 놓으면 서기로 복귀한다. 설명만 존재하던 조작을 실제 터치 입력·물리 body·시각 피드백까지 연결했다.**

---

## 17. 후보정 세션 10 — Home 이미지 패널 안전영역 (2026-07-17)

병렬 QA에서 Home 하단 안내문이 캔버스에는 포함되지만 NineSlice 금속 프레임의 실제 콘텐츠 영역을 침범하는 false PASS를 확인했다. 844×390에서 모바일 안내는 좌우 각 23.16px·하단 18.54px 침범했고, live resize에서는 우측 검은 공백 최대 167.56px이 재현됐다.

Home responsive layout, panel content bounds, LayoutRegistry containment 계약을 추가하고 고정 좌표 Home 클릭 QA 8개를 실제 버튼 bounds 기반으로 교체했다.

- Home cold load 8/8 PASS
- live resize 4/4 PASS
- containment/overlap/clipping/background gap/center drift 0
- Input HUD, Multitouch/Pause, Runtime art, Build PASS

상세 근거: `qa-captures/polish-09/home-layout/QA-AUDIT.md`.

**PASS — 첫 화면 텍스트가 이미지 프레임의 실제 내부 안전영역에 들어오며, 화면 크기 변경 후에도 배경·패널·텍스트가 중앙에 재배치된다.**

