# 04-QA-PLAN — Keeper of the Last Light

## 공통 스모크

- 캔버스 렌더, PLAY로 게임 진입, 콘솔/페이지 에러 0
- 램프 입력이 실제로 상태를 바꾸는가(버퍼에 펄스가 쌓이는가)
- 장르 고유 행동: 코드 완성 시 배가 항로로 빠져나가는가

## 장르 고유 검증

| 항목 | 기대 |
|---|---|
| 짧게/길게 구분 | `longPressMs` 미만은 `▪`, 이상은 `▬` |
| 접두사 오답 | 첫 펄스가 어긋나면 즉시 `wrong` 판정 |
| 유휴 리셋 | 마지막 펄스 후 `inputResetMs` 경과 시 버퍼 비움 |
| 포커스 선택 | 인내심이 가장 적게 남은 대기 배가 판정 대상 |
| 인내심 소진 | 0이 되면 난파, 난파 3회에 패배 터미널 |
| 쿼타 달성 | 스테이지 5 통과 시 승리 터미널 |

## 캡처 매트릭스

뷰포트 390×844(dpr 2) · 430×932(dpr 2) · 1080×1920(dpr 1).

| state | 씬 | 확인 대상 |
|---|---|---|
| `loading` | Loading | 타이틀·상태 문구 |
| `home` | Home | 첫 플레이 5요소, 코드표, PLAY/SOUND 버튼 규격 |
| `game-stage-1` | Game | 맑은 밤 배경, HUD, 코드 패널, 램프 |
| `game-typing` | Game | 펄스 입력 중 버퍼 표시 |
| `game-stage-3` | Game | 짙은 안개 배경 전환, 동시 대기 다수 |
| `pause` | Pause | 일시정지 오버레이 |
| `help` | Pause(help) | 코드표 도움말 |
| `result-win` | GameOver | 승리 터미널 |
| `result-loss` | GameOver | 패배 터미널 |

## 상태 샘플 필수 필드

`browserErrors: 0`, `duplicateVisibleEntities: 0`, `lingeringTransientGraphics: 0`,
`activeBgmInstances ≤ 1`, 스테이지/인도 척수/난파 수, 풀의 배별 `alpha/visible/active`,
`activeTweens`/`activeTimers`, `devicePixelRatio`/`backingScale`.

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

- 클래스 B: 배경에 배가 구워져 있지 않은가 — **캡처를 눈으로 본다**
- 클래스 C: 화면의 모든 도형이 의도된 렌더인가, 남은 FX가 눌어붙지 않았는가
- 클래스 D: 난이도가 회복 가능한 자원을 참조하지 않는가 — 코드 리뷰
- 클래스 M: 램프 히트 영역이 보이는 스프라이트와 맞는가
