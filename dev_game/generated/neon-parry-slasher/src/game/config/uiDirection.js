// uiDirection.js — 이 게임의 UI 아트 디렉션 (계약 §2.0.26).
//
// 규격(버튼 크기 토큰·첫 플레이 5요소·required ID)은 모든 게임이 공유하고, 표현(배치·형태·
// 타이포·모션)은 게임마다 달라야 한다. 이 선언이 그 표현의 단일 원본이다.
//
// 관측 기록(2026-08-18): 이 값들은 새로 정한 디자인이 아니라 이미 구현된 화면을 읽어 적었다.
//   layoutMetaphor   HomeScene의 "COMBAT PROTOCOL" 카드와 "INITIALIZE COMBAT" 라벨 —
//                    사이버 로닌이 부팅하는 전투 프로토콜 단말
//   homeComposition  풀블리드 배경(alpha 0.68) 위 중앙 1열: 네온 타이틀 → 대좌+오라에 올린
//                    로닌 프리뷰 → 글래스 카드 → BEST RECORD 배지 → 버튼 2개
//   buttonForm       MobileButton.makeTextButton: 어두운 채움 + 2px 네온 테두리 +
//                    바깥 글로우 사각(alpha 0.2), Arial Black 대문자 라벨
//   typeScale        Arial Black/Impact 대문자 헤드라인 + 12.5~13px 본문
//   motionSignature  타이틀 scale yoyo(1200ms)와 대좌·오라 호흡 펄스(1000ms)
export const UI_DIRECTION = Object.freeze({
  layoutMetaphor: 'combat-protocol-terminal',
  homeComposition: 'hero-pedestal-column',
  buttonForm: 'neon-outline-glow-rect',
  typeScale: 'impact-caps-compact',
  motionSignature: 'neon-pulse-breath',
});

export default UI_DIRECTION;
