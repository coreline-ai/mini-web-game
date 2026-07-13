import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { makeIconButton } from './MobileButton.js';

export default class HudUI {
  constructor(scene, onPause) {
    const { width } = SPEC.canvas;
    this.scoreText = scene.add.text(50, 50, 'SCORE 0', { fontFamily: 'Arial Black, Arial', fontSize: '48px', color: '#ffffff', stroke: '#000000', strokeThickness: 10 }).setDepth(20);
    this.levelText = scene.add.text(50, 115, 'LV 1', { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#b9d7ff', stroke: '#000000', strokeThickness: 8 }).setDepth(20);
    this.pause = makeIconButton(scene, width - 100, 100, ASSET_KEYS.ui.pause, onPause, 128);
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
