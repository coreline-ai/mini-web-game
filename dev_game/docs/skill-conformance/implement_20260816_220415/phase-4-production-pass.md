# Phase 4 — schema v2 완료 게이트·PASS 영수증

- 상태: `PASS`
- 허용 경로: production gate/profile/receipt/QA, make-game, package scripts·CLI contract, 계획·증거
- 금지 경로: 네 SKILL 본문·생성 게임

## 작업 전 계약

- schema v2의 세 buildDecision은 모두 `custom-loop-full` 프로필을 선택한다.
- v1 auto는 compatibility를 유지하고, v2 explicit compatibility는 RED다.
- PASS 영수증은 production gate의 마지막 성공 지점에서만 원자적으로 생성한다.
- 영수증은 현재 `src/**`, `package.json`, asset manifest fingerprint와 일치해야 유효하다.
- make-game은 유효한 영수증 없이 미검증 표식을 지우거나 완료를 말하지 않는다.

## As-built

- `production-gate-profile.mjs`가 v1/v2 profile 선택을 단독 소유한다.
- schema v2는 buildDecision 값과 무관하게 `custom-loop-full`; v1 auto는 compatibility다.
- `production-pass-receipt.mjs`를 추가했다. `src/**`, `package.json`, asset manifest의 경로별
  SHA를 합친 fingerprint와 gate profile·spec/buildDecision·QA runId를 원자적으로 기록한다.
- production gate의 마지막 성공 지점에서만 영수증을 쓴다.
- make-game은 영수증을 재검증한 뒤에만 미검증 표식을 지운다.
- `factory:production-pass-status`와 자동 receipt QA를 package에 등록했다.

## 증거

- profile: v1 compatibility, v2 custom-loop/hybrid/archetype-start 모두 custom-loop-full.
- v2 explicit compatibility: 의도한 사유로 throw.
- receipt: current GREEN, source 변경 stale RED, missing RED, invalid JSON RED.
- 정적 순서 대조: custom-loop gate 뒤 receipt write, receipt verify 뒤 incomplete marker unlink.
- `completion-claim-qa.mjs`: 기존 7개 대조 전부 PASS.
- `node --check` production-gate/make-game/receipt: exit 0.

## 스킬·계약 대조

- PASS 영수증은 완료 게이트 성공을 first-PASS 상태로 변환하는 기계 판독 정본이다.
- 단순 파일 존재가 아니라 현재 project fingerprint 일치까지 요구한다.
- 품질 자체는 기존 production/custom-loop gates가 판정하며 영수증은 그 결과를 재판정하지 않는다.

## 판정

- 판정: `PASS` — 자체 검증, 2026-08-16
