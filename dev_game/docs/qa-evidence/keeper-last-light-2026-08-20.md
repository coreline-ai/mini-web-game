# keeper-last-light — 후보정 세션 #4 (2026-08-20)

## 증상
게이트의 브라우저 단계가 간헐적으로 실패했다. 실패 서명은 `__GAME_LAYOUT_BOUNDS__ missing` /
`scene "Game" not reached in 15000ms — registry still reports "(none)"` — 게임이 **아예 부팅하지
못한** 것이다. 단독 실행에서는 10/10 통과(1.2~2.0초)였다.

## 원인 (둘)
1. **QA 하네스 오염** — `custom-loop-full-qa`가 npm 래퍼만 종료해 vite가 남고, `--strictPort`가
   없어 다음 게임의 어댑터가 남은 서버를 검사했다. 게임 밖 결함이며 `c9f1639`·`c14edc1`로 닫았다.
2. **상주 텍스처 총량** — `LoadingScene`이 Home 진입 직후 배경 4장(1440×3120 × 4 = 디코드 68MiB)을
   한꺼번에 큐에 넣었다. 호스트 메모리 압력(스왑 8GB 중 7.49GB 사용) 아래에서 뒤따르는 브라우저가
   부팅하지 못했다.

## 수정 (아트 무변경, 코드 4곳)
- `src/game/systems/BackdropLoader.js` 신규 — `ensureBackdrop` / `bestLoadedBackdrop`
- `LoadingScene` — Home 직후 배경 일괄 큐 제거(BGM만)
- `GameScene.prefetchBackdrops()` — 현재 + 다음 한 장만
- `GameOverScene` — 전용 배경 부재 시 올라온 배경으로 대체
- `qa/backdrop-residency-qa.mjs` 신규 + `npm run test:backdrops` — R17을 기계 검증으로 만든다

## 측정
| 항목 | before | after |
|---|---|---|
| 게이트 인접쌍(visual-layout → scene-composite) ×8 | 3/8 | **6/8** |
| 단독 부팅 ×10 (5초 예산) | 10/10 (1218~1956ms) | **10/10 (1054~1454ms)** |
| Home 상주 배경 | 5장 · 85MiB | **1장 · 17MiB** |
| 스테이지 1 상주 배경 | 5장 | **2장** |

`test:backdrops` assert 6/6, browserErrors 0, rendererWarnings 0.
스테이지 3 배경 온디맨드 도착(`bg_2`)과 GameOver 배경 존재(`bg_3`)를 값으로 확인했다.

## 게이트
`factory:production-gate --require-gpt-imagegen` exit 0 (1회 시도), gateProfile `custom-loop-full`,
qaRunId `2026-08-19T21-21-04-500Z`, dist-runtime 23 assets / 7222014-8388608 bytes.

## 정직하게 남기는 미달
요청 수용 기준은 "게이트 문맥에서 Home 도달 10/10"이었고 **이 호스트에서는 미달**이다.
환경 대조군으로 가른 결과, 잔여 실패는 이 게임의 결함이 아니다 — `visual-layout-qa` 6회에서
keeper 5/6, 큰 배경이 없는 `last-minute-keeper`도 **5/6**이며 실패 뷰포트(1080×1920)와 서명이
동일하다. 스왑이 포화된 머신에서는 어떤 게임이든 같은 확률로 부팅에 실패한다. 게임 쪽에서 줄일
수 있는 몫(85MiB → 17MiB)은 이 세션에서 닫았다.
