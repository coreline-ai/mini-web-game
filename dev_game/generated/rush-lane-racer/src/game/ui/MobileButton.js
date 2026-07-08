import { ASSET_KEYS } from '../constants/gameKeys.js';

function chooseTexture(label, fill) {
  if (String(label).trim() === 'Ⅱ') return ASSET_KEYS.uiButtonPause;
  if (fill === 0x187bd9 || fill === 0x147bd7) return ASSET_KEYS.uiButtonBlue;
  return ASSET_KEYS.uiButtonGreen;
}

export function makeTextButton(scene, x, y, label, onClick, width = 190, height = 58, fill = 0x24cc58, fontSize = '24px') {
  const textureKey = chooseTexture(label, fill);
  const hasTexture = scene.textures.exists(textureKey);
  const shadow = scene.add.rectangle(x, y + Math.max(7, height * 0.08), width * 0.96, height * 0.86, 0x000000, 0.36).setDepth(29);
  let bg;
  let shine;
  if (hasTexture) {
    bg = scene.add.image(x, y, textureKey).setDisplaySize(width, height).setDepth(30);
    shine = scene.add.rectangle(x, y - height * 0.28, width * 0.55, Math.max(3, height * 0.055), 0xffffff, 0.0001).setDepth(31);
  } else {
    bg = scene.add.rectangle(x, y, width, height, fill, 1).setStrokeStyle(Math.max(3, height * 0.045), 0xffffff, 0.82).setDepth(30);
    shine = scene.add.rectangle(x, y - height * 0.26, width * 0.82, height * 0.16, 0xffffff, 0.22).setDepth(31);
  }
  const textLabel = textureKey === ASSET_KEYS.uiButtonPause ? '' : label;
  const txt = scene.add.text(x, y, textLabel, { fontFamily: 'Arial Black, Arial', fontSize, color: '#ffffff', stroke: '#000000', strokeThickness: Math.max(4, parseInt(fontSize, 10) * 0.12) }).setOrigin(0.5).setDepth(32);
  bg.setInteractive({ useHandCursor: true });
  const baseScaleX = bg.scaleX;
  const baseScaleY = bg.scaleY;
  const setScaleAll = (s) => { bg.setScale(baseScaleX * s, baseScaleY * s); shadow.setScale(s); shine.setScale(s); txt.setScale(s); };
  bg.on('pointerdown', () => { setScaleAll(0.97); onClick?.(); });
  bg.on('pointerup', () => setScaleAll(1));
  bg.on('pointerout', () => setScaleAll(1));
  return {
    bg,
    txt,
    shadow,
    shine,
    textureKey,
    destroy: () => { shadow.destroy(); bg.destroy(); shine.destroy(); txt.destroy(); },
    setVisible: (v) => { shadow.setVisible(v); bg.setVisible(v); shine.setVisible(v); txt.setVisible(v); },
    getLayoutItem: (id, options = {}) => ({ id, x: bg.getBounds().x, y: bg.getBounds().y, width: bg.getBounds().width, height: bg.getBounds().height, visible: bg.visible !== false, textureKey, allowStretch: true, ...options }),
  };
}
