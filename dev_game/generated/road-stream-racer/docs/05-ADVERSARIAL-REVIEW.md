# 05 · Adversarial Review — 차별화 / anti-reskin

이 데모가 "프롬프트 한 줄로 만든 게임"이나 단순 **reskin/placeholder**와 무엇이 다른지
스스로 공격적으로 검증한다. 아래 항목 중 하나라도 실패하면 production-demo로 부르지 않는다.

## Challenge checklist
- [x] 배경이 단색/플레이스홀더가 아니라 스테이지별로 구분되는 **실제 아트**인가? (≥3종)
- [x] 핵심 스프라이트가 SVG 도형이 아니라 **프로덕션 아트(PNG/WebP)**인가?
- [x] 피격/획득에 **게임 필(파티클·화면 흔들림·플래시·사운드)**이 있는가?
- [x] HUD가 겹치거나 잘리지 않고 safe-area를 지키는가? (visual-layout-qa)
- [x] 도로가 정적 배경이 아니라 세그먼트로 흐르고 재활용되는가?
- [x] 같은 규칙의 다른 게임과 구별되는 **아트 디렉션/무드**가 있는가?

## Reskin risk
스펙 값만 바꾼 재탕은 여기서 탈락한다. placeholder 아트로 완료 처리하는 것은 금지.
production-demo는 시각 품질 + 게임 필 + 콘텐츠(멀티 스테이지)를 모두 만족해야 한다.
