import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout, objectBounds } from '../systems/LayoutRegistry.js';

export default class PauseScene extends Phaser.Scene {
  constructor() { super(SCENES.PAUSE); }
  create() {
    const { width, height } = SPEC.canvas;
    this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.62).setOrigin(0).setDepth(100);
    this.panel = this.add.rectangle(width / 2, height / 2, width * 0.78, height * 0.48, 0x07111e, 0.88).setStrokeStyle(7, 0x7ee9ff, 0.76).setDepth(101);
    this.title = this.add.text(width / 2, height * 0.32, 'PAUSED', { fontFamily: 'Arial Black, Arial', fontSize: '106px', color: '#fff', stroke: '#000', strokeThickness: 14 }).setOrigin(0.5).setDepth(102);
    this.resumeButton = makeTextButton(this, width / 2, height * 0.48, 'RESUME', () => { this.scene.stop(); this.scene.resume(SCENES.GAME); AudioManager.resumeMusic(); }, 520, 118, 0x24cc58, '58px');
    this.homeButton = makeTextButton(this, width / 2, height * 0.60, 'HOME', () => { AudioManager.stopMusic(); this.scene.stop(SCENES.GAME); this.scene.start(SCENES.HOME); }, 520, 118, 0x187bd9, '58px');
    this.publishLayout();
  }
  publishLayout() {
    publishLayout(this, 'Pause', [
      objectBounds(this, this.panel, 'pause-panel', { allowOverlap: true }),
      objectBounds(this, this.title, 'pause-title'),
      objectBounds(this, this.resumeButton.bg, 'resume-button', { allowStretch: true }),
      objectBounds(this, this.homeButton.bg, 'home-button', { allowStretch: true }),
    ], ['pause-title', 'resume-button', 'home-button']);
  }
  update() { this.publishLayout(); }
}
