# Firebreak Commander 후보정 증거 — 2026-07-12

## 세션 1: 첫 실행 목적·조작 명확성

- 사용자 원문: “뭘 하자는 게임인지 모르겠어???”
- 분류: C UI–Gameplay ambiguity + E Progression/Terminal explicitness, severity 2
- 동반 발견: L Asset Fidelity `backing-store-too-small`, severity 3
- 재현: 390x844, localStorage 초기화, Home에서 기존 `START RESPONSE` 탭
- 원인: Home/행동/HUD가 영문 약어 중심이고 승리 조건·행동 역할이 기본 진입 경로에서 생략됨. canvas backing도 DPR2에서 390x844 1×였음.

## 수정

- Home에 180초·마을·변전소 보호 목적과 한글 CTA 표시
- 첫 출동 mission coach: 승리 조건, 세 행동, 위험 칸, 자원 설명
- coach가 열려 있는 동안 simulation 정지, 닫으면 재개
- HUD `?`로 coach 재호출
- HUD/목표/행동/메시지/Pause/Result 런타임 한글화
- viewport fit scale × DPR physical canvas + logical camera zoom + high-resolution Text texture
- Home·coach·HUD 제한 시간을 실제 stageDuration과 동일한 180초로 통일
- 이전 버전의 `tutorialSeen=true` 저장 데이터에도 새 coach를 1회 노출하는 migration

## 증거

- Before: `dev_game/generated/firebreak-commander/qa-captures/polish-01-before-home.png`, `polish-01-before-game.png`, `polish-01-before-samples.json`
- After: `polish-01-after-home.png`, `polish-01-after-coach.png`, `polish-01-after-gameplay.png`, `polish-01-after-help.png`, `polish-01-after-samples.json`
- clarity assertions 10/10
- browser/page errors 0
- duplicate visible entities 0
- lingering transient graphics 0
- BGM instances 1
- scene stack 1
- DPR2: CSS 390x844, backing 780x1688, backingScale 2
- pointer interaction 11/11
- logic 10/10, balance 9/9
- Pause/Resume 10회, Retry 5회 PASS
- visual-layout 390x844/430x932/1080x1920 PASS
- scene-composite 동일 3 viewport PASS
- production gate PASS
- HQ screen quality 15 assets PASS

## 세션 2: 전체 화면 레이아웃·게임 규칙

- 사용자 원문: “각 시작 화면 도움말 화면 게임에 등장 하는 모든 화면을 캡쳐 해서 깨진 부분이나 이상한 레이아웃이 없는지 겹치는 부분이 없는지 확인 해줘! 그리고 아직도 게임 규칙을 잘 모르겠어!”
- 분류: C UI–Gameplay ambiguity + E 목표/종료 명시 + F/G 전체 화면 증거, severity 2/3
- Before에서 Home/Result의 정체 불명 추상 도형과 wind-shift HUD 텍스트↔회전 아이콘 겹침을 확인
- Home을 실제 행동 에셋 기반 작전 카드로, Rules를 승리/패배·비용·조작·위험 칸·추천 순서 중심으로 재구성
- coach에 `모든 불꽃 0`과 즉시 패배 조건 명시, HUD에 실시간 `불꽃 N` 추가
- Result placeholder/debug 문구 제거, 실제 결과 아이콘·사유·재도전 안내 적용
- 12 화면 상태 × 390x844/430x932/1080x1920 = 36 captures
- overlap 0, out-of-bounds 0, browser/page errors 0
- evidence: `generated/firebreak-commander/qa-captures/polish-02-all-screens/report.json` 및 viewport별 contact sheet
- build, logic 10/10, balance 9, clarity 10/10, pointer 11/11, lifecycle, production gate, HQ PASS
