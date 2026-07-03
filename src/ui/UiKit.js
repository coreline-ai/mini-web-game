import Phaser from 'phaser';
import { GC } from '../config/gameConfig.js';

export const FONT_BODY = '"Apple SD Gothic Neo", "Malgun Gothic", Arial, sans-serif';
export const FONT_HEAVY = '"Arial Black", "Apple SD Gothic Neo", Arial, sans-serif';

// 메뉴 공용 UI 헬퍼.
export function playClick(scene) {
  if (scene.cache.audio.exists(GC.AUDIO.ui.buttonClick.key)) {
    scene.sound.play(GC.AUDIO.ui.buttonClick.key, { volume: 0.6 });
  }
}

export function panel(scene, x, y, width, height, opts = {}) {
  const fill = opts.fill ?? 0x07101f;
  const alpha = opts.alpha ?? 0.72;
  const stroke = opts.stroke ?? 0xffffff;
  const strokeAlpha = opts.strokeAlpha ?? 0.22;
  const strokeWidth = opts.strokeWidth ?? 3;
  const radius = opts.radius ?? 28;
  const g = scene.add.graphics().setDepth(opts.depth ?? 2);
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius);
  g.lineStyle(strokeWidth, stroke, strokeAlpha);
  g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, radius);
  return g;
}

export function formatCount(value) {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}M`;
  if (n >= 10000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K`;
  return `${n}`;
}

export function fitTextWidth(text, maxWidth, minScale = 0.72) {
  text.setScale(1);
  const width = text.getBounds().width;
  if (width > maxWidth) text.setScale(Math.max(minScale, maxWidth / width));
  return text;
}

export function iconButton(scene, x, y, key, onClick, size = 112) {
  const btn = scene.add.image(x, y, key).setDisplaySize(size, size).setInteractive({ useHandCursor: true });
  btn.on('pointerover', () => btn.setScale(btn.scaleX * 1.08));
  btn.on('pointerout', () => btn.setDisplaySize(size, size));
  btn.on('pointerdown', () => { playClick(scene); scene.tweens.add({ targets: btn, scale: btn.scaleX * 0.9, duration: 80, yoyo: true }); onClick(); });
  return btn;
}

export function textButton(scene, x, y, label, onClick, opts = {}) {
  const style = {
    fontFamily: opts.fontFamily || FONT_HEAVY,
    fontSize: opts.fontSize || '60px',
    color: opts.color || '#ffffff',
    backgroundColor: opts.bg || '#00000066',
    padding: { x: opts.padX ?? 46, y: opts.padY ?? 20 },
    align: opts.align || 'center',
  };
  if (opts.fixedWidth) style.fixedWidth = opts.fixedWidth;
  if (opts.fixedHeight) style.fixedHeight = opts.fixedHeight;

  const t = scene.add
    .text(x, y, label, style)
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  t.on('pointerover', () => t.setColor('#ffd54a'));
  t.on('pointerout', () => t.setColor(opts.color || '#ffffff'));
  t.on('pointerdown', () => { playClick(scene); onClick(); });
  return t;
}

export function imageTextButton(scene, x, y, textureKey, label, onClick, opts = {}) {
  const width = opts.width ?? 520;
  const height = opts.height ?? 136;
  const container = scene.add.container(x, y);
  container.setSize(width, height);

  const bg = scene.add.image(0, 0, textureKey).setDisplaySize(width, height);
  if (opts.tint) bg.setTint(opts.tint);
  if (opts.alpha !== undefined) bg.setAlpha(opts.alpha);

  const text = scene.add
    .text(opts.textOffsetX ?? 0, opts.textOffsetY ?? 0, label, {
      fontFamily: opts.fontFamily || FONT_HEAVY,
      fontSize: opts.fontSize || '52px',
      color: opts.color || '#ffffff',
      align: 'center',
      stroke: opts.stroke || '#17315a',
      strokeThickness: opts.strokeThickness ?? 5,
    })
    .setOrigin(0.5);

  const fitLabel = () => fitTextWidth(text, opts.maxTextWidth ?? width - 160, opts.minScale ?? 0.68);
  fitLabel();

  container.add([bg, text]);
  container
    .setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains)
    .on('pointerover', () => container.setScale(1.04))
    .on('pointerout', () => container.setScale(1))
    .on('pointerdown', () => {
      playClick(scene);
      scene.tweens.add({ targets: container, scale: 0.94, duration: 80, yoyo: true, onComplete: () => container.setScale(1) });
      onClick();
    });

  container.bg = bg;
  container.label = text;
  container.setLabel = (nextLabel) => {
    text.setText(nextLabel);
    fitLabel();
    return container;
  };
  container.setButtonTexture = (nextKey) => {
    bg.setTexture(nextKey).setDisplaySize(width, height);
    return container;
  };
  container.setTextColor = (nextColor) => {
    text.setColor(nextColor);
    return container;
  };
  container.setButtonTint = (nextTint = null) => {
    if (nextTint === null) bg.clearTint();
    else bg.setTint(nextTint);
    return container;
  };
  return container;
}

// 상단 코인 표시
export function coinLabel(scene, coins) {
  const rightPad = 64;
  const gap = 18;
  const label = scene.add
    .text(GC.WIDTH - rightPad, 60, formatCount(coins), { fontFamily: FONT_HEAVY, fontSize: '52px', color: '#ffd54a', stroke: '#000', strokeThickness: 5 })
    .setOrigin(1, 0.5)
    .setDepth(30);
  fitTextWidth(label, 116);

  const labelBounds = label.getBounds();
  scene.add.image(labelBounds.x - gap - 30, 60, 'coin_01').setDisplaySize(60, 60).setDepth(30);
  return label;
}
