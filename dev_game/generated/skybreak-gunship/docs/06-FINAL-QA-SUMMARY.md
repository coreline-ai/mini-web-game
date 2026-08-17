# 06 · Final QA Summary — Skybreak Gunship

## 판정

`Skybreak Gunship` 90초 Vertical Slice는 **production-demo 통과**다.

- 최종 게이트 실행: `2026-07-12 16:04~16:08 KST`
- 최종 captured-state run: `2026-07-12T08-28-23-959Z`
- Production Gate: exit code `0`
- 열린 Severity 1/2 결함: `0`

## 구현 완료 범위

- 390×844 논리 좌표와 최대 DPR 3 backing store
- Home, Loading, Briefing, Game, Pause, Result, GameOver
- Approach, Escort, Armor Break, Boss/Extraction 4구간
- drag 조준, 10 rps 30mm 기관포, heat 100 잠금/40 복구
- 650ms lock, release launch, 최대 4개 pooled homing missile
- 소총병/로켓병 expose→aim→fire→cover FSM
- 드론, 민간인, 구조 차량, 장갑차 3부위 파괴
- 공격 헬기 3페이즈와 로터/미사일 포드 약점
- 전용 BGM·rotor·boss·gun loop 및 전투 SFX
- 16-slot tracer/impact pool, 전투 경고, recoil/shake/explosion
- 1440×3120 배경 3종, 전용 runtime sprite/UI/FX, scene-first artboard 5종

## 최종 게이트 결과

| 검증 | 결과 | 증거 |
|---|---|---|
| Build | PASS | Vite 35 modules, exit 0 |
| Production demo contract | PASS | `qa-captures/qa-session-report.json` |
| Image quality | PASS | 22 role-aware assets |
| Visual layout | PASS | 390×844, 430×932, 1080×1920 |
| Scene composite | PASS | runtime recomposition pixel inspection |
| Captured state | PASS | 36 captures, overlap/out-of-bounds/missing/error 모두 0 |
| First-play clarity | PASS | 8/8 assertions, DPR backing store 포함 |
| Input hostility | PASS | 빠른 release, lock 취소, scene/BGM 안정성 |
| Session continuity | PASS | Home↔Game 3회, BGM 중복 0, corrupted save 복구 |
| Rules sync | PASS | 20 assertions, 18 schedule entries |
| Lifecycle soak | PASS | 120초, Retry 5회, 1,000 tracer, bounded pools |
| Combat systems | PASS | 13 gameplay assertions |
| HQ screen quality | PASS | 22 assets, source/backing fidelity |

## 캡처 증거

- 보고서: `qa-captures/captured-state/2026-07-12T08-28-23-959Z/report.json`
- 390×844 DPR2: `qa-captures/captured-state/2026-07-12T08-28-23-959Z/contact-390x844-dpr2.png`
- 430×932 DPR3: `qa-captures/captured-state/2026-07-12T08-28-23-959Z/contact-430x932-dpr3.png`
- 1080×1920 DPR1: `qa-captures/captured-state/2026-07-12T08-28-23-959Z/contact-1080x1920-dpr1.png`
- 보스 3페이즈: `qa-captures/combat-boss-phase3.png`

최신 캡처 집계는 `captures=36`, `overlaps=0`, `outOfBounds=0`, `missingRequiredIds=0`, `assertionFailures=0`, `browserErrors=0`이다.

## 실제 전투 검증

`qa-captures/combat-systems-results.json`에서 다음을 실제 브라우저 입력과 debug adapter를 함께 사용해 검증했다.

- 로켓병 4상태 FSM과 cover 중 피격 불가
- 실제 GUN hold로 소총병 제거 및 콤보 증가
- heat 100 과열과 heat 40 복구
- 미완성 lock 탄약 보존, 완성 lock homing missile 1발 소비
- 민간인 자동 lock 제외와 오인 사격 1회 페널티
- 장갑차 포탑 파괴 후 공격 중단
- 보스 phase 1→2→3
- 보스 미사일 포드 파괴 후 missile payload 차단
- GUN/MISSILE command 상호 배타 정책
- Result와 GameOver 양쪽 terminal 도달

## 후보정에서 닫은 결함

| 분류 | 증상 | 원인 | 수정 | 재검증 |
|---|---|---|---|---|
| entity-lifecycle race | 두 번째 임무 진입에서 `drawImage` null 예외 | Phaser가 재사용한 `GameScene`에 파괴된 `phaseLabel` 참조 잔존 | `create()`에서 scene-owned 참조 초기화 | 6회 lifecycle + full gate PASS |
| entity-lifecycle race | shutdown 중 Canvas source 경합 가능 | display object를 cleanup과 Phaser가 이중 파괴 | cleanup은 listener/timer만 정리하고 display-list 파괴는 Phaser에 위임 | browserErrors 0 |
| UI/gameplay ambiguity | HUD help/pause 근접 및 캡처 상태 간섭 | 상단 hit-zone 간격 부족 | help 중심과 capture setup 조정 | 36 captures overlap 0 |
| progression completeness | 보병 엄폐와 보스 단계가 정적 | 전용 controller 부재 | EnemySoldier/AttackHelicopterBoss controller 추가 | combat assertions PASS |
| session continuity | 장면 반복 시 오디오/장면 중복 위험 | 전역 slot과 종료 정리 증거 부족 | capped audio slots, delayed transition, soak/session QA | BGM/rotor ≤1 |

## 잔여 항목

Production-demo 차단 결함은 없다. EMP·연막·레이저, 추가 지역, 무한 웨이브, 메타 성장, 네이티브 패키징은 문서상 제외 범위이며 후속 제품화 과제다.

생성 프로젝트는 상위 저장소 정책상 `generated/**`에서 gitignored일 수 있으므로, 버전 관리가 필요하면 이 폴더와 `qa-captures/`를 명시적으로 보존해야 한다.

## Polish Pass 4 — 첫 위협 인지와 QA 실행 주소 고정

- 증상: 첫 Approach 구간에서 적 위협 인지가 늦고, 일부 QA 스크립트가 다른 프로젝트의 `5173`으로 fallback함
- 분류: C. UI–Gameplay 시각 모호성 + F. Evidence gap, Severity 2
- 원인: 첫 적 스폰이 2.0초였고, QA 스크립트별 기본 URL이 5173/5187로 분산됨. 튜토리얼 중 예약된 coach 후속 timer도 실제 임무와 분리되어 있지 않았음
- 수정:
  - 첫 rifleman schedule을 1.5초로 당겨 Approach 초반에 적 실루엣과 red-diamond marker가 노출되도록 조정
  - 첫 hostile spawn 시 `HOSTILE CONTACT · 빨간 마름모 = 적` one-shot 경고 추가
  - tutorial 비활성/완료 이후에만 coach follow-up timer를 한 번 예약하고, shutdown에서 제거
  - `CombatTutorial.complete()`이 동일한 coach 시작 경로를 호출하도록 통합
  - Skybreak QA 기본 URL을 전부 `http://127.0.0.1:5187`로 통일하고 `GAME_QA_URL` override만 허용
- 변경 범위: `src/game/scenes/GameScene.js`, `src/game/systems/MissionDirector.js`, `src/game/ui/CombatTutorial.js`, `qa/*.mjs`, `docs/07-REGRESSION-CHECKLIST.md`
- 자동 재검증: build PASS, rules 20/20 PASS, combat 13/13 PASS, lifecycle 120초·Retry5 PASS, input hostility PASS, session continuity PASS, clarity PASS, browserErrors 0
- 재검증 증거: `qa-captures/combat-systems-results.json`, `lifecycle-soak-results.json`, `input-hostility-results.json`, `session-continuity-results.json`, `clarity-results.json`
- 전체 production gate 및 36-capture 재수행은 Root 통합 단계에서 5187 listener로 실행한다.

## Polish Pass 5 — 전투 무기 가시성·엄폐 보정·홈 여백

- 사용자 증상: Home의 `90초 작전` 설명 하단 여백이 상단보다 좁음; 병사가 전투 중 에너지 사각형처럼 변함; 기관포·유도 미사일의 발사 위치와 실체가 보이지 않음; 무기 사운드가 입력과 분리되어 들림.
- 분류: C. UI–Gameplay 시각 모호성 + H. Audio State/feedback + L. Asset/runtime fidelity, Severity 2.
- 원인:
  - Home mission panel 높이 76px에 설명 텍스트가 하단에 붙어 bottom padding이 약 3px까지 줄어듦.
  - `EnemySoldier` cover 상태가 적 스프라이트 위에 큰 불투명 rounded rectangle을 그려 병사가 사각형으로 교체된 것처럼 보임.
  - GameScene에 플레이어 건십 runtime sprite가 없어 기존 tracer가 화면 하단 HUD 아래의 `(195,710)`에서 시작함.
  - 미사일도 동일한 하단 좌표에서 시작해 실제 발사 플랫폼이 보이지 않았고, 무기 버튼 입력 시 오디오 unlock이 보장되지 않음.
- 수정:
  - Home mission panel을 `336x76 @ y503`에서 `336x88 @ y507`로 확장해 설명 아래 여백을 상단 여백과 맞춤.
  - GameScene 상단 전장에 `hero_gunship` runtime sprite를 추가하고 실제 chin-gun muzzle 및 양측 missile rack 기준점을 정의.
  - 30MM 기관포 tracer를 연속 레이저 선에서 3개의 주황색 탄환 streak + 흰색 core + muzzle flash로 변경.
  - 유도 미사일을 gunship rack 기준점에서 발사하고 실물 missile sprite·cyan launch ring·trail을 함께 표시.
  - 무기 버튼 down에서 `AudioManager.unlock()`을 호출하고 gameplay/rotor/gun loop 및 missile launch 볼륨을 전투 피드백에 맞게 조정.
  - 보병 cover 표현을 큰 사각형에서 병사가 계속 보이는 낮은 barricade silhouette로 교체.
- 변경 파일:
  - `src/game/scenes/HomeScene.js`
  - `src/game/scenes/GameScene.js`
  - `src/game/systems/WeaponSystem.js`
  - `src/game/systems/AudioManager.js`
  - `src/game/entities/EnemySoldier.js`
- Before/after evidence:
  - `qa-captures/polish-04-home-spacing.png`
  - `qa-captures/polish-04-game-gunship.png`
  - `qa-captures/polish-04-gun-fire.png`
  - `qa-captures/polish-04-missile-fire.png`
  - `qa-captures/polish-04-soldier-cover.png`
- 재검증:
  - `npm run build` PASS, 36 modules.
  - `node qa/clarity-qa.mjs` PASS, 17 assertions, browserErrors 0.
  - `node qa/input-hostility-qa.mjs` PASS, browserErrors 0.
  - `npm run test:combat` PASS, 13/13.
  - `npm run test:lifecycle` PASS, 120초·Retry 5회, tracer pool 16, missile pool ≤4, BGM/rotor ≤1.
  - 실제 캡처에서 gunship muzzle→orange ballistic streak, missile rack→guided missile, soldier cover silhouette를 확인.

## Polish Pass 2 — 실행 주소 충돌

- 사용자 증상: `동작을 안한는데?`
- 분류: runtime availability / local port collision, Severity 1
- 재현: 기존 안내 주소 `127.0.0.1:5173` 접속 실패
- 원인: Skybreak 개발 서버는 종료됐고, 5173은 다른 프로젝트 `useful_git_info`가 점유
- 수정: Skybreak 전용 주소를 `127.0.0.1:5187`로 고정하고 서버 재기동
- 예방: `npm run dev`를 `vite --host 127.0.0.1 --port 5187 --strictPort`로 고정
- 재검증: Chromium combat assertions 13/13, session continuity PASS, browserErrors 0

## Polish Pass 3 — 게임 방법과 플레이 상태가 불명확함

- 사용자 증상: `뭐 어떻게 하는거야? 왜 겜을 만들고 플레이 할 수 있는 상태로 완성을 안하는거야? 지금 이게 겜이야? 뭐야?`
- 분류: C. UI–Gameplay 시각 모호성 + E. 목표·진행 명시 실패
- 심각도: Severity 1 — 첫 플레이 진행 차단
- 원인: 영문 Briefing과 정적인 텍스트만 존재했고, 실제 행동을 요구하는 튜토리얼이 없었다. 자동 QA는 debug adapter로 전투를 건너뛰어 이 문제를 놓쳤다.
- 수정:
  - Home 목표·CTA와 Briefing/IFF/조작법을 한국어로 재작성
  - 첫 실행에 `조준 → 기관포 적 제거 → 미사일 잠금·발사` 3단계 실전 훈련 추가
  - 훈련 중 mission elapsed와 MissionDirector 정지
  - 단계별 목표물·화살표·무기 버튼 안내 추가
  - 훈련 종료 시 score 0, combo 1, heat 0, ammo 4로 본 임무 초기화
  - 완료 상태를 localStorage에 저장하고 이후 재도전에서는 즉시 임무 시작
- Before: `qa-captures/polish-03-before-briefing.png`, `qa-captures/polish-03-before-approach.png`
- After: `qa-captures/polish-03-after-home.png`, `polish-03-after-briefing.png`, `polish-03-after-tutorial-aim.png`, `polish-03-after-tutorial-gun.png`, `polish-03-after-tutorial-missile.png`, `polish-03-after-mission-live.png`
- 실제 입력 검증: 9 assertions PASS, browserErrors 0
- 상태 증거: step 0/1/2 동안 elapsed 0, 완료 후 elapsed >0, ammo 4, score 0, combo 1, tutorial 저장값 1
- 최종 Production Gate: PASS (`2026-07-12T08-28-23-959Z`), 36 captures, overlap/out-of-bounds/missing/browserErrors 모두 0
