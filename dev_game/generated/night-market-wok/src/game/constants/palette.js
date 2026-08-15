import { SPEC } from '../data/spec.js';

// 버튼/UI 색은 spec.theme.colors에서 파생한다. 하드코딩하면 게임 테마가 무엇이든 같은 색이 나와
// 배경과 겉돈다. 통일감은 배경과 같은 계열의 액센트를 쓰는 데서, 구분은 배경 대비 명도차에서 온다.
function hexToRgb(hex) {
  const v = String(hex || '').replace('#', '');
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v.padEnd(6, '0');
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}
function toInt({ r, g, b }) { return (r << 16) | (g << 8) | b; }
function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function shade(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  const t = factor >= 0 ? factor : 0;
  return factor >= 0
    ? toInt({ r: clamp(r + (255 - r) * t), g: clamp(g + (255 - g) * t), b: clamp(b + (255 - b) * t) })
    : toInt({ r: clamp(r * (1 + factor)), g: clamp(g * (1 + factor)), b: clamp(b * (1 + factor)) });
}
// 상대 휘도 (WCAG) — 배경 대비를 재서 액센트가 묻히지 않게 보정하는 데 쓴다.
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const la = luminance(a); const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function toHex(int) { return '#' + int.toString(16).padStart(6, '0'); }

export function buttonPalette() {
  const c = SPEC.theme?.colors || {};
  const bg = c.background || SPEC.canvas.backgroundColor || '#0b1024';
  // 액센트는 게임이 이미 선언한 색에서 고른다 — 새 색을 발명하지 않아야 통일감이 유지된다.
  let face = c.collectible || c.player || c.ui || '#39e98a';
  // 배경과 대비가 부족하면 밝기만 조정한다. 색상(hue)은 유지해 계열 통일을 깨지 않는다.
  let guard = 0;
  while (contrast(face, bg) < 3 && guard < 12) {
    face = toHex(shade(face, luminance(bg) < 0.35 ? 0.12 : -0.12));
    guard += 1;
  }
  const dark = luminance(bg) < 0.35;
  return {
    face: hexToRgb(face) && toInt(hexToRgb(face)),
    shadow: shade(face, -0.35),
    highlight: shade(face, 0.25),
    label: dark ? (c.ui || '#ffffff') : '#1a1a1a',
    stroke: dark ? '#000000' : '#ffffff',
  };
}
