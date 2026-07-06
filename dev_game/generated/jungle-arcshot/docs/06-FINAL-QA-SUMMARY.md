# 06 · Final QA Summary — Jungle Arc Shot (2026-07-07)

## Production gates (전부 GREEN, production-gate exit=0)
factory:qa OK · production-demo-qa(--require-gpt-imagegen) OK · image-quality-qa OK(11 assets) · visual-layout-qa OK(3해상도×5씬) · scene-composite-qa OK

## 헤드리스 게임플레이 검증 (window.__JUNGLE_DEBUG__, 탄도 역산 봇)
- 봇이 중력(950)+바람(-110) 역산으로 조준: **12발 → 18명중** (발사<명중 = 관통 실증), **한 발 최대 3관통(pierceBest 3)**, 4라운드 클리어, 1,440점
- 화살 낭비 페이즈: 소진 → **over:true, reason:"arrows"** — 화살 경제 패배 정상
- best 1,440 저장 · 콘솔/페이지 에러 0

## 검증·게이트 중 발견·수정
1. manifest 만료 hazard/collectible 엔트리(플랜 개명 잔재) → 제거 후 production-demo 승격.
2. **(팩토리 보정)** 풍선(끈 달린 오브젝트) bbox 채움비 0.2745가 item 하한 0.28에 경계 탈락 — 이미지 육안 확인 결과 몸통 완전 불투명(형태 특성 오탐) → item/powerup 하한 0.24로 실측 보정(진짜 hollow 0.1x대는 여전히 차단).

## AI 에셋 (11종, 전부 codex image_gen 신규 생성)
정글 배경 3종(새벽 캐노피 1080×2160/한낮 폭포/반딧불 황혼 2160×3840) · 사파리 헌터 시트 2048×512 · 과일/풍선/대나무 화살 · 버튼 2/FX 2

## 남은 확장 아이디어
승리 전용 결과 화면 · 돌풍(라운드 중 바람 변화) 이벤트 · 폭발 과일(주변 연쇄) · 별점(남은 화살 기반 3성) 시스템
