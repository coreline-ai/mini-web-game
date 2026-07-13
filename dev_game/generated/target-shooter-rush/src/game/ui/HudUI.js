import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { fontPx, strokePx, su } from '../constants/tuning.js';
import { makeTextButton } from './MobileButton.js';

export default class HudUI {
  constructor(scene, onPause) {
    const { width } = SPEC.canvas;
    this.panel = scene.add.rectangle(su(16), su(16), su(236), su(108), 0x07121d, 0.72)
      .setOrigin(0)
      .setStrokeStyle(strokePx(2), 0x57d8ff, 0.8)
      .setDepth(19);
    this.scoreText = scene.add.text(su(28), su(23), 'SCORE 0', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(16), color: '#ffffff', stroke: '#000000', strokeThickness: strokePx(4) }).setDepth(20);
    this.timeText = scene.add.text(su(28), su(47), 'TIME 45.0', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(14), color: '#ffd54a', stroke: '#000000', strokeThickness: strokePx(3) }).setDepth(20);
    this.stageText = scene.add.text(su(28), su(68), 'STAGE 1 DAY', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(12), color: '#39e98a', stroke: '#000000', strokeThickness: strokePx(3) }).setDepth(20);
    this.goalText = scene.add.text(su(28), su(87), 'GOAL 0/4', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(12), color: '#a8f3ff', stroke: '#000000', strokeThickness: strokePx(3) }).setDepth(20);
    this.comboText = scene.add.text(su(152), su(87), 'x0', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(12), color: '#ffffff', stroke: '#000000', strokeThickness: strokePx(3) }).setDepth(20);
    if (scene.textures.exists(ASSET_KEYS.ui.pause)) {
      const normalSize = su(56);
      const pressedSize = su(52);
      const img = scene.add.image(width - su(46), su(42), ASSET_KEYS.ui.pause).setDisplaySize(normalSize, normalSize).setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => { img.setDisplaySize(pressedSize, pressedSize); onPause && onPause(); });
      img.on('pointerup', () => img.setDisplaySize(normalSize, normalSize));
      img.on('pointerout', () => img.setDisplaySize(normalSize, normalSize));
      this.pause = { bg: img, txt: img, destroy: () => img.destroy() };
    } else {
      this.pause = makeTextButton(scene, width - su(54), su(38), 'Ⅱ', onPause, su(58), su(48));
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
