import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayoutStable } from '../systems/LayoutRegistry.js';
import { px, font, PALETTE } from '../config/theme.js';
import { AudioManager } from '../systems/AudioManager.js';
import { bestLoadedBackdrop } from '../systems/BackdropLoader.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAMEOVER); }

  create(data = {}) {
    const { width, height } = SPEC.canvas;
    const win = data.outcome === 'win';
    // 전용 배경(bg_4/bg_3)은 그 스테이지에 도달했을 때만 올라와 있다. 배경을 선로드하지
    // 않게 되었으므로, 없으면 이미 올라온 배경 중 가장 진행된 것으로 대체한다 — 배경 없는
    // 종료 화면이 되지 않게 한다.
    const key = bestLoadedBackdrop(this, [win ? 'bg_4' : 'bg_3']);
    if (key && this.textures.exists(key)) {
      const bg = this.add.image(width / 2, height / 2, key).setDepth(-10);
      const s = Math.max(width / (bg.width || width), height / (bg.height || height));
      bg.setScale(s);
      this.add.rectangle(0, 0, width, height, 0x04101d, 0.62).setOrigin(0).setDepth(-9);
    }
    AudioManager.stopMusic();

    this.title = this.add.text(width / 2, height * 0.26, win ? 'DAWN REACHED' : 'THE SEA WON', {
      fontFamily: 'Arial Black,Arial', fontSize: font(42),
      color: win ? '#ffcf6b' : '#ff9d9d', align: 'center',
      stroke: '#04101d', strokeThickness: px(4),
      wordWrap: { width: width - px(56) },
    }).setOrigin(0.5);

    this.detail = this.add.text(width / 2, height * 0.42, [
      `점수  ${data.score ?? 0}`,
      `최고  ${data.best ?? 0}`,
      `인도한 배  ${data.guided ?? 0}척`,
      `도달 스테이지  ${data.stage ?? 1}`,
      `난파  ${data.wrecks ?? 0}회`,
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
