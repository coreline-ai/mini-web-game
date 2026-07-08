# 03 · Asset & Audio Plan — Rush Lane Racer

모든 런타임 에셋은 dev_game/generated/rush-lane-racer/assets 하위에 존재해야 하며, 다른 게임 또는 루트 공통 에셋을 참조하지 않는다. 코어 게임플레이 에셋은 SVG placeholder가 아니라 imagegen 산출물을 잘라 만든 PNG이다. 배경은 1080×1920 Full HD 이상 기준의 stage-1, stage-2, stage-3 PNG를 사용한다.

필수 이미지 묶음은 플레이어 차량, 일반 차량, 트럭, 오토바이, 경찰차, 보스 트럭, 콘, 도로 블록, 오일, 코인, 니트로, 방패, 자석, 시계, 수리 키트, 가짜 코인, green/blue 버튼 프레임, pause 아이콘, crash/coin sparkle/result stamp FX이다. 효과음은 기존 WAV를 유지하되 매니페스트에 게임별 provenance를 부여한다. 게임플레이 음악은 GameScene에서만 재생되고 pause/home/gameover에서는 멈춘다.
