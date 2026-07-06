# QA Evidence — bullseye-rush (2026-07-07)

순수 타이밍 정밀 사격(자동 왕복 조준선, 탭=발사, 12라운드제, 불스아이 콤보 x4, 미스3/화살소진 실패, R12 올클리어 승리).
빌드 판정 custom-loop: Spawner 미사용 — OscillatingAimSystem + RoundManager(340줄)가 판정·경제·난이도 소유.

- production-gate exit=0: qa/demo-qa(imagegen강제)/image-quality(11)/visual-layout/scene-composite 전부 OK
- 헤드리스: 22초 7라운드 클리어(15명중·불스아이5·2380점), 미스3 게임오버, best 저장, 에러 0
- AI 에셋 11종 codex image_gen 신규 생성(여궁수·불스아이·별·화살·사격장 배경 3종)
- 팩토리 개선: 게이트 edge/hf 측정을 2400px+에서 1920 기준 정규화(최대해상도 역차별 제거)
- 증거: dev_game/generated/bullseye-rush/qa-captures/ (gitignored) · 스펙: generator/examples/bullseye-rush.spec.json
