# QA Evidence — castle-archer (2026-07-06)

성벽 방어 저격 게임(드래그 조준→놓아서 발사, 성문 HP 3, 방패병 2HP, 정조준 크리티컬 ×2).
빌드 판정 hybrid: Foundation shell + 커스텀 AimShotSystem/WaveGateSystem.

- production-gate exit=0 (qa + demo-qa(imagegen강제) + image-quality 13에셋 + visual-layout 3뷰포트 + scene-composite): 전부 OK
- 게임플레이 헤드리스: 24발/14킬/크리티컬6/방패파괴3, 함락 게임오버, best 저장, 콘솔 에러 0
- AI 에셋 13종 전부 codex 내장 image_gen 신규 생성(1080×1920 배경 3종에 하단 성벽 난간 포함)
- 캡처 리뷰 후 수정: 디버그 훅 씬종료 가드 / 헤드샷→정조준 크리티컬 재설계 / 풀 재사용 _cfg 누수 / (팩토리) autocrop 5% 여백+role-aware 채움 하한
- 증거: dev_game/generated/castle-archer/qa-captures/ (19파일, gitignored — 필요 시 force-add)
- 스펙: dev_game/generator/examples/castle-archer.spec.json
