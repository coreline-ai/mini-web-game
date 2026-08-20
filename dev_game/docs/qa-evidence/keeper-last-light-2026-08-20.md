# keeper-last-light — 후보정 세션 #4 (2026-08-20)

## 증상
게이트의 브라우저 단계가 간헐적으로 실패했다. 실패 서명은 `__GAME_LAYOUT_BOUNDS__ missing` /
`scene "Game" not reached in 15000ms — registry still reports "(none)"` — 게임이 **아예 부팅하지
못한** 것이다. 단독 실행에서는 10/10 통과(1.2~2.0초)였다.

## 원인 (둘)
1. **QA 하네스 오염** — `custom-loop-full-qa`가 npm 래퍼만 종료해 vite가 남고, `--strictPort`가
   없어 다음 게임의 어댑터가 남은 서버를 검사했다. 게임 밖 결함이며 `c9f1639`·`c14edc1`로 닫았다.
2. **상주 텍스처 총량** — `LoadingScene`이 Home 진입 직후 배경 4장(1440×3120 × 4 = 디코드 68MiB)을
   한꺼번에 큐에 넣었다. 이것은 그 자체로 고칠 값이지만, **간헐 실패의 원인으로 확정되지 않았다**
   (아래 정정 참조).

## 수정 (아트 무변경, 코드 4곳)
- `src/game/systems/BackdropLoader.js` 신규 — `ensureBackdrop` / `bestLoadedBackdrop`
- `LoadingScene` — Home 직후 배경 일괄 큐 제거(BGM만)
- `GameScene.prefetchBackdrops()` — 현재 + 다음 한 장만
- `GameOverScene` — 전용 배경 부재 시 올라온 배경으로 대체
- `qa/backdrop-residency-qa.mjs` 신규 + `npm run test:backdrops` — R17을 기계 검증으로 만든다

## 측정
| 항목 | before | after |
|---|---|---|
| 게이트 인접쌍(visual-layout → scene-composite) ×8 | 3/8 | 6/8 — **n=8로는 노이즈와 구별되지 않는다** |
| 단독 부팅 ×10 (5초 예산) | 10/10 (1218~1956ms) | **10/10 (1054~1454ms)** |
| Home 상주 배경 | 5장 · 85MiB | **1장 · 17MiB** |
| 스테이지 1 상주 배경 | 5장 | **2장** |

`test:backdrops` assert 6/6, browserErrors 0, rendererWarnings 0.
스테이지 3 배경 온디맨드 도착(`bg_2`)과 GameOver 배경 존재(`bg_3`)를 값으로 확인했다.

## 게이트
`factory:production-gate --require-gpt-imagegen` exit 0 (1회 시도), gateProfile `custom-loop-full`,
qaRunId `2026-08-19T21-21-04-500Z`, dist-runtime 23 assets / 7222014-8388608 bytes.

## 정정 (같은 날, 사용자 지적으로 재측정)
처음 이 문서는 잔여 실패의 원인을 "호스트 메모리 압력(스왑 포화)"으로 적었다. **틀렸다.**
뷰포트 4종에서 부팅을 각 6회 재니 24/24 통과, 구간별 swapout 증가 0, 여유 메모리 53%였다.
근거로 쓴 스왑 수치는 부팅 이후 누적값이었고 실패 시점의 압력이 아니었다.

배제된 것: 대상 게임의 텍스처 총량(대조군 게임도 5/6 동일), 호스트 메모리 압력(swapout 0),
특정 뷰포트 크기(24/24).
미확정: 실패하는 게이트 도구 자체 — 터치 에뮬레이션, 씬 클릭 플로우, 2160×3840 스크린샷,
뷰포트마다 브라우저 재실행, 6초 타임아웃. 단독 부팅 프로브는 이 중 아무것도 하지 않으므로
그 프로브로는 무엇도 배제할 수 없다.

## 미달
요청 수용 기준("게이트 문맥에서 Home 도달 10/10")은 **미달**이다. 원인이 확정되지 않았으므로
"환경 탓"으로 닫지 않는다. 이 세션이 닫은 것은 상주 텍스처 몫(85MiB → 17MiB)과 그 불변식의
기계 검증이며, 간헐 실패의 원인 규명은 **열린 항목**으로 남긴다.
