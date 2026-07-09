import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { fontPx, strokePx } from '../utils/scale.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';

export default class CrashScene extends Phaser.Scene {
  constructor() { super(SCENES.CRASH); }

  create(data = {}) {
    const { width, height } = SPEC.canvas;
    this.add.image(width / 2, height / 2, ASSET_KEYS.stage2).setDisplaySize(width, height);
    this.add.rectangle(0, 0, width, height, 0x210910, 0.54).setOrigin(0);
    this.add.image(width / 2, height * 0.43, ASSET_KEYS.fxHit).setDisplaySize(520, 520).setDepth(2);
    this.crashText = this.add.text(width / 2, height * 0.36, '충돌!', {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: fontPx(110),
      color: '#ff6a66',
      stroke: '#07111d',
      strokeThickness: strokePx(16),
    }).setOrigin(0.5).setDepth(3);
    this.scoreText = this.add.text(width / 2, height * 0.56, `점수 ${data.score || 0}`, {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: fontPx(52),
      color: '#ffffff',
      stroke: '#07111d',
      strokeThickness: strokePx(9),
    }).setOrigin(0.5).setDepth(3);
    publishLayout(this, [{ id: 'crash', obj: this.crashText }, { id: 'crash-score', obj: this.scoreText }]);
    this.time.delayedCall(850, () => this.scene.start(SCENES.GAMEOVER, data));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, clearLayout);
  }
}
