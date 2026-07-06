import { SPEC } from '../data/spec.js';
import { makeTextButton } from './MobileButton.js';

export default class HudUI {
  constructor(scene, onPause) {
    const { width } = SPEC.canvas;
    this.scoreText = scene.add.text(18, 18, 'SCORE 0', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setDepth(20);
    this.levelText = scene.add.text(18, 44, 'LV 1', { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#b9d7ff', stroke: '#000000', strokeThickness: 3 }).setDepth(20);
    if (scene.textures.exists('ui_pause')) {
      const img = scene.add.image(width - 46, 42, 'ui_pause').setDisplaySize(56, 56).setInteractive({ useHandCursor: true });
      let pressed = false;
      img.on('pointerdown', () => { pressed = true; img.setDisplaySize(52, 52); });
      img.on('pointerup', () => { const run = pressed; pressed = false; img.setDisplaySize(56, 56); if (run) onPause && onPause(); });
      img.on('pointerout', () => { pressed = false; img.setDisplaySize(56, 56); });
      this.pause = { bg: img, txt: img, destroy: () => img.destroy() };
    } else {
      this.pause = makeTextButton(scene, width - 54, 38, 'Ⅱ', onPause, 58, 48);
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
