# Phase 5 — factory↔polish 생명주기 라우팅

- 상태: `PASS`
- 허용 경로: factory/polish SKILL·openai metadata, command inventory, 새 routing corpus, 계획·증거
- 금지 경로: asset/motion SKILL, generator runtime

## 작업 전 계약

- 기존 게임의 결함 요청은 첫 편집 전에 `factory:production-pass-status`를 실행한다.
- status GREEN만 polish로 진입한다. missing/stale/invalid는 factory acceptance 작업으로 전달한다.
- 새 기능·모드는 receipt와 무관하게 factory expansion이다.
- status 실패를 고치기 위해 polish가 영수증을 만들거나 게이트를 대신 돌리지 않는다.

## As-built

- factory에 existing-game entry check를 추가했다. expansion은 즉시 factory, defect는 status로 분기한다.
- polish는 첫 편집 전에 같은 status 명령을 요구하고 nonzero면 중단·factory 전달한다.
- 양쪽 모두 영수증을 만들기 위해 게이트를 대신 돌리는 라우팅 세탁을 금지한다.
- command inventory에 factory/polish status 책임을 각각 추가했다.
- 선행 corpus를 수정하지 않고 새 corpus에 missing/current/stale/expansion 4사례를 추가했다.

## 증거

- command checker: 9개 GREEN(factory 6, polish 3), exit 0.
- 실제 기존 게임(영수증 없음) status: `missing production-demo PASS receipt`, exit 1.
- receipt QA의 current/stale/missing 대조는 Phase 4에서 각각 GREEN/RED/RED.
- routing corpus JSON 4사례의 기대: factory/polish/factory/factory.
- factory·polish `quick_validate.py`: 둘 다 `Skill is valid!`.

## 스킬·계약 대조

- 두 frontmatter는 이미 first PASS 전=factory, 이후=polish, expansion=factory를 대칭으로 말한다.
- 본문은 그 상태를 status 명령으로 판정하도록 구체화했다.
- openai metadata는 생명주기 범위는 일치하지만 receipt 명령과 skill-creator 길이 제약은 Phase 6에서
  함께 정리한다.

## 판정

- 판정: `PASS` — 자체 검증, 2026-08-16
