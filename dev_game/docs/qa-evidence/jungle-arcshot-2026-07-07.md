# QA Evidence — jungle-arcshot (2026-07-07)

포물선 트릭샷 사격(새총 드래그=각도+파워, 중력+바람 물리, 관통 콤보 ×n, 화살 경제 실패, R10 올클리어 승리).
빌드 판정 custom-loop: Spawner 미사용 — SlingshotAimSystem(탄도 미리보기=실물리 동일 해석해) + JungleRoundSystem.

- production-gate exit=0: qa/demo-qa(imagegen강제)/image-quality(11)/visual-layout/scene-composite 전부 OK
- 헤드리스(탄도 역산 봇): 12발 18명중(관통 실증), 한 발 3관통, 4라운드 클리어 1,440점, 화살소진 패배(reason arrows), 에러 0
- AI 에셋 11종 codex image_gen 신규 생성(정글 배경 3종·사파리 헌터·과일·풍선·대나무 화살)
- 팩토리 보정: item/powerup bbox 채움 하한 0.28→0.24 (끈 달린 오브젝트 실측 0.2745 오탐 해소)
- 증거: dev_game/generated/jungle-arcshot/qa-captures/ (gitignored) · 스펙: generator/examples/jungle-arcshot.spec.json
