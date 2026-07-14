# 04 · QA Plan — Firebreak Commander

## 로직 QA

- 동일 seed/명령/tick의 grid hash 일치
- frame rate와 무관한 fixed tick 결과
- fast drag 보간 누락 0
- invalid/cancel 방화선의 연료 소비 0
- 헬기 비용 정확히 1회, cooldown 중 중복 소비 0
- 소방차 road-only와 최대 2대
- 목표 피해 simulation tick당 1회
- rock/river 발화 불가

`npm run test:logic`으로 순수 Node 회귀를 실행하고 `npm run test:balance`로 9개 승패/seed 시나리오를 검증합니다.

## 실제 입력 QA

- 390x844에서 방화선 선택→drag→release 실제 commit
- 시각 셀은 36px을 유지하고, 입력은 셀 중심 기준 최소 44px touch target으로 nearest-cell snap
- 첫/마지막 행·열의 44px edge halo와 보드 바깥 오터치 거부를 별도 검증 (`npm run test:touch-target`)
- 헬기 선택→화점 탭→water/fuel/heat 변화
- 소방차 선택→road 탭→지속 냉각과 water 감소
- HUD 오터치가 grid 명령으로 누수되지 않음
- Pause/Resume 10회, Retry 5회 후 scene stack/BGM/timer 증가 없음

## Captured states

Loading, Home, Tutorial, Game initial, firebreak preview/commit, helicopter drop, engine active, Wind Shift, Ember Warning/Event, Pause, Win, GameOver를 390x844/430x932/1080x1920에서 보존합니다.

## 장시간·lifecycle QA

- 실제 Chromium Pause/Resume 10회
- `visibilitychange` 자동 pause
- Retry 5회 후 scene stack 1, BGM 1
- 실제 wall-clock 180.598초 soak
- soak 최대 active fire sprite 21, scene stack 1, console/page error 0

## 실기기 900초 soak 체크리스트

현재 실행 환경에서는 Chromium logical 180초 soak까지만 자동 실행했습니다. 실제 배포 전 아래 항목을 저사양 Android/iPhone에서 각각 900초(15분) 기록합니다.

- [ ] 390x844 equivalent DPR 2~3 cold start → Home → Game
- [ ] 15분 동안 30fps target 유지, 입력 누락/프레임 급락 없음
- [ ] Pause/Resume, 앱 백그라운드·복귀, 화면 잠금·해제, 오디오 interruption 후 정상 복귀
- [ ] 메모리·display-list·tween·timer·listener가 시간에 따라 단조 증가하지 않음
- [ ] BGM instance ≤1, scene stack =1, browser/native error 0
- [ ] 900초 종료 후 terminal 결과·Retry·재시작 정상
- [ ] 기기 모델, OS, DPR, 평균/p95 FPS, touch latency, 메모리 peak, 배터리·열화 기록

## Production gates

`build`, `production-demo-qa --require-gpt-imagegen`, `image-quality-qa`, `visual-layout-qa`, `scene-composite-qa`, `hq-screen-quality-qa`, `production-gate`를 390x844/430x932/1080x1920 대상으로 실행합니다. 최신 증거는 `06-FINAL-QA-SUMMARY.md`에 고정합니다.

## Custom-loop Full Gate

```bash
npm --prefix ../../ run factory:production-gate -- --project generated/firebreak-commander --mode custom-loop-full
```

이 경로는 rules/docs sync, 12×3 captured states, first-play clarity, hostile input, corrupted storage·mute·best reload, audio scene cycle, visibility pause, logical 180초 soak, Retry 5회 resource counts, image/HQ를 같은 완료 흐름에서 실행합니다.
