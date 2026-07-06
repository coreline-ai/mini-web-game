# 02 · Technical Design — Bullseye Rush

## Engine & rendering
Phaser 3 + Vite, 논리 캔버스 390×844 (portrait), Scale.FIT + CENTER_BOTH.

## Scenes
Boot → Loading → Home → Game → Pause → GameOver. (Foundation shell 재사용)

## Game-specific systems (custom-loop — Spawner 미사용)
- **OscillatingAimSystem** (`src/game/systems/OscillatingAimSystem.js`)
  - 조준 마커 좌우 자동 왕복(속도는 RoundManager가 라운드별 지정), 세로 점선 가이드 + 다이아 마커 렌더.
  - pointerdown = fire(): 그 순간 aimX에서 화살 수직 발사(1500px/s, 쿨다운 240ms), 잔량 0이면 발사 거부, 발사 시 RoundManager.onArrowFired() 차감 + 사격 애니 1회 + 반동.
  - 궁수 스프라이트가 마커를 러프 추적(시각 피드백). 화면 상단 통과 화살 = onArrowMiss.
- **RoundManager** (`src/game/systems/RoundManager.js`)
  - roundConfig(n) 테이블: 과녁 수(1→3)·화살 수(과녁×2+3, 점감)·스윕 속도(+26/R)·과녁 크기(-3.5%/R)·이동(R3+)·바운스(R5+)·별 확률.
  - 과녁 명중 판정 소유: 불스아이(|dx| < r×0.34) → 콤보 x2→x4 배수 점수, 일반 명중 +30 콤보 리셋.
  - 클리어(+100+잔여화살×20) → 0.7s 후 다음 라운드, R12 클리어 = allclear 승리.
  - MISS/화살소진 판정, HUD(ARROWS/MISS/COMBO) + ROUND 배너(배너 중 발사 잠금).
  - 보너스 별: 명중 시 화살 +1, +50.

## Collision model
arrow(축소 body) × target(원형 0.86r) → RoundManager 판정 / arrow × star → 화살 보급. 플레이어 충돌 없음(피격 개념 없음).

## GameScene 오버라이드
Spawner 미생성(임포트 제거). 생존 점수 없음(elapsedMs만 수동 누적). onHit()=미스3/화살소진/올클리어 공용 종료(allclear는 그린 플래시). 훅 `window.__BULLSEYE_DEBUG__.get()` — round/arrowsLeft/misses/combo/hits/bullseyes/aimX/targets[]/over/reason, 씬 종료 후 안전(옵셔널 체이닝).

## Data
`game-spec.json`(캔버스/테마/오디오) + AIM·RUSH 상수(각 시스템 상단) + roundConfig 테이블.

## State flow
Home→Game(R1 배너→발사 해금)→[Pause↔]→(미스3|화살소진|R12클리어)→GameOver(score,coins)→Retry/Home.
