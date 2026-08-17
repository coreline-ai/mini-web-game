// uiDirection.js — 이 게임의 UI 아트 디렉션 (계약 §2.0.26).
//
// 규격(버튼 크기 토큰·첫 플레이 5요소·required ID)은 모든 게임이 공유하고, 표현(배치·형태·
// 타이포·모션)은 게임마다 달라야 한다. 이 선언이 그 표현의 단일 원본이다.
//
// 관측 기록(2026-08-16): 이미지 기반 버튼, 콜사인 목록형 홈 구성.
export const UI_DIRECTION = Object.freeze({
  layoutMetaphor: 'cockpit-hud-strip',
  homeComposition: 'callsign-roster',
  buttonForm: 'image-plate-compact',
  typeScale: 'military-mono',
  motionSignature: 'radar-sweep',
});

export default UI_DIRECTION;
