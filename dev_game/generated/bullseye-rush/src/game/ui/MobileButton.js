import { buttonPalette } from '../constants/palette.js';
import { fontPx, strokePx, su } from '../utils/scale.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';

export function makeTextButton(scene, x, y, label, onClick, size = BUTTON.primary, heightOrOptions, maybeOptions) {
  // 규격 토큰(디자인 단위)을 받는다. 과거 시그니처(width, height, options)도 계속 동작시키되,
  // 그 호출부는 이미 스케일된 픽셀을 넘기므로 다시 스케일하지 않는다 — 이중 적용은 버튼을 배로 키운다.
  let spec = size; let options = heightOrOptions || {}; let preScaled = false;
  if (typeof size === 'number') { spec = { width: size, height: heightOrOptions }; options = maybeOptions || {}; preScaled = true; }
  let width = spec.width; let height = spec.height;
  width = su(width);
  height = su(height);
  const _k = 'btnui_' + width + 'x' + height;
    if (!scene.textures.exists(ASSET_KEYS.ui.frame) && !scene.textures.exists(_k)) {
      const g = scene.make.graphics({ add: false });
      const r = Math.min(su(22), height / 2);
      const pal = buttonPalette();
      g.fillStyle(pal.shadow, 1); g.fillRoundedRect(0, 0, width, height, r);
      g.fillStyle(pal.face, 1); g.fillRoundedRect(su(2), su(2), width - su(4), height - su(6), r);
      g.fillStyle(pal.highlight, 0.85); g.fillRoundedRect(su(4), su(3), width - su(8), Math.max(su(3), height * 0.42), r);
      g.lineStyle(su(2.5), 0xffffff, 0.9); g.strokeRoundedRect(su(1), su(1), width - su(2), height - su(2), r);
      g.generateTexture(_k, width, height); g.destroy();
    }
    const bg = scene.textures.exists(ASSET_KEYS.ui.frame) ? scene.add.image(x, y, ASSET_KEYS.ui.frame).setDisplaySize(width, height) : scene.add.image(x, y, _k);
  const txt = scene.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: fontPx(24), color: '#ffffff', stroke: '#000000', strokeThickness: strokePx(4) }).setOrigin(0.5);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => { bg.setDisplaySize(width * 0.96, height * 0.96); txt.setScale(0.96); onClick?.(); });
  bg.on('pointerup', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  bg.on('pointerout', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  return { bg, txt, destroy: () => { bg.destroy(); txt.destroy(); } };
}
