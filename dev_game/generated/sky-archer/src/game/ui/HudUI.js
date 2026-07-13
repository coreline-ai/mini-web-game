import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { fontPx, strokePx, su } from '../constants/tuning.js';
import { makeTextButton } from './MobileButton.js';

export default class HudUI {
  constructor(scene, onPause) {
    const { width } = SPEC.canvas;
    this.scoreText = scene.add.text(su(18), su(18), 'SCORE 0', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(18), color: '#ffffff', stroke: '#000000', strokeThickness: strokePx(4) }).setDepth(20);
    this.levelText = scene.add.text(su(18), su(44), 'LV 1', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(14), color: '#b9d7ff', stroke: '#000000', strokeThickness: strokePx(3) }).setDepth(20);
    if (scene.textures.exists(ASSET_KEYS.ui.pause)) {
      const img = scene.add.image(width - su(46), su(42), ASSET_KEYS.ui.pause).setDisplaySize(su(56), su(56)).setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => { img.setDisplaySize(su(56) * 0.92, su(56) * 0.92); onPause && onPause(); });
      img.on('pointerup', () => img.setDisplaySize(su(56), su(56)));
      img.on('pointerout', () => img.setDisplaySize(su(56), su(56)));
      this.pause = { bg: img, txt: img, destroy: () => img.destroy() };
    } else {
      this.pause = makeTextButton(scene, width - su(54), su(38), 'Ⅱ', onPause, su(58), su(48));
    }
    this.pause.bg.setDepth(20); this.pause.txt.setDepth(21);
  }
  update(score, level) {
    this.scoreText.setText('SCORE ' + score);
    this.levelText.setText('LV ' + level);
  }
  setVisible(v) {
    this.scoreText.setVisible(v); this.levelText.setVisible(v); this.pause.bg.setVisible(v); this.pause.txt.setVisible(v);
  }
}
