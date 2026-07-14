# 06 · Final QA Summary — Firebreak Commander

## 판정

Pine Ridge 1-stage vertical slice의 기능, 전용 에셋/오디오, 실제 입력, 180초 밸런스, lifecycle과 scene-first 증거를 검증했습니다. 차단 결함은 없습니다.

## 자동 검증

| 영역 | 명령/증거 | 결과 |
|---|---|---|
| Build | `npm run build` | PASS |
| 순수 로직 | `npm run test:logic` | 10/10 PASS |
| 밸런스 | `npm run test:balance` | 9 scenarios PASS |
| 실제 입력 | `qa/interaction-qa.mjs` | 11 assertions, error 0 |
| Lifecycle | `qa/lifecycle-soak-qa.mjs` | Pause 10, Retry 5, visibility PASS |
| 실시간 soak | `FIREBREAK_REAL_SOAK=1 ...` | 180.598초, max fire 21, stack 1, error 0 |
| Production demo | `factory:production-demo-qa --require-gpt-imagegen` | PASS |
| Image quality | `factory:image-quality-qa` | 15 assets PASS |
| HQ screen | `factory:hq-screen-quality-qa` | 15 assets PASS |
| Visual layout | 390x844, 430x932, 1080x1920 | PASS |
| Scene composite | 동일 3 viewports | PASS |
| Full gate | `factory:production-gate --require-gpt-imagegen` | PASS |
| Touch target | `npm run test:touch-target` | 8 assertions PASS; visual 36px / touch 44px |
| Parallel patch browser sweep | browser/clarity/hostile/session/lifecycle/screens | PASS; 36 captures, overlap 0, errors 0 |

## 밸런스 증거

| 시나리오 | 결과 |
|---|---|
| 무행동 | 63.5초 첫 목표 피해, 173.5초 필수 목표 실패 |
| HELI 반복 | 물 0, tick 347 실패 |
| refuge 방화선 반복 | 남쪽 목표 상실, tick 347 실패 |
| 중간 방화선+HELI+ENGINE | tick 360, 필수 목표 보호 1성 |
| 방화선+HELI+ENGINE 해법 A | tick 360, 3성 |
| 방화선+HELI+ENGINE 해법 B | tick 360, 3성 |
| seed default/1/42 | 해법 A 모두 3성 |

세부 JSON은 `qa-captures/balance-results.json`에 있습니다.

## 시각·에셋 증거

- `assets/artboards/home.png`, `game.png`, `pause.png`, `gameover.png`: 2160x3840
- `assets/artboards/slice-map.json`: background/runtime/UI 소유권
- `assets/qa/contact-sheets/final-runtime-captures.png`: Loading/Home/Tutorial/3 phases/Pause/Win/Loss
- `assets/asset-manifest.json`: raw dimensions, source sheet, cropBox, postprocess, audio hash
- `art-prompts.md`: built-in imagegen prompt와 실제 provenance

## 알려진 비차단 사항

- Vite는 Phaser 단일 bundle이 500kB를 넘는 경고를 출력하지만 build 실패는 아니며 runtime QA는 통과했습니다.
- imagegen raw 배경은 941x1672이고 runtime 2160x3840은 후처리 산출물입니다. native 2160 생성으로 주장하지 않습니다.
- native app packaging, 서버, 멀티플레이, 실제 GIS 예측은 vertical slice 범위 밖입니다.
- 2026-07-14 수정분의 저사양 Android/iPhone 실기기 900초(15분) soak은 아직 실행 환경 밖입니다. QA Plan과 Regression Checklist에 기기별 기록 항목을 남겼으며, 배포 전 완료해야 합니다.

## 후보정 세션 1 — 2026-07-12

### 사용자 증상과 분류

| 사용자 원문 | 결함 클래스 | 심각도 | 근본 원인 |
|---|---|---:|---|
| “뭘 하자는 게임인지 모르겠어???” | C UI–Gameplay ambiguity + E Progression/Terminal explicitness | 2 | 첫 CTA가 설명을 건너뛰고, Home·HUD·행동 버튼이 영문 약어이며 승리 조건과 세 행동의 역할이 첫 플레이 경로에 노출되지 않음 |
| 동일 캡처에서 확인한 canvas backing 1× @ DPR2 | L Asset Fidelity · backing-store-too-small | 3 | 390x844 논리 캔버스를 CSS/DPR 화면에 그대로 확대 |

### 수정

- Home에 “180초 동안 마을과 변전소 보호” 목적을 상시 표시하고 CTA를 `출동 시작`, `게임 방법`으로 변경했습니다.
- 첫 출동 시 simulation을 멈춘 상태로 mission coach를 자동 표시합니다. 승리 조건, 방화선·헬기·소방차 조작, 주황색 위험 칸, 제한 자원을 한 화면에 설명합니다.
- HUD·목표물·행동 버튼·상황 메시지·Pause·Result를 런타임 한글 UI로 통일했습니다.
- `?` 도움말 버튼으로 mission coach를 언제든 다시 열 수 있게 했습니다.
- 행동 선택 직후 `드래그`, `불이 난 칸 탭`, `회색 도로 탭` 문맥 안내를 표시합니다.
- Home·mission coach·HUD의 제한 시간을 모두 180초로 통일했습니다.
- viewport fit scale × DPR에 맞춘 physical canvas와 logical camera zoom을 적용하고 Text texture도 동일 resolution로 생성합니다.

### 동일 조건 Before / After

- Before Home: `qa-captures/polish-01-before-home.png`
- Before Game: `qa-captures/polish-01-before-game.png`
- After Home: `qa-captures/polish-01-after-home.png`
- After first-run coach: `qa-captures/polish-01-after-coach.png`
- After contextual gameplay hint: `qa-captures/polish-01-after-gameplay.png`
- After persistent help reopen: `qa-captures/polish-01-after-help.png`
- Before sample: `qa-captures/polish-01-before-samples.json`
- After sample: `qa-captures/polish-01-after-samples.json`

### 기계 검증

- 명확성 assertions: 10/10 PASS
- browser/page errors: 0
- duplicate visible entities: 0
- lingering transient graphics: 0
- active BGM instances: 1
- scene stack: 1
- coach를 읽는 동안 simulation tick 정지, 닫은 뒤 재개
- 기존 `tutorialSeen=true` 저장 데이터도 새 coach를 1회 표시하는 migration PASS
- DPR2에서 canvas CSS 390x844 / backing 780x1688 / backingScale 2
- 실제 pointer 입력 assertions: 11/11 PASS
- 390x844, 430x932, 1080x1920 visual-layout: PASS
- 동일 3개 viewport scene-composite: PASS

## 후보정 세션 2 — 2026-07-12

### 사용자 증상과 분류

| 사용자 원문 | 결함 클래스 | 심각도 | 근본 원인 |
|---|---|---:|---|
| “각 시작 화면 도움말 화면 게임에 등장 하는 모든 화면을 캡쳐 해서 깨진 부분이나 이상한 레이아웃이 없는지 겹치는 부분이 없는지 확인 해줘!” | C UI–Gameplay 시각 모호성 + F/G 전체 화면 증거 요구 | 3 | Home·Result에 역할 없는 대형 삼각형/원 도형이 남아 있었고, 기존 캡처는 Tutorial·coach·동적 HUD 상태를 3개 viewport 모두에서 검사하지 않았음 |
| “아직도 게임 규칙을 잘 모르겠어!” | C UI–Gameplay ambiguity + E 목표·종료 조건 명시 실패 | 2 | 규칙 화면이 승리·패배·행동 비용·추천 순서를 한곳에 연결하지 않았고, HUD에서 현재 불꽃 수를 볼 수 없었음 |
| 전체 화면 스윕에서 발견한 풍향 전환 HUD 겹침 | C 동적 HUD overlap | 3 | `남동`처럼 긴 풍향 문자열과 45도 회전한 풍향 아이콘의 실제 bounds가 일시정지 버튼 쪽으로 겹침 |

### 수정

- Home의 추상 삼각형/원 장식을 제거하고 실제 방화선·헬기·소방차 에셋을 사용하는 `작전 목표` 카드로 교체했습니다.
- 게임 규칙을 `승리/패배`, 세 행동의 비용·조작, 주황색 위험 칸, 추천 순서까지 한 화면에서 읽히도록 재구성했습니다.
- 첫 실행 coach를 `모든 불꽃 0` 중심으로 다시 쓰고 즉시 패배 조건과 행동별 비용을 명시했습니다.
- HUD에 실시간 `불꽃 N`을 추가해 승리 진행도를 직접 확인할 수 있게 했습니다.
- Result의 임시 삼각형/원 및 `테스트 승리/실패` 문구를 실제 결과 아이콘·사유·재도전 안내로 교체했습니다.
- 풍향 텍스트와 회전 아이콘 위치를 조정해 동적 상태에서도 겹치지 않게 했습니다.
- `qa/all-screens-layout-qa.mjs`를 추가해 12개 화면 상태 × 3개 viewport를 매번 캡처하고 overlap/out-of-bounds/browser error를 검사합니다.

### Before / After 증거

- Before 전체 화면 contact sheet: `qa-captures/polish-02-before-all-screens-contact.png`
- After 390x844: `qa-captures/polish-02-all-screens/contact-390x844.png`
- After 430x932: `qa-captures/polish-02-all-screens/contact-430x932.png`
- After 1080x1920: `qa-captures/polish-02-all-screens/contact-1080x1920.png`
- 36개 원본 캡처: `qa-captures/polish-02-all-screens/<viewport>/*.png`
- 동일 세션 상태 샘플: `qa-captures/polish-02-all-screens/report.json`

### 기계 검증

- 화면 상태 12종 × viewport 3종 = 36 captures PASS
- layout overlap: 0
- out-of-bounds: 0
- browser/page errors: 0
- DPR2 backingScale: 2
- 명확성 10/10, 실제 pointer 입력 11/11
- logic 10/10, balance 9 scenarios
- Pause/Resume 10회, Retry 5회, logical 180초 soak PASS
- production gate, image quality 15 assets, visual-layout, scene-composite, HQ screen quality PASS

## Factory 정합화 세션 — 2026-07-12

- Firebreak spec을 schema v2/custom-loop로 마이그레이션하고 허위 player/falling hazard/coin/lives/difficulty 필드를 제거했습니다.
- config → GAME_RULES → UI/GDD Rules Contract를 연결했습니다. runtime/UI 26 assertions와 docs-runtime sync가 PASS입니다.
- manifest를 response-unit/protected-objective/hazard-fx/command-unit/risk-indicator/status-icon 역할로 마이그레이션했습니다.
- 일반 sprite/icon 10%, 강한 FX 12% 예외로 제작 파이프라인과 실파일을 재정규화했습니다.
- same-run report: `qa-captures/qa-session-report.json`.
- capture run: `qa-captures/captured-state/latest-report.json`, 36 captures, overlap 0, out-of-bounds 0, missing required IDs 0, browser errors 0.
- clarity 10, hostile input 12, session continuity 15, logic 10, balance 9, Pause 10/Retry 5/logical 180초 soak PASS.
- custom-loop full gate PASS, BGM instances ≤1, active scene stack 1, tween/timer/listener monotonic leak 0.
