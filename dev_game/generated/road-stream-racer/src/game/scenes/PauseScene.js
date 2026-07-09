import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { fontPx, strokePx } from '../utils/scale.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class PauseScene extends Phaser.Scene {
  constructor() { super(SCENES.PAUSE); }
  create() {
    const { width, height } = SPEC.canvas;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.62).setOrigin(0);
    this.pausedText = this.add.text(width / 2, height * 0.31, '일시 정지', { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: fontPx(88), color: '#fff', stroke: '#07111d', strokeThickness: strokePx(14) }).setOrigin(0.5);
    this.resumeBtn = makeTextButton(this, width / 2, height * 0.49, '계속하기', () => { this.scene.stop(); this.scene.resume(SCENES.GAME); AudioManager.resumeMusic(); }, 540, 180);
    this.pHomeBtn = makeTextButton(this, width / 2, height * 0.64, '처음으로', () => { AudioManager.stopMusic(); this.scene.stop(SCENES.GAME); this.scene.start(SCENES.HOME); }, 540, 180);
    this._pauseLayout = [{ id: 'paused', obj: this.pausedText }, { id: 'resume', obj: this.resumeBtn.bg }, { id: 'home', obj: this.pHomeBtn.bg }];
    const pub = () => publishLayout(this, this._pauseLayout);
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
