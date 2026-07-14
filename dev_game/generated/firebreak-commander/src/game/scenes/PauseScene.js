import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton } from '../ui/MobileButton.js';

import { publishLayout } from '../systems/LayoutRegistry.js';
import { configureLogicalScene } from '../systems/LogicalViewport.js';

export default class PauseScene extends Phaser.Scene {
  constructor() { super(SCENES.PAUSE); }
  create() {
    configureLogicalScene(this);
    const { width, height } = SPEC.canvas;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.62).setOrigin(0);
    this.pausedText = this.add.text(width / 2, height * 0.3, '일시정지', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '42px', color: '#fff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.resumeBtn = makeTextButton(this, width / 2, height * 0.48, '계속하기', () => { this.scene.stop(); this.scene.resume(SCENES.GAME); AudioManager.resumeMusic(); }, 230, 62, { oneShot: true, fireOn: 'pointerup' });
    this.pHomeBtn = makeTextButton(this, width / 2, height * 0.59, '처음 화면', () => { AudioManager.stopMusic(); this.scene.stop(SCENES.GAME); this.scene.start(SCENES.HOME); }, 230, 62, { oneShot: true, fireOn: 'pointerup' });
    this._pauseLayout = [{ id: 'paused', obj: this.pausedText }, { id: 'resume', obj: this.resumeBtn.bg }, { id: 'home', obj: this.pHomeBtn.bg }];
    const pub = () => publishLayout(this, this._pauseLayout);
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
