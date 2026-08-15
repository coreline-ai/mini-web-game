# 06-FINAL-QA-SUMMARY — Keeper of the Last Light

작성: 2026-08-15 · 빌드 결정: `custom-loop` (schema v2) · 아트 경로: **Path A**

## 이 게임의 특별한 의의

저장소에서 **생성 영수증을 가진 첫 게임**이다. 기존 17개 게임의 자산 438개는 전부
영수증 이전에 만들어져 `legacy-1`로 표기돼 있고, 게이트의 SHA 실대조 분기는 어떤 실게임
에서도 실행된 적이 없었다. 이 게임의 16개 자산은 전부 `outputSha256`/`runId`/`generatedAt`을
갖고 파일 해시 대조를 통과한다.

## 파이프라인이 스스로 복구한 것

| 자산 | 검출 | 결과 |
|---|---|---|
| `stage-3` 배경 | soft edge 15 | 재시도 1회로 통과 |
| `stage-1`·`stage-2`·`stage-3` | flat palette (색수 부족) | 사유 주입 재생성으로 통과 |
| UI 3종 · FX 2종 | hf 상한 초과(노이즈) | 프롬프트 완화 + 재생성 |
| FX 2종 | 영수증-파일 SHA 불일치 | 자동 감지 → 재생성 |

## 캡처 검토에서 사람이 잡은 결함 (자동 게이트가 못 잡는 클래스)

| 증상 | 클래스 | 원인 | 수정 |
|---|---|---|---|
| 코드 패널은 주문을 표시하는데 **화면에 배가 없음** | C (UI/게임플레이 모순) | 디버그 훅이 이동 트윈까지 죽여 배가 화면 밖에 정지 | `Ship.settleNow()` 신설 — 목표 위치로 이동 후 대기 상태 전이 |
| 홈 재진입 시 BGM 크래시 | H (오디오 상태) | `this.sound` 버튼이 **Phaser 사운드 매니저를 가림** | `this.soundBtn`으로 개명 |
| 1080×1920에서 캔버스가 화면 밖으로 넘침 | L | `height:100%` 사슬이 실제 뷰포트보다 커짐 | `#game{position:fixed;inset:0}` |
| 레이아웃이 영원히 미공표 | F (증거 공백) | `publishLayout`이 worldView 미준비 시 조용히 반환, Home은 create에서 1회만 호출 | `publishLayoutStable` — 성공까지 다음 프레임 재시도 |

## 게이트 결과

| 게이트 | 결과 |
|---|---|
| `production-demo-qa --require-gpt-imagegen` | **OK** (영수증 SHA 대조 포함) |
| `image-quality-qa` | **OK** (12 자산, role별 기준) |
| `hq-screen-quality-qa` | **OK** (16 자산) |
| `visual-layout-qa` (3 뷰포트) | **OK** (backingScale assert 포함) |
| `captured-state-qa` | **OK** — 24 캡처, 겹침 0, 미싱 0, 브라우저 에러 0 |
| `docs-runtime-sync-qa` | **OK** |
| `test:rules` (Rules Contract) | **OK** — 7 assert |
| `test:clarity` (첫 플레이 이해도) | **OK** — 5 필수 assert |
| `test:hostile-input` (입력 견고성) | **OK** — 연타·멀티터치·오버레이 차단 |
| `test:session` (지속성) | **OK** — 손상 저장소·설정 유지·BGM 중복 0·visibility |
| `test:lifecycle` (장시간) | **OK** — 5회차 트윈 7 / 풀 6 완전 일정 (누수 0) |

## 상태 샘플 실측 (5회 반복)

```
round 0..4 : activeTweens 7 / activeTimers 0 / poolSize 6 / liveShips 4 / bgm 1
```

풀 크기와 트윈 수가 회차와 무관하게 일정하다 — 고정 풀 설계가 의도대로 작동한다.

## DPR 증거

| 뷰포트 | backingScale | dpr | 판정 |
|---|---:|---:|---|
| 390×844 | 3.00 | 2 | ✔ |
| 430×932 | 2.72 | 2 | ✔ |
| 1080×1920 | 1.32 | 1 | ✔ |

논리 캔버스 1170×2532(390×844의 3배)가 모든 뷰포트에서 `min(dpr, maxTargetDpr)` 이상을 만족한다.

## 증거 경로

- 캡처: `qa-captures/captured-state/<runId>/{390x844-dpr2,430x932-dpr2,1080x1920-dpr1}/*.png`
- 컨택트 시트: 같은 폴더의 contact sheet
- 세션 종합: `qa-captures/qa-session-report.json`
- 어댑터 리포트: `qa-captures/{clarity,input-hostility,session-continuity,rules-sync,lifecycle-soak}-results.json`

## 남은 확장 아이디어 (비차단)

- 동시 대기 배가 많을 때 **포커스 배 시각 강조** — 현재는 "가장 급한 배"가 자동 선택되지만
  플레이어가 어느 배에 답하는지 화면만으로는 덜 명확하다.
- 코드 입력 중 오답 시점을 색으로 즉시 표시(현재는 판정 후 인내심 감소로만 전달).
- 스테이지 전환 시 배경 크로스페이드에 맞춘 BGM 레이어 추가.
