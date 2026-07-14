# 07 · Regression Checklist — Firebreak Commander

## 매 변경 필수

- [x] `npm run test:all`
- [x] `npm run build`
- [x] 동일 seed/명령/tick grid hash 일치
- [x] invalid/cancel 명령 자원 소비 0
- [x] terminal 이후 tick/hash 고정
- [x] HELI 비용·cooldown 1회 적용
- [x] ENGINE road-only, 최대 2대, 위협이 있을 때만 물 소비

## 입력·lifecycle

- [x] 실제 pointer LINE drag/release
- [x] HELI/ENGINE 성공과 invalid ENGINE 경로
- [x] Pause/Resume 10회 tick 정지
- [x] `visibilitychange` pause
- [x] Retry 5회 scene stack 1, BGM 1
- [x] console error 0, page error 0
- [x] 시각 셀 36px 유지, 44px nearest-cell touch halo/snap (`npm run test:touch-target`)
- [x] edge halo는 보드 경계에서 허용하고, 44px 바깥 오터치는 거부

## 밸런스

- [x] 무행동 첫 경고 45~75초
- [x] HELI-only 자원 고갈 후 실패
- [x] firebreak-only 실패
- [x] 필수 목표 보호 1성 해법
- [x] 결합 3성 해법 2개
- [x] default/1/42 seed 승리 해법
- [x] 180초 이전 조기 clear 금지

## 시각·에셋

- [x] 390x844, 430x932, 1080x1920 safe area/overlap
- [x] Loading/Home/Tutorial/3 phases/Pause/Win/Loss 캡처
- [x] 배경에 runtime 화재·목표·유닛 중복 없음
- [x] 이미지에 버튼 문구·점수·한글 baked text 없음
- [x] sprite alpha padding/connected component 검사
- [x] image provenance와 audio hash 기록
- [x] image-quality/HQ-screen/scene-composite PASS

## Release gate

- [x] `factory:production-gate --require-gpt-imagegen --viewports 390x844,430x932,1080x1920`
- [x] gate 이후 `06-FINAL-QA-SUMMARY.md`의 Full gate를 PASS로 고정
- [x] 차단 결함 0 확인

## 2026-07-14 병렬 수정 후 검증

- [x] Firebreak dev/QA 기본 포트 `5188` 통일 (`FIREBREAK_QA_URL`/`GAME_QA_URL` override 지원)
- [x] 상태 표시가 색상에만 의존하지 않도록 risk/heating/extinguished/preview glyph·패턴 추가
- [x] `npm run build`, `npm run test:all` PASS
- [x] browser 11, clarity 10, hostile input 12, session 15, lifecycle Pause10/Retry5/logical180초 PASS
- [x] 12 states × 3 viewports = 36 captures, overlap/out-of-bounds/browser errors 0
- [x] 390px touch target 8 assertions PASS
- [ ] 저사양 실기기 900초(15분) soak 및 앱 lifecycle 기록

## 후보정 세션 1 — 첫 실행 목적·조작 명확성

- [x] 390x844, localStorage 초기화 후 Home에 “180초·마을·변전소” 목적이 보인다.
- [x] Home 주요 CTA가 `출동 시작`, 보조 CTA가 `게임 방법`이다.
- [x] 첫 `출동 시작`에서 mission coach가 자동 표시된다.
- [x] coach에 승리 조건과 방화선·헬기·소방차 조작이 모두 명시된다.
- [x] coach의 180초 목표와 HUD 시작 시간이 일치한다.
- [x] coach가 열려 있는 동안 simulation tick이 증가하지 않는다.
- [x] coach를 닫으면 tick이 재개되고 첫 행동 안내가 표시된다.
- [x] 방화선 선택 후 `숲·초지를 드래그` 안내가 표시된다.
- [x] HUD `?`로 coach를 다시 열 수 있다.
- [x] 기존 `tutorialSeen=true`, `clarityCoachVersion=0` 저장 데이터에서도 새 coach가 1회 표시된다.
- [x] browser/page errors 0, duplicate entities 0, lingering graphics 0, BGM 1, scene stack 1이다.
- [x] DPR2 390x844에서 canvas backing이 780x1688이고 backingScale 2 이상이다.
- [x] 실제 pointer 입력 11 assertions와 기존 Pause/Retry lifecycle이 회귀하지 않는다.
- [x] 390x844, 430x932, 1080x1920 visual-layout와 scene-composite를 다시 통과한다.

## 후보정 세션 2 — 전체 화면·규칙 명확성

- [x] Loading/Home/Rules/first coach/game initial/command selected/wind shift/ember/help/pause/win/loss 12종을 모두 캡처한다.
- [x] 위 12종을 390x844, 430x932, 1080x1920에서 각각 검사해 총 36개 증거를 남긴다.
- [x] 36개 상태에서 layout overlap 0, out-of-bounds 0, browser/page error 0이다.
- [x] Rules에 승리·패배, 방화선·헬기·소방차 비용과 조작, 주황색 칸 의미, 추천 순서가 모두 보인다.
- [x] 첫 실행 coach에 `모든 불꽃 0`과 마을/변전소 0 패배 조건이 보인다.
- [x] HUD에 현재 `불꽃 N`이 보이며 시뮬레이션 상태와 일치한다.
- [x] 풍향 `남동` + 45도 아이콘 상태에서 풍향 텍스트·아이콘·Pause 버튼이 겹치지 않는다.
- [x] Home과 Win/Loss 결과 화면에 정체 불명의 삼각형·원 placeholder가 없다.
- [x] 결과 화면에 debug/test 문구가 노출되지 않고 실제 승리·패배 사유가 표시된다.

## Factory schema v2/custom-loop

- [x] spec v2에 Foundation dummy player/hazard/coin/lives/difficulty 없음
- [x] runtime config/rules/capture matrix/required asset roles 경로 유효
- [x] Rules snapshot, UI, GDD 구조화 블록 동기화
- [x] transition pointerup one-shot, gameplay command 반복 가능
- [x] corrupted settings 복구, best/mute reload 유지
- [x] Home→Game→Pause→Home 3회 BGM instance 1 이하
- [x] Retry 5회 tween/timer/listener monotonic 증가 없음
- [x] 일반 asset padding 6~10%, 강한 FX 12% 예외 manifest 기록
- [x] `factory:production-gate -- --mode custom-loop-full` PASS
- [x] `qa-captures/qa-session-report.json`과 capture report runId 일치
