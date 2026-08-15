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
