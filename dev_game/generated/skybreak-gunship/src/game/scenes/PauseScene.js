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
    this.add.rectangle(0, 0, width, height, 0x02090e, 0.78).setOrigin(0);
    this.add.rectangle(width / 2, height / 2, 344, 420, 0x061822, 0.97).setStrokeStyle(2, 0x43dfff, 0.8);
    this.add.text(width / 2, 262, 'TACTICAL HOLD', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(width / 2, 310, 'WEAPONS SAFE · MISSION PAUSED', { fontFamily: 'Arial Black, Arial', fontSize: '10px', color: '#66dfff' }).setOrigin(0.5);
    this.resumeBtn = makeTextButton(this, width / 2, 414, 'RESUME MISSION', () => this.time.delayedCall(32, () => { this.scene.stop(); this.scene.resume(SCENES.GAME); AudioManager.resumeMusic(); }), 270, 64);
    this.homeBtn = makeTextButton(this, width / 2, 504, 'ABORT TO COMMAND', () => { AudioManager.stopMusic(); this.time.delayedCall(32, () => { this.scene.stop(SCENES.GAME); this.scene.start(SCENES.HOME); }); }, 270, 58, 0xff6c5f);
    publishLayout(this, [{ id: 'paused', obj: this.resumeBtn.bg }, { id: 'home', obj: this.homeBtn.bg }]);
  }
}
