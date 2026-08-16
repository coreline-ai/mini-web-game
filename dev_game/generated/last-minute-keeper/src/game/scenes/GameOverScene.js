import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayoutStable } from '../systems/LayoutRegistry.js';
import { px, font, PALETTE } from '../config/theme.js';
import { AudioManager } from '../systems/AudioManager.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAMEOVER); }

  create(data = {}) {
    const { width, height } = SPEC.canvas;
    const win = data.outcome === 'win';
    const key = win ? 'bg_4' : 'bg_3';
    if (this.textures.exists(key)) {
      const bg = this.add.image(width / 2, height / 2, key).setDepth(-10);
      const s = Math.max(width / (bg.width || width), height / (bg.height || height));
      bg.setScale(s);
      this.add.rectangle(0, 0, width, height, 0x07130c, 0.66).setOrigin(0).setDepth(-9);
    }
    AudioManager.stopMusic();

    this.title = this.add.text(width / 2, height * 0.26, win ? 'FULL TIME' : 'BEATEN', {
      fontFamily: 'Arial Black,Arial', fontSize: font(42),
      color: win ? '#ffe066' : '#ff9d9d', align: 'center',
      stroke: '#07130c', strokeThickness: px(4),
      wordWrap: { width: width - px(56) },
    }).setOrigin(0.5);

    this.detail = this.add.text(width / 2, height * 0.42, [
      `점수  ${data.score ?? 0}`,
      `최고  ${data.best ?? 0}`,
      `세이브  ${data.saves ?? 0}회`,
      `실점  ${data.conceded ?? 0}회`,
      `도달 스테이지  ${data.stage ?? 1}`,
    ].join('\n'), {
      fontFamily: 'Arial', fontSize: font(17), color: PALETTE.text,
      align: 'center', lineSpacing: px(8),
    }).setOrigin(0.5);

    this.retry = makeTextButton(this, width / 2, height * 0.66, 'RETRY',
      () => this.scene.start(SCENES.GAME), { variant: 'primary', oneShot: true });
    this.home = makeTextButton(this, width / 2, height * 0.745, 'HOME',
      () => this.scene.start(SCENES.HOME), { variant: 'secondary', oneShot: true });

    publishLayoutStable(this, [
      { id: 'result-title', obj: this.title },
      { id: 'result-detail', obj: this.detail },
      { id: 'retry', obj: this.retry.bg },
      { id: 'home', obj: this.home.bg },
    ], { requiredIds: ['result-title', 'retry', 'home'] });
  }
}
