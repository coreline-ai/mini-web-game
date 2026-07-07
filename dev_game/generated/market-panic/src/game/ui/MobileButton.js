import { HEAVY_FONT } from '../config/marketConfig.js';
import { makeSolidButtonTexture } from './ButtonSurface.js';
import { sharpenText } from './TextSharpness.js';

export function makeTextButton(scene, x, y, label, onClick, width = 190, height = 58) {
  const texture = makeSolidButtonTexture(scene, `solid_btn_${width}x${height}_green`, width, height, 0x16a34a, 0xecfdf5);
  const bg = scene.add.image(x, y, texture).setDisplaySize(width, height);
  const txt = sharpenText(scene.add.text(x, y, label, {
    fontFamily: HEAVY_FONT,
    fontSize: '24px',
    color: '#ffffff',
    stroke: '#020617',
    strokeThickness: 5,
  })).setOrigin(0.5);
  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', () => { bg.setDisplaySize(width * 0.96, height * 0.96); txt.setScale(0.96); onClick?.(); });
  bg.on('pointerup', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  bg.on('pointerout', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  return { bg, txt, destroy: () => { bg.destroy(); txt.destroy(); } };
}
