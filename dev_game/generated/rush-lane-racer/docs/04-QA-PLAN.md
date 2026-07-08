# 04 · QA Plan — Rush Lane Racer

검증은 빌드 성공만으로 끝나지 않는다. 필수 게이트는 npm run build, factory:production-demo-qa --require-gpt-imagegen, factory:image-quality-qa, factory:visual-layout-qa, factory:scene-composite-qa, factory:production-gate이다. 특히 image-quality-qa는 SVG placeholder, 낮은 색상수, 낮은 edge variance, 과도한 반투명 잔여물, 잘린 스탬프/버튼/스프라이트를 탈락시킨다.

브라우저 QA는 390×844, 430×932, 1080×1920에서 Loading/Home/Game/Pause/GameOver를 확인해야 한다. PLAY 진입, pause 진입, gameover 강제 진입 시 콘솔/page error가 없어야 하며 HUD, 코인 표시, pause 버튼, Home/GameOver 버튼이 서로 겹치지 않아야 한다. 화면 캔버스는 중앙 정렬되어야 하고 Full HD 배경이 런타임에 보이는지 확인한다.
