# 04-QA-PLAN — Last Minute Keeper

## 이 게임의 1순위 검증 — "정적이지 않은가"

사용자 요구가 "더욱 인터랙티브하고 정적이지 않게"였으므로, 그것이 통과/실패 항목이다.

- 모든 게임플레이 캡처에 **움직이는 공이 있는가**
- 공이 없는 정지 상태가 **1초 이상 지속되는 구간**이 설계상 존재하는가 (있으면 실패)
- 세이브 직후 리바운드가 **살아서 다음 위협**이 되는가

## 공통 스모크

캔버스 렌더 / PLAY로 진입 / 콘솔·페이지 에러 0 / 드래그가 키퍼를 실제로 움직임 /
플릭이 다이브를 유발 / 슛이 골라인에서 판정됨.

## 장르 고유 검증

| 항목 | 기대 |
|---|---|
| 드래그 vs 플릭 | 느린 드래그는 다이브를 유발하지 않고, 빠른 플릭은 이동으로 오인되지 않는다 |
| 다이브 회복 | 회복 시간 동안 드래그 입력이 **무시된다** |
| 관성 | 키퍼가 순간이동하지 않는다(최고 속도·가속 상한) |
| 커브 | 감아차기의 x 궤적이 직선이 아니다 |
| 높이 | 로빙에서 그림자와 공의 간격이 강슛보다 넓다 |
| 리바운드 | 세이브 후 공이 사라지지 않고, 최대 3회·2600ms 상한이 지켜진다 |
| 판정 body | 다이브 상태의 body가 뻗은 팔까지 포함한다(클래스 M) |
| 터미널 | 승리(스테이지 5 종료)·패배(실점 5) 양쪽 도달 가능 |

## 캡처 매트릭스

뷰포트 390×844(dpr 2) · 430×932(dpr 2) · 1080×1920(dpr 1).

| state | 씬 | 확인 대상 |
|---|---|---|
| `home` | Home | 첫 플레이 5요소, 버튼 규격 |
| `game-flight` | Game | 공이 비행 중(정지 화면이 아님), 스코어보드, 키퍼 |
| `game-dive` | Game | 다이브 자세 + 늘어난 판정 범위 |
| `game-rebound` | Game | 리바운드가 살아 있는 혼전 |
| `game-stage-3` | Game | 야간 조명 배경 + 동시 공 2개 |
| `help` | Pause(help) | 조작 설명 |
| `pause` | Pause | 일시정지 오버레이 |
| `result-win` | GameOver | 승리 터미널 |
| `result-loss` | GameOver | 패배 터미널 |

**캡처는 실제 도달 가능한 상태만 담는다.** 디버그 훅이 스테이지 동시 공 상한을 넘기면
실제 플레이에 없는 화면이 증거로 남는다(직전 게임에서 실제로 발생).

## 상태 샘플 필수 필드

`browserErrors: 0`, `duplicateVisibleEntities: 0`, `lingeringTransientGraphics: 0`,
`activeBgmInstances ≤ 1`, 스테이지/실점/세이브 수, 살아있는 공의 `alpha/visible/active`,
키퍼 자세와 body 크기, `activeTweens`/`activeTimers`, `devicePixelRatio`/`backingScale`.

## 오디오 검증

샘플레이트 ≥ 44100 / 원샷 피크 ≥ 0.75 · 시작·끝 < 0.01 / 루프 이음매 < 0.005 · 시작 < 0.01.

## 생산 게이트

```
factory:production-demo-qa -- --require-gpt-imagegen   (영수증 SHA 대조 포함)
factory:image-quality-qa
factory:visual-layout-qa    (backingScale assert)
factory:scene-composite-qa
factory:production-gate -- --mode custom-loop-full     (아래 8종 포함)
```

`custom-loop-full-qa` 8종: captured-state · first-play-clarity · input-hostility ·
session-continuity · docs-runtime-sync · image-quality · hq-screen-quality · qa-session-report.

## 수동 검사 (계약 §3.1이 자동 게이트 없음으로 규정)

- 클래스 B: 배경에 공·키퍼가 구워져 있지 않은가 — **캡처를 눈으로 본다**
- 클래스 C: 화면의 모든 도형이 의도된 렌더인가, 남은 FX가 눌어붙지 않았는가
- 클래스 D: 난이도가 회복 가능한 자원을 참조하지 않는가 — 코드 리뷰
- 클래스 M: 키퍼 판정 body가 보이는 스프라이트와 맞는가(**다이브 포함**)
- 클래스 L: UI 프레임이 9-slice이고 표시 테두리가 사방 균일한가
