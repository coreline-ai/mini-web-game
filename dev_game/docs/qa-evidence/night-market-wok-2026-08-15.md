# night-market-wok — 2026-08-15

`dev_game/generated/**`는 gitignore 대상이므로 요약만 추적본으로 남긴다.

- **게임**: Night Market Wok — 주문 순서대로 재료를 탭해 조리·서빙하는 한손 세로 아케이드
- **빌드 판정**: `hybrid` — arcade Foundation 셸 유지, 낙하 Spawner·플레이어 이동 제거 후 GameScene 전면 재작성
- **스펙**: `dev_game/generator/examples/night-market-wok.spec.json` (schema v1)
- **호스트 어댑터**: `claude-shellout` — Claude Code가 `codex exec`로 아트 취득

## 게이트 (전부 GREEN)
production-demo-qa(--require-gpt-imagegen) / image-quality-qa(20 assets) / visual-layout-qa(3 viewports) /
scene-composite-qa(3 viewports) / dist-runtime-qa(1,210,738 of 16,777,216 bytes) / hq-screen-quality-qa /
production-gate 전 구간

## 장르 회귀
`scripts/cooking-loop-regression.mjs` — 8 assertions OK (순서 판정, 오조작 비즉사, 스트라이크, 좌석 불변식, 예외 0)

## 아트
20자산 Path A 자동 생성. declared resample 3건(배경 native 1080x1920 → master 2160x3840, raw 보존).
런타임은 §2.0.5 권장 규격 WebP(1080x1920 배경 / 512px 스프라이트), PNG 마스터는 assets/_source/masters/.

## 캡처 리뷰에서 고친 결함 5건
스프라이트 시트 셀 잘림(단일 스프라이트로 교체) / 홈 타이틀 마진 이탈 / publishLayout이 allowOverlapWith를
누락하던 문제 / 런타임 예산 26.6MB 초과(WebP 전환으로 2.7MB) / **좌석 중복 표시**(시작 티어 레시피가 1종뿐 +
손님 유형 무작위 중복 → 티어 3단계 시작 + 중복 회피).

마지막 항목은 모든 게이트가 GREEN인 상태에서 캡처를 눈으로 봐야만 발견됐다.

## 미추적 산출물
qa-captures/(16개 캡처), assets/_source/(raw + masters)는 gitignore 대상.
보존이 필요하면 force-add 해야 한다.

---

## 후보정 세션 1 (같은 날)

사용자 지적: "에셋이 너무 품질이 떨어지는데?" — **전 게이트 GREEN 상태에서 나온 지적**.

### 지배적 원인은 에셋이 아니라 캔버스였다
논리 캔버스가 390×844여서 canvas backing store가 CSS 크기와 같았고(`backingScale 1`), DPR2 기기에서 브라우저가
화면 전체를 2배 확대하고 있었다. Phaser 3.90에는 `resolution` 옵션이 없다. 논리 캔버스를 1170×2532(디자인 단위 3배)로
이관하고 절대값을 `U` 상수로 환산 → **backingScale 1 → 3**.

### 부수 원인 2건
- 크로마 오염: 반투명 경계 띠 B/R 0.74(마젠타)를 3px 침식으로 제거 → 편향 +50~62 → +1~18, 잔여 반점 1,536px → 1px
- stage-3 배경 선명도 57.3 < 60 → 2단 리샘플을 1단으로 축소 후에도 미달하여 **재생성** → 181.7

### 결함 아님으로 판정 1건
손님별 나무 카운터는 Class B(배경 아트 중복)가 아니다 — 배경이 손님 줄에 카운터를 제공하지 않으므로 중복이 없다.

### 최종
전 게이트 + hq-screen-quality-qa OK, 장르 회귀 8/8 OK.
상태 샘플: browserErrors 0 · duplicateVisibleEntities 0 · seatConflicts 0 · activeBgmInstances 0 · backingScale 3

### 계약 승격
`post-production-qa-contract.md` Class L 기계 검증에 2건 추가 — (1) hq-screen이 backing store를 검사하지 않는다는 경고와
backingScale 실측 절차, (2) 크로마 잔여를 B/R 비로 판별하는 방법.
