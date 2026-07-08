const TEXTURE_SCALE = 3;

function buttonTextureKey(width, height) {
  return `btnui_hq_${Math.round(width)}x${Math.round(height)}_${TEXTURE_SCALE}x`;
}

function ensureButtonTexture(scene, width, height) {
  const key = buttonTextureKey(width, height);
  if (scene.textures.exists(key)) return key;

  const tw = Math.round(width * TEXTURE_SCALE);
  const th = Math.round(height * TEXTURE_SCALE);
  const r = Math.min(th / 2, 22 * TEXTURE_SCALE);
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x073d25, 1);
  g.fillRoundedRect(0, 0, tw, th, r);
  g.fillStyle(0xf6b83d, 1);
  g.fillRoundedRect(5 * TEXTURE_SCALE, 4 * TEXTURE_SCALE, tw - 10 * TEXTURE_SCALE, th - 8 * TEXTURE_SCALE, r * 0.92);
  g.fillStyle(0x0a7a39, 1);
  g.fillRoundedRect(10 * TEXTURE_SCALE, 9 * TEXTURE_SCALE, tw - 20 * TEXTURE_SCALE, th - 18 * TEXTURE_SCALE, r * 0.78);
  g.fillStyle(0x35c66a, 0.9);
  g.fillRoundedRect(15 * TEXTURE_SCALE, 12 * TEXTURE_SCALE, tw - 30 * TEXTURE_SCALE, Math.max(7 * TEXTURE_SCALE, th * 0.36), r * 0.56);
  g.lineStyle(3 * TEXTURE_SCALE, 0xffffff, 0.86);
  g.strokeRoundedRect(8 * TEXTURE_SCALE, 7 * TEXTURE_SCALE, tw - 16 * TEXTURE_SCALE, th - 14 * TEXTURE_SCALE, r * 0.82);
  g.generateTexture(key, tw, th);
  g.destroy();
  return key;
}

function fitButtonText(txt, width, height) {
  const maxWidth = width - Math.max(34, Math.round(height * 0.52));
  let size = Math.min(Math.floor(height * 0.43), 58);
  txt.setFontSize(size);
  while (txt.width > maxWidth && size > Math.max(15, Math.floor(height * 0.24))) {
    size -= 1;
    txt.setFontSize(size);
  }
}

export function makeTextButton(scene, x, y, label, onClick, width = 190, height = 58) {
  const textureKey = ensureButtonTexture(scene, width, height);
  const bg = scene.add.image(x, y, textureKey).setDisplaySize(width, height);
  const txt = scene.add.text(x, y, label, {
    fontFamily: 'Arial Black, Arial',
    fontSize: `${Math.min(Math.floor(height * 0.43), 58)}px`,
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: Math.max(4, Math.round(height * 0.07)),
  }).setOrigin(0.5);
  fitButtonText(txt, width, height);
  let fired = false;
  const restore = () => {
    bg.setDisplaySize(width, height);
    txt.setScale(1);
  };
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', (_pointer, _localX, _localY, event) => {
    event?.stopPropagation();
    if (fired) return;
    fired = true;
    bg.disableInteractive();
    bg.setDisplaySize(width * 0.96, height * 0.96);
    txt.setScale(0.96);
    onClick?.();
  });
  bg.on('pointerup', (_pointer, _localX, _localY, event) => { event?.stopPropagation(); restore(); });
  bg.on('pointerout', (_pointer, event) => { event?.stopPropagation(); restore(); });
  return { bg, txt, destroy: () => { bg.destroy(); txt.destroy(); } };
}
