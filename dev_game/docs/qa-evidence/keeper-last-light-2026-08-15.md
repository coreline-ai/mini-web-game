# QA Evidence — Keeper of the Last Light (2026-08-15)

`dev_game/generated/**`는 기본 gitignore이므로 이 요약이 추적되는 증거다.

## 게임

- id `keeper-last-light` · schema v2 · `buildDecision: custom-loop`
- 등대 불빛으로 신호 코드(짧게▪/길게▬)를 보내 배를 인도하고 여명까지 버티는 게임
- 논리 캔버스 1170×2532 (390×844의 3배 — DPR 백킹스토어 계약)

## 저장소 최초 사실

이 게임은 **생성 영수증을 가진 첫 게임**이다. 기존 17개 게임의 438개 자산은 전부 영수증
도입 이전이라 `legacy-1`로 표기돼 있고, 게이트의 SHA 실대조 분기는 실게임에서 한 번도
실행된 적이 없었다. 이 게임의 16개 자산은 전부 `outputSha256`/`runId`/`generatedAt`을 갖고
파일 해시 대조를 통과한다.

## 아트

Path A(`asset-plan.json` → `factory:imagegen`) 전 구간 완주. 배경 5 · 스프라이트 4 ·
UI 3 · FX 4 = 16자산, 전부 이 게임 전용 신규 생성. 오디오 7종은 절차적 WAV(외부 서비스 없음).

파이프라인 자가 복구 실적: soft edge 1건, flat palette 3건, hf 초과 5건, SHA 불일치 2건이
검증·재시도로 해소됐다.

## 게이트

| 게이트 | 결과 |
|---|---|
| production-demo-qa (`--require-gpt-imagegen`) | OK — 영수증 SHA 대조 포함 |
| image-quality-qa | OK (12) |
| hq-screen-quality-qa | OK (16) |
| visual-layout-qa (390×844 / 430×932 / 1080×1920) | OK — backingScale assert 포함 |
| scene-composite-qa | OK |
| captured-state-qa | OK — 24 캡처 / 겹침 0 / 미싱 0 / 에러 0 |
| docs-runtime-sync-qa | OK |
| test:rules · test:clarity · test:hostile-input · test:session · test:lifecycle | 전부 OK |

backingScale: 390×844 → 3.00 / 430×932 → 2.72 / 1080×1920 → 1.32 (모두 `min(dpr,3)` 이상)

장시간 5회차 실측: activeTweens 7 · poolSize 6 · bgm 1 — 회차와 무관하게 일정(누수 0).

## 이 데모가 드러낸 파이프라인 결함 (전부 수정됨)

| 결함 | 영향 범위 |
|---|---|
| v2 custom-loop는 tier 승격이 **구조적으로 불가능**했다 (아케이드 role 목록만 참조) | 모든 custom-loop 게임 |
| UI/FX 루프가 plan **사본**을 순회해 경로 갱신이 유실 → 재생성분이 낡은 파일을 가리킴 | 모든 게임의 UI/FX 재생성 |
| custom-shell 스캐폴드에 `vite.config.js` 부재 → `publicDir` 미설정으로 dist에 에셋 미복사 | 모든 custom-shell 게임 |
| 생성 시점 검증에 hf·색수 검사 부재 → 게이트가 몇 분 뒤에야 잡음 | 모든 아트 생성 |
| `publishLayout`이 worldView 미준비 시 조용히 반환 → create 1회 호출 씬은 영원히 미공표 | 모든 custom-shell 씬 |
| dist에 `_source` 마스터까지 복사 (54MB → 4.9MB) | 모든 custom-shell 게임 |

## 캡처 검토(수동)에서 잡은 게임 결함

- 코드 패널은 주문을 표시하는데 화면에 배가 없음 → `Ship.settleNow()` 신설
- 홈 재진입 시 BGM 크래시 — `this.sound`가 Phaser 사운드 매니저를 가림 → `soundBtn`으로 개명
- 1080×1920에서 캔버스가 뷰포트 밖으로 넘침 → `#game{position:fixed;inset:0}`

## 증거 위치 (미추적)

`dev_game/generated/keeper-last-light/qa-captures/` — captured-state 스크린샷 24장,
컨택트 시트, `qa-session-report.json`, 어댑터 리포트 5종.


---

## 후보정 세션 #1 (같은 날)

사용자 보고: "게임 레이아웃 구도가 이상하고 무엇보다 효과음과 음원이 아주 품질이 낮아".
Step 0 회귀 재실행은 클린이었고, 두 증상 모두 재현·수정·재캡처했다.

### 오디오 (심각도 2)

`scripts/make-audio.mjs` 신설, 7파일 전량 재합성. 배음 스택(배음별 개별 감쇠), 코사인 페이드
엔벨로프, 슈뢰더 리버브 축약판, 루프 꼬리 크로스페이드.

| 지표 | 이전 → 이후 |
|---|---|
| 샘플레이트 | 16k(BGM)/22k(SFX) → **44.1k 전부** |
| BGM 루프 | 6.0s → **22.8s** |
| 피크 레벨 | 0.16~0.50 → **0.80~0.90** |
| `wreck` 시작 팝 | 0.150 → **0.000** |
| 루프 이음매 | 0.0154 → **0.0026** |

### 레이아웃 (심각도 2~4)

캡처를 눈으로 보고 5건을 잡았다. 전 게이트가 GREEN인 상태에서 발견된 것들이다.

| 결함 | 수정 |
|---|---|
| 항로 4개 중 2개가 수평선 위 → 배가 하늘에 뜸 | 항로 3개를 전부 수평선 아래로 재배치 |
| **두 배가 한 자리에 겹침** | 항로를 순번이 아니라 **점유 여부**로 배정, 빈 항로 없으면 생성 거부 |
| 패널 텍스트가 판 밖에 표시 | 패널 자산의 투명 여백 29% → 재생성(보이는 판 41.6% → 92.6%) |
| 배마다 게이지 높이가 다름 | 텍스처별 선체 상단 비율(알파>64 실측)로 부착 |
| `⚓`만 흰색 | 기호에 U+FE0E로 텍스트 프레젠테이션 강제 |

### 검증

- `production-gate --mode custom-loop-full` **OK**
- 전수 게이트 **18/18**
- 캡처 24 / 겹침 0 / 범위이탈 0 / 미싱 0 / 브라우저 에러 0
- 어댑터 5종 전부 OK, 게임 에러 0
- 장시간 5회차: 트윈 `3,3,3,3,3` · BGM `1,1,1,1,1` (누수 0)

### 계약 승격

`post-production-qa-contract.md` 클래스 C에 증상 3건 + **게이트 공백 3건**을 명시했다.
핵심: UI 자산의 *과도한* 투명 여백은 어떤 게이트도 잡지 않는다 — 패딩 검사는 하한(잘림)만
보고, 그것도 `core` 역할에만 적용된다.
