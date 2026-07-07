import { SPEC } from '../data/spec.js';
import { makeTextButton } from './MobileButton.js';

export default class HudUI {
  constructor(scene, onPause) {
    const { width } = SPEC.canvas;
    this.panel = scene.add.rectangle(16, 16, 220, 104, 0x07121d, 0.72)
      .setOrigin(0)
      .setStrokeStyle(2, 0x57d8ff, 0.8)
      .setDepth(19);
    this.scoreText = scene.add.text(28, 23, 'SCORE 0', { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setDepth(20);
    this.timeText = scene.add.text(28, 46, 'TIME 45.0', { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffd54a', stroke: '#000000', strokeThickness: 3 }).setDepth(20);
    this.stageText = scene.add.text(28, 66, 'STAGE 1 DAY', { fontFamily: 'Arial Black, Arial', fontSize: '12px', color: '#39e98a', stroke: '#000000', strokeThickness: 3 }).setDepth(20);
    this.goalText = scene.add.text(28, 84, 'GOAL 0/4', { fontFamily: 'Arial Black, Arial', fontSize: '12px', color: '#a8f3ff', stroke: '#000000', strokeThickness: 3 }).setDepth(20);
    this.comboText = scene.add.text(140, 84, 'x0', { fontFamily: 'Arial Black, Arial', fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setDepth(20);
    if (scene.textures.exists('ui_pause')) {
      const img = scene.add.image(width - 46, 42, 'ui_pause').setDisplaySize(56, 56).setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => { img.setDisplaySize(56, 56); onPause && onPause(); });
      img.on('pointerup', () => img.setDisplaySize(56, 56));
      img.on('pointerout', () => img.setDisplaySize(56, 56));
      this.pause = { bg: img, txt: img, destroy: () => img.destroy() };
    } else {
      this.pause = makeTextButton(scene, width - 54, 38, 'Ⅱ', onPause, 58, 48);
    }
    this.pause.bg.setDepth(20); this.pause.txt.setDepth(21);
  }
  update(score, timeLeft, combo, stage = {}) {
    this.scoreText.setText('SCORE ' + score);
    this.timeText.setText('TIME ' + Math.max(0, timeLeft).toFixed(1));
    this.stageText.setText(stage.label || 'STAGE 1 DAY');
    this.goalText.setText(stage.goal || 'GOAL 0/4');
    this.comboText.setText('x' + combo);
  }
  setVisible(v) {
    this.panel.setVisible(v); this.scoreText.setVisible(v); this.timeText.setVisible(v); this.stageText.setVisible(v); this.goalText.setVisible(v); this.comboText.setVisible(v); this.pause.bg.setVisible(v); this.pause.txt.setVisible(v);
  }
}
