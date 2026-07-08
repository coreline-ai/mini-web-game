# 02 · Technical Design — Rush Lane Racer

엔진은 Phaser 3 + Vite이며 논리 캔버스는 1080×1920 세로형이다. BootScene, LoadingScene, HomeScene, GameScene, PauseScene, GameOverScene을 유지하되, foundation SVG 에셋 로딩은 Full HD PNG 런타임 에셋 로딩으로 교체한다. RoadRenderer는 생성형 Full HD 배경을 먼저 깔고, 그 위에 얇은 레일/속도선/차선 스트립을 얹어 동적인 도로감을 만든다.

핵심 시스템은 Spawner(오브젝트 풀 기반 차량/장애물/아이템 스폰), ScoreManager(생존/회피/니어미스/코인 점수), AudioManager(게임플레이 음악 상태 제어), LayoutRegistry(브라우저 QA용 CSS 픽셀 bounds 공개), MobileButton(생성형 버튼 텍스처 기반 터치 UI)이다. 모든 이동은 delta 기반이며, pause/home/gameover 전환 시 음악은 멈추거나 재개된다.
