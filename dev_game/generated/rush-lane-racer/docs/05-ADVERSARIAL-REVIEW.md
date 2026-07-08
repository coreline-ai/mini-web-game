# 05 · Adversarial Review — Rush Lane Racer

가장 큰 리스크는 이 게임이 기존 dodge foundation의 이름만 바꾼 reskin처럼 보이는 것이다. 이를 막기 위해 차량/도로/니트로/트래픽/보스 트럭을 전용 asset plan과 런타임 PNG로 분리했고, 배경도 도시·네온·사막 3종의 stage background로 교체한다. 플레이어 스프라이트 역시 로봇/똥피하기 계열이 아니라 Rush Lane Racer 전용 레이싱 차량이다.

두 번째 리스크는 placeholder SVG나 단순 도형 버튼이 production-demo 품질처럼 통과하는 것이다. 이를 막기 위해 코어 이미지 경로를 PNG로 바꾸고 asset-manifest에 production-demo provenance를 선언한다. 그래도 현재 루프가 완전한 네이티브 레이싱 물리까지 가진 것은 아니므로, 차선 추월 연출/니트로 카메라 줌/경찰 추격 패턴은 다음 확장 후보로 남긴다. 하지만 1차 목표인 Full HD 자가 포함 고품질 웹 아케이드 데모 기준에서는 reskin/placeholder 위험을 명시적으로 줄인다.
