import Phaser from 'phaser';

const TEXTURE_SCALE = 2;

function ensureTextButtonTexture(scene, width, height) {
  const key = `safe_text_button_${width}x${height}`;
  if (scene.textures.exists(key)) return key;

  const s = TEXTURE_SCALE;
  const w = width * s;
  const h = height * s;
  const r = Math.min(28 * s, h / 2);
  const g = scene.make.graphics({ add: false });

  g.fillStyle(0x3d2300, 1);
  g.fillRoundedRect(0, 0, w, h, r);
  g.fillStyle(0xffcf35, 1);
  g.fillRoundedRect(4 * s, 4 * s, w - 8 * s, h - 8 * s, r - 2 * s);
  g.fillStyle(0x061a58, 1);
  g.fillRoundedRect(11 * s, 12 * s, w - 22 * s, h - 24 * s, r - 8 * s);
  g.fillStyle(0x0788ff, 1);
  g.fillRoundedRect(15 * s, 16 * s, w - 30 * s, h * 0.38, r - 12 * s);
  g.fillStyle(0x004cc3, 1);
  g.fillRoundedRect(15 * s, h * 0.34, w - 30 * s, h * 0.45, r - 12 * s);
  g.lineStyle(2 * s, 0xffffff, 0.82);
  g.strokeRoundedRect(18 * s, 17 * s, w - 36 * s, h - 34 * s, r - 13 * s);
  g.lineStyle(2 * s, 0x0a1026, 0.85);
  g.strokeRoundedRect(10 * s, 11 * s, w - 20 * s, h - 22 * s, r - 8 * s);
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

function ensureIconFrameTexture(scene, variant) {
  const key = `safe_icon_frame_${variant}`;
  if (scene.textures.exists(key)) return key;

  const size = 160;
  const r = 28;
  const fill = variant === 'settings' ? 0x1f9b38 : 0x0478e6;
  const fill2 = variant === 'settings' ? 0x0c6f28 : 0x0047ba;
  const g = scene.make.graphics({ add: false });

  g.fillStyle(0x3b2200, 1);
  g.fillRoundedRect(0, 0, size, size, r);
  g.fillStyle(0xffc832, 1);
  g.fillRoundedRect(7, 7, size - 14, size - 14, r - 3);
  g.fillStyle(0x071438, 1);
  g.fillRoundedRect(15, 15, size - 30, size - 30, r - 7);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(20, 20, size - 40, size - 40, r - 10);
  g.fillStyle(fill2, 1);
  g.fillRoundedRect(22, 68, size - 44, 66, r - 12);
  g.fillStyle(0x79d9ff, 0.55);
  g.fillRoundedRect(26, 25, size - 52, 34, r - 16);
  g.lineStyle(3, 0xffffff, 0.72);
  g.strokeRoundedRect(25, 25, size - 50, size - 50, r - 13);
  g.generateTexture(key, size, size);
  g.destroy();
  return key;
}

function iconVariant(key) {
  if (/settings/i.test(key)) return 'settings';
  return 'blue';
}

function drawSoundSymbol(g, size) {
  const outline = 0x4b2b00;
  const gold = 0xffcf2f;
  const cx = -size * 0.08;
  const y = 0;
  const unit = size / 68;

  g.fillStyle(outline, 1);
  g.fillRoundedRect(cx - 18 * unit, y - 10 * unit, 12 * unit, 20 * unit, 4 * unit);
  g.fillTriangle(cx - 7 * unit, y - 15 * unit, cx + 8 * unit, y - 3 * unit, cx - 7 * unit, y + 15 * unit);
  g.fillStyle(gold, 1);
  g.fillRoundedRect(cx - 15 * unit, y - 7 * unit, 9 * unit, 14 * unit, 3 * unit);
  g.fillTriangle(cx - 6 * unit, y - 12 * unit, cx + 5 * unit, y - 2 * unit, cx - 6 * unit, y + 12 * unit);

  g.lineStyle(4 * unit, outline, 1);
  g.beginPath();
  g.arc(cx + 8 * unit, y, 9 * unit, -0.72, 0.72, false);
  g.strokePath();
  g.beginPath();
  g.arc(cx + 12 * unit, y, 15 * unit, -0.68, 0.68, false);
  g.strokePath();
  g.lineStyle(2.8 * unit, gold, 1);
  g.beginPath();
  g.arc(cx + 8 * unit, y, 9 * unit, -0.72, 0.72, false);
  g.strokePath();
  g.beginPath();
  g.arc(cx + 12 * unit, y, 15 * unit, -0.68, 0.68, false);
  g.strokePath();
}

function drawPauseSymbol(g, size) {
  const unit = size / 64;
  const barW = 12 * unit;
  const barH = 31 * unit;
  const gap = 9 * unit;
  g.fillStyle(0x4b2b00, 1);
  g.fillRoundedRect(-gap - barW, -barH / 2, barW, barH, 4 * unit);
  g.fillRoundedRect(gap, -barH / 2, barW, barH, 4 * unit);
  g.fillStyle(0xffecd4, 1);
  g.fillRoundedRect(-gap - barW + 2 * unit, -barH / 2 + 2 * unit, barW - 4 * unit, barH - 4 * unit, 3 * unit);
  g.fillRoundedRect(gap + 2 * unit, -barH / 2 + 2 * unit, barW - 4 * unit, barH - 4 * unit, 3 * unit);
}

function drawSettingsSymbol(g, size) {
  const unit = size / 68;
  const centerFill = 0x0f7a2f;
  const outline = 0x4b2b00;
  const gold = 0xffcf2f;
  const toothR = 5.8 * unit;
  const toothD = 19 * unit;

  g.fillStyle(outline, 1);
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8;
    g.fillCircle(Math.cos(a) * toothD, Math.sin(a) * toothD, toothR + 2 * unit);
  }
  g.fillCircle(0, 0, 22 * unit);
  g.fillStyle(gold, 1);
  for (let i = 0; i < 8; i += 1) {
    const a = (Math.PI * 2 * i) / 8;
    g.fillCircle(Math.cos(a) * toothD, Math.sin(a) * toothD, toothR);
  }
  g.fillCircle(0, 0, 18 * unit);
  g.fillStyle(outline, 1);
  g.fillCircle(0, 0, 9 * unit);
  g.fillStyle(centerFill, 1);
  g.fillCircle(0, 0, 6 * unit);
}

function drawIconSymbol(g, key, size) {
  if (/settings/i.test(key)) {
    drawSettingsSymbol(g, size);
  } else if (/pause/i.test(key)) {
    drawPauseSymbol(g, size);
  } else {
    drawSoundSymbol(g, size);
  }
}

export function makeTextButton(scene, x, y, label, onClick, width = 190, height = 58) {
  const textureKey = ensureTextButtonTexture(scene, width, height);
  const bg = scene.add.image(x, y, textureKey).setDisplaySize(width, height);
  const fontSize = Math.max(20, Math.min(28, Math.floor(height * 0.39)));
  const txt = scene.add.text(x, y, label, {
    fontFamily: 'Arial Black, Arial',
    fontSize: `${fontSize}px`,
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 4,
  }).setOrigin(0.5);
  let pressed = false;
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => {
    if (pressed) return;
    pressed = true;
    bg.setDisplaySize(width * 0.96, height * 0.96);
    txt.setScale(0.96);
    scene.time.delayedCall(70, () => {
      pressed = false;
      bg.setDisplaySize(width, height);
      txt.setScale(1);
      onClick?.();
    });
  });
  bg.on('pointerup', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  bg.on('pointerout', () => { if (!pressed) { bg.setDisplaySize(width, height); txt.setScale(1); } });
  return { bg, txt, destroy: () => { bg.destroy(); txt.destroy(); } };
}

export function makeIconButton(scene, x, y, key, onClick, size = 58) {
  const container = scene.add.container(x, y);
  const frame = scene.add.image(0, 0, ensureIconFrameTexture(scene, iconVariant(key))).setDisplaySize(size, size);
  const symbol = scene.add.graphics();
  drawIconSymbol(symbol, key, size);
  container.add([frame, symbol]);
  container.setSize(size, size);
  container.setInteractive({ useHandCursor: true });

  let pressed = false;
  const setPressed = (value) => container.setScale(value ? 0.94 : 1);
  container.on('pointerdown', () => {
    if (pressed) return;
    pressed = true;
    setPressed(true);
    scene.time.delayedCall(70, () => {
      pressed = false;
      setPressed(false);
      onClick?.();
    });
  });
  container.on('pointerup', () => setPressed(false));
  container.on('pointerout', () => { if (!pressed) setPressed(false); });
  return { bg: container, txt: container, destroy: () => container.destroy(true) };
}
