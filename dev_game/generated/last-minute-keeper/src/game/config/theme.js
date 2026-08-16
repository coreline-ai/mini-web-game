// theme.js — 디자인 단위 스케일과 버튼 팔레트.
//
// 논리 캔버스는 390×844의 정수배(1170×2532)다. Phaser 3.60+에는 `resolution`이 없어서
// 논리 캔버스가 곧 백킹 스토어이고, CSS 크기와 같게 두면 게임 전체가 1x로 그려진 뒤
// 브라우저가 확대한다(→ 무슨 에셋을 써도 흐릿하다). 그래서 캔버스를 3배로 잡고 화면 안의
// 모든 절대 픽셀값에 같은 배수 U를 곱한다. visual-layout-qa의 backingScale assert가 이걸 검사한다.

import { SPEC } from '../data/spec.js';

export const U = SPEC.canvas.width / 390;

export const px = (n) => Math.round(n * U);
export const font = (n) => `${Math.round(n * U)}px`;

// §2.0.25 버튼 규격 토큰 (390×844 디자인 단위). primary와 secondary가 폭을 공유하는 것은
// 세로로 쌓였을 때 좌우 정렬이 어긋나 보이지 않게 하기 위해서다.
export const BUTTON = Object.freeze({
  primary: Object.freeze({ width: px(230), height: px(64), fontSize: font(22) }),
  secondary: Object.freeze({ width: px(230), height: px(54), fontSize: font(19) }),
  icon: Object.freeze({ width: px(56), height: px(56), fontSize: font(22) }),
});

// 액센트는 게임이 이미 선언한 색에서 고른다(collectible → player → ui). 새 색을 발명하면
// 통일감이 깨진다. 이 게임의 액센트는 등대 램프의 호박색이다.
const THEME_ACCENT = 0xffe066;
const THEME_DEEP = 0x12241a;
const THEME_INK = 0x07130c;

export const PALETTE = Object.freeze({
  accent: THEME_ACCENT,
  accentDim: 0xc9ad4f,
  panel: THEME_DEEP,
  ink: THEME_INK,
  text: '#e8f5ee',
  textDim: '#9fbfa8',
  danger: 0xff5f5f,
  ok: 0x7fe0a8,
});

// 버튼 색은 테마에서 파생한다. primary는 액센트를 채우고 어두운 라벨을, secondary는
// 배경 계열을 채우고 액센트 테두리를 쓴다 — 색상(hue)은 같고 명도만 다르다.
export function buttonStyle(variant = 'primary') {
  if (variant === 'primary') {
    return { fill: PALETTE.accent, stroke: 0xfff4c8, label: '#2a2405', labelStroke: '#fff0b0' };
  }
  if (variant === 'icon') {
    return { fill: PALETTE.panel, stroke: PALETTE.accent, label: '#ffe066', labelStroke: '#07130c' };
  }
  return { fill: PALETTE.panel, stroke: PALETTE.accentDim, label: '#ffeaa0', labelStroke: '#07130c' };
}
