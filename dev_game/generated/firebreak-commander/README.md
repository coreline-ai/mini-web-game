# Firebreak Commander

모바일 세로 화면용 실시간 산불 방어 전략 액션입니다. 바람과 3틱 확산 예고를 읽고 방화선, 헬기, 소방차를 조합해 Pine Ridge의 마을·변전소·야생동물 보호구역을 지킵니다.

## 현재 구현

- Phaser 3 + Vite `custom-loop`
- 10x15 결정론적 격자와 500ms fixed simulation tick
- 시각 셀 36px을 유지하면서 44px minimum touch halo로 nearest-cell snap
- 8방향 바람, terrain별 발화·연료·습도·연소 규칙
- 드래그 방화선, 헬기 물 투하, 도로 전용 소방차
- 물·연료 자원과 명령 atomic commit/cancel
- 마을·변전소·보호구역 내구도, 승리·실패·별·점수
- Loading, Home, Tutorial, Game, Pause, GameOver/Result lifecycle
- `window.__FIREBREAK_DEBUG__` 결정론·상호작용 QA hook
- 게임 전용 imagegen 배경 3종·스프라이트/FX 12종·WAV 12종
- 순수 Node 로직·밸런스 회귀, 실제 Chromium 입력·lifecycle·3분 soak QA

## 실행

```bash
npm install
npm run test:all
npm run dev
npm run build
```

`npm run dev`는 `http://127.0.0.1:5188`에서 실행됩니다. 브라우저 QA는 기본적으로
같은 포트를 사용하며, 다른 주소가 필요하면 `FIREBREAK_QA_URL` 또는 `GAME_QA_URL`을 지정합니다.

```bash
FIREBREAK_QA_URL=http://127.0.0.1:5188 npm run test:touch-target
```

## 핵심 조작

처음 `출동 시작`을 누르면 승리 조건과 세 행동을 설명하는 mission coach가 표시되며, HUD의 `?`로 다시 열 수 있습니다.

- **승리:** 180초 안에 화면의 불꽃 수를 0으로 만듭니다.
- **패배:** 마을 또는 변전소 내구도가 0이 되거나 불이 남은 채 시간이 끝납니다.
- HUD의 `불꽃 N`이 남은 화재 수입니다. 주황색 칸은 다음 확산 위험 지역입니다.

1. `방화선` 선택 후 숲·초지를 드래그하고 손을 떼어 확산 경로를 끊습니다.
2. `헬기` 선택 후 불이 난 칸을 탭해 급한 화점을 진압합니다.
3. `소방차` 선택 후 남쪽 회색 도로를 탭해 주변을 지속 냉각합니다.

## Pine Ridge 밸런스

- 0~60초: Dry Front와 초기 화점
- 60~120초: SE Wind Shift와 dry-lightning spot fire
- 120~180초: Ember Night, ember event, 남쪽 최종 화점
- 방화선만 또는 헬기만 반복하는 해법은 실패합니다.
- 3성은 세 행동을 모두 사용하고 세 목표를 지키며 물 25 이상, 전소 셀 60 이하일 때 획득합니다.

## 검증 산출물

- `qa-captures/interaction-results-graybox.json`
- `qa-captures/balance-results.json`
- `qa-captures/lifecycle-soak-results.json`
- `qa-captures/capture-suite-results.json`
- `qa-captures/polish-02-all-screens/report.json` (12 states × 3 viewports)
- `assets/artboards/*.png`, `assets/artboards/slice-map.json`
- `assets/asset-manifest.json`, `art-prompts.md`

상세 검증 결과와 재발 방지 항목은 `docs/06-FINAL-QA-SUMMARY.md`, `docs/07-REGRESSION-CHECKLIST.md`에 기록합니다.
