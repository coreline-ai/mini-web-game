// MobileButton — 규격 토큰과 테마 팔레트를 따르는 one-shot 버튼.
//
// 셸 기본값은 크기를 호출부가 지어내고 색이 항상 초록이었다. 둘 다 §2.0.25가 실패로 규정한다.
// 여기서는 variant(primary/secondary/icon)로만 크기를 고르고, 색은 theme.js에서 파생한다.
//
// one-shot과 pressed 시각 복구는 결함 클래스 I(입력 견고성) 요구사항이다:
// 전환 버튼은 한 번만 발동해야 하고, pointerup/pointerout 어느 쪽으로 끝나도 눌린 모습이
// 남으면 안 된다.

import { BUTTON, buttonStyle } from '../config/theme.js';

export function makeTextButton(scene, x, y, label, onClick, options = {}) {
  const variant = options.variant || (options.width || options.height ? 'custom' : 'primary');
  const token = BUTTON[variant] || BUTTON.primary;
  const width = options.width || token.width;
  const height = options.height || token.height;
  const fontSize = options.fontSize || token.fontSize;
  const style = buttonStyle(variant === 'custom' ? 'primary' : variant);
  const { oneShot = false, fireOn = 'pointerup', disabled = false } = options;

  const bg = scene.add.rectangle(x, y, width, height, style.fill, 1)
    .setStrokeStyle(Math.max(2, Math.round(height * 0.045)), style.stroke, 0.95);
  const txt = scene.add.text(x, y, label, {
    fontFamily: 'Arial Black,Arial', fontSize, color: style.label,
    stroke: style.labelStroke, strokeThickness: Math.max(2, Math.round(height * 0.05)),
  }).setOrigin(0.5);

  let fired = false;
  let enabled = !disabled;
  const resetVisual = () => { bg.setScale(1); txt.setScale(1); };
  const fire = () => {
    if (!enabled || fired) return;
    if (oneShot) { fired = true; bg.disableInteractive(); }
    onClick?.();
  };
  const setEnabled = (value) => {
    enabled = !!value;
    if (enabled && !fired) bg.setInteractive({ useHandCursor: true });
    else bg.disableInteractive();
    resetVisual();
  };
  setEnabled(enabled);

  bg.on('pointerdown', () => {
    if (!enabled || fired) return;
    bg.setScale(0.96); txt.setScale(0.96);
    if (fireOn === 'pointerdown') fire();
  });
  bg.on('pointerup', () => {
    if (!enabled || fired) return;
    resetVisual();
    if (fireOn !== 'pointerdown') fire();
  });
  bg.on('pointerout', resetVisual);
  bg.on('pointerupoutside', resetVisual);

  return {
    bg, txt, resetVisual, setEnabled,
    setLabel(next) { txt.setText(next); },
    destroy() { bg.destroy(); txt.destroy(); },
  };
}
