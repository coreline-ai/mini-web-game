# 06 · Final QA Summary — Bullseye Rush (2026-07-07)

## Production gates (전부 GREEN, production-gate exit=0)
factory:qa OK · production-demo-qa(--require-gpt-imagegen) OK · image-quality-qa OK(11 assets) · visual-layout-qa OK(3해상도×5씬) · scene-composite-qa OK

## 헤드리스 게임플레이 검증 (window.__BULLSEYE_DEBUG__)
- 정밀 타이밍 봇(마커가 과녁 중심 ±10px일 때 탭): 22초에 **7라운드 클리어**, 15명중/불스아이 5/미스 0/2,380점 — 이동(R3+)·바운스(R5+) 패턴 포함 전 라운드 진행 확인
- 고의 미스 봇(과녁에서 먼 순간만 탭): 미스 3 → **over:true, reason:"misses"** 게임오버
- best 2,410 저장 · 콘솔/페이지 에러 0

## 검증 중 발견·수정한 결함 (fix→re-verify 완료)
1. **좀비 아트 태스크의 manifest 롤백**: 중단됐던 1차 아트 job이 뒤늦게 종료되며 구버전 manifest(만료 hazard/collectible)를 덮어씀 → 만료 엔트리 재제거+재승격.
2. **(팩토리) 고해상도 역차별**: 2160×3840 배경이 픽셀당 edge/hf 반감으로 placeholder 오탐 → 세로 2400px+ 이미지는 1920 기준 정규화 측정(캘리브레이션 보존). 실측 35.8/0.92 → 정규화 후 정상 대역.

## AI 에셋 (11종, 전부 codex image_gen 신규 생성)
사격장 배경 3종(초원 연습장 1080×1920/석양 토너먼트 2160×3840/등불 야시장 1080×1920) · 여궁수 시트 2048×512(4프레임 사격 사이클) · 불스아이 과녁/보너스 별/화살 · 버튼 2/FX 2

## 남은 확장 아이디어 (non-blocking)
승리 전용 결과 화면 · 과녁 궤도(원형/8자) 패턴 · 2연발 파워샷 아이템 · 데일리 챌린지 시드
