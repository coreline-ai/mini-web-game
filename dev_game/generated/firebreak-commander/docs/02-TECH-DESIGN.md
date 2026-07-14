# 02 · Technical Design — Firebreak Commander

## Runtime

- Phaser 3.90 + Vite 6
- 논리 캔버스 390x844, Scale.FIT, 최대 target DPR 3
- 10x15 grid, 36px cell, fixed tick 500ms
- gameplay state와 Phaser display object 분리

## Scene flow

`Boot → Loading → Home → Tutorial/Game → Pause → GameOver/Result`

## 핵심 시스템

| 시스템 | 책임 |
|---|---|
| `FireSimulationSystem` | 셀 상태, heat transfer, ignition, burn, objective damage, grid hash |
| `WindSystem` | seed와 독립된 phase별 방향·풍속 일정 |
| `CommandSystem` | 명령 선택, 방화선 preview/commit, 헬기, 소방차 |
| `ResourceSystem` | 물·연료 atomic 소비 |
| `ScoreSystem` | 진화·차단·전소·결과 점수 |
| `StageDirector` | tick 순서, 사전 예고 spot fire·바람·ember 이벤트, terminal 판정 |
| `GridRenderer` | terrain/fire/risk/objective/preview 렌더 |

## Tick order

예고/spot fire → 명령/소방차 냉각 → heat transfer → 발화 → 연료/전소 → 목표 피해 → terminal → 렌더 이벤트 순서입니다. 전파 계산은 별도 additions buffer를 사용해 배열 순서 의존을 방지합니다. 소방차는 반경 안에 `burning/heating` 셀이 있을 때만 물을 소비합니다.

## Input

- playfield 좌표를 grid cell로 변환
- 방화선은 Bresenham 보간으로 빠른 드래그 누락 방지
- HUD와 command dock 영역의 포인터는 playfield로 전달되지 않음
- invalid/cancel은 자원을 소비하지 않음

## Debug contract

`window.__FIREBREAK_DEBUG__.get()`은 seed, tick, wind, active/heated/burned/firebreak cell, resources, objectives, action counts, terminal, scene/audio/pool 수와 grid hash를 반환합니다. `advanceTicks`, `igniteCell`, `previewFirebreak`, `commitFirebreak`, `dropWater`, `deployTruck`, `forceWin/forceLose`를 제공합니다.

## Performance

simulation 2Hz, 최대 150 cells입니다. 이웃 cache와 무활성 fast path를 사용하고 `GridRenderer`는 화재/상태 texture map을 재사용하며 transient helicopter/dozer/water FX는 tween 완료 시 파괴합니다. 실제 180초 Chromium soak에서 최대 active fire sprite 21, scene stack 1을 기록했습니다.

## Schema v2 및 공통 QA 계약

- `game-spec.json`: schema 2.0.0, `buildDecision: custom-loop`, Foundation dummy entity 필드 없음.
- `gameRules.js`: `firebreakConfig.js`에서 duration/command cost/terminal 의미를 파생해 `window.__GAME_RULES__`로 게시.
- `LayoutRegistry`: scene별 `requiredIds`; 누락은 captured-state gate 실패.
- `MobileButton`: Scene transition은 pointerup one-shot, command dock은 반복 입력 유지.
- `window.__GAME_QA__`: `getState()`와 `audioState()` 공통 snapshot.
- `qa/capture-matrix.json`: 12 states × 3 viewports. Project capture driver가 상태 진입만 담당.
- `qa-session-report.json`: visual/clarity/input/audio/persistence/longRun/assetFidelity/gates 집계.
