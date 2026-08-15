import { SPEC } from '../data/spec.js';
import { makeTextButton } from './MobileButton.js';
import { U, BUTTON } from '../constants/tuning.js';

export default class HudUI {
  constructor(scene, onPause) {
    const { width } = SPEC.canvas;
    this.scoreText = scene.add.text(18 * U, 18 * U, 'SCORE 0', { fontFamily: 'Arial Black, Arial', fontSize: 18 * U + 'px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setDepth(20);
    this.levelText = scene.add.text(18 * U, 44 * U, 'LV 1', { fontFamily: 'Arial Black, Arial', fontSize: 14 * U + 'px', color: '#b9d7ff', stroke: '#000000', strokeThickness: 3 }).setDepth(20);
    if (scene.textures.exists('ui_pause')) {
      const img = scene.add.image(width - 46 * U, 42 * U, 'ui_pause').setDisplaySize(56 * U, 56 * U).setInteractive({ useHandCursor: true });
      let fired = false;
      img.on('pointerdown', () => { if (!fired) img.setDisplaySize(52 * U, 52 * U); });
      img.on('pointerup', () => { if (fired) return; fired = true; img.disableInteractive(); img.setDisplaySize(56 * U, 56 * U); onPause && onPause(); });
      img.on('pointerout', () => img.setDisplaySize(56 * U, 56 * U));
      this.pause = { bg: img, txt: img, destroy: () => img.destroy() };
    } else {
      this.pause = makeTextButton(scene, width - 54 * U, 38 * U, 'Ⅱ', onPause, BUTTON.icon, { oneShot: true });
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
