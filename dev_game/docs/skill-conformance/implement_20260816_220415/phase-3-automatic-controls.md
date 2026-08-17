# Phase 3 — 대조군 자동 회귀·motion validator 연결

- 상태: `PASS`
- 허용 경로: `dev_game/package.json`, gate controls, motion validator runner, 이 계획·증거
- 금지 경로: 네 SKILL 본문·generator production runtime

## 작업 전 계약

- `factory:qa` 안에서 gate controls를 한 번만 실행한다.
- gate controls가 실행하는 command checker는 target factory 명령을 실행하지 않으므로 재귀하지 않는다.
- motion manifest의 정상 fixture는 exit 0, 결함 fixture는 exit 1과 의도한 사유를 내야 한다.

## As-built

- `factory:skill-gate-controls`를 `dev_game/package.json`에 등록하고 `factory:qa`의 skill drift
  직후에 연결했다.
- gate controls에 `motion-validator` 범주를 추가했다.
- validator와 두 fixture의 실재, 종료 코드, 실패/성공 지문을 함께 검사한다.
- runner는 `bin`을 명시할 수 있게 하되 spawn error·timeout·signal은 기존대로 실패 처리한다.

## 증거

- 직접 gate controls: 33종 전부 기대대로(음성 4/양성 29), exit 0.
- motion valid: `[OK] spritesheet manifest passed`, exit 0.
- motion invalid: `[FAIL] id must be string`, exit 1.
- `npm --prefix dev_game run factory:qa`: 출력에 `factory:skill-gate-controls`가 1회 나타났고
  전체 exit 0. target 명령 재귀·timeout 없음.

## 스킬·계약 대조

- motion SKILL 54·80행의 validator 명령과 동일한 script/fixture를 실행한다.
- 이 대조는 manifest 구조 회귀만 증명하며 motion 품질 판정을 대신하지 않는다.
- command/conformance/structure 대조도 같은 자동 체인에서 매번 실행된다.

## 판정

- 판정: `PASS` — 자체 검증, 2026-08-16
