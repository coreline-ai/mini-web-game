# 04 · QA Plan — Skybreak Gunship

## Capture matrix

| State | Required evidence |
|---|---|
| Loading/Home/Briefing | 390×844, no clipping, art ownership correct |
| Approach | civilian/hostile separated, reticle and convoy visible |
| Gun hit | aim → GUN hold → kill, score/combo/heat update |
| Missile hit | 650ms lock, ammo exactly -1, target removed |
| Escort/APC | conflict background, convoy damage, part feedback |
| Boss | bridge background, boss marker/weakpoint, no stale wave |
| Pause | weapons stop, scene stack exactly Game+Pause |
| Result/GameOver | reason, accuracy, convoy, retry/home |

## Assertions

- 한국어 목표와 조작법이 게임 시작 전에 표시된다.
- 첫 실행에서 실제 drag→GUN kill→MISSILE lock/release를 순서대로 수행해야 mission elapsed가 시작된다.
- 튜토리얼 완료 후 score 0, combo 1, heat 0, missile ammo 4로 본 임무가 시작된다.
- drag alone never fires.
- GUN release/pointerout/Pause stops firing.
- heat 100 locks; heat 40 unlocks.
- missile incomplete release consumes no ammo; complete release consumes one.
- missile never locks civilian/friendly.
- civilian strike updates penalty and fails exactly at 3.
- convoy HP 0 and boss victory each transition exactly once.
- browser console/page errors are zero.
- HUD/playfield/dock never overlap at 390×844, 430×932, 1080×1920.

## Current evidence

- 최신 captured-state run: `qa-captures/captured-state/2026-07-12T08-28-23-959Z/`
- 12상태 × 3 viewport contact sheet와 state sample: 총 36 captures.
- `qa-captures/combat-systems-results.json`: actual-input gun kill, missile ammo 4→3, soldier FSM, APC, boss phase, 승패.
- `qa-captures/lifecycle-soak-results.json`: 120초 가속, Retry 5회, 1,000 tracer, pool/audio/scene trend.
- `qa-captures/qa-session-report.json`: full production gate 최종 집계.
- `qa-captures/polish-03-before-briefing.png`, `polish-03-before-approach.png`: 설명 중심 프로토타입 baseline.
- `qa-captures/polish-03-after-home.png`, `polish-03-after-briefing.png`, `polish-03-after-tutorial-*.png`, `polish-03-after-mission-live.png`: 행동형 온보딩 after evidence.
