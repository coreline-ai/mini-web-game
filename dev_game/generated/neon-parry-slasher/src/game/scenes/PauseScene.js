import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import { AudioSynth } from '../systems/AudioSynth.js';

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PAUSE);
  }

  create() {
    const { width, height } = SPEC.canvas;

    // Semi-transparent backdrop
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.78);

    // Modal Box in FHD
    const box = this.add.rectangle(width / 2, height / 2, width - 120, 680, 0x061122, 0.96)
      .setStrokeStyle(4, 0x00f7ff, 0.9);

    const title = this.add.text(width / 2, height / 2 - 200, 'SYSTEM PAUSED', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '56px',
      color: '#00f7ff',
      stroke: '#003366',
      strokeThickness: 8
    }).setOrigin(0.5);

    // Resume Button (Cyan)
    this.resumeBtn = makeTextButton(this, width / 2, height / 2 - 50, 'RESUME COMBAT', () => {
      AudioSynth.playClick();
      this.scene.stop();
      this.scene.resume(SCENES.GAME);
    }, { width: 540, height: 110, theme: 'cyan' });

    // Restart Button (Magenta)
    this.restartBtn = makeTextButton(this, width / 2, height / 2 + 85, 'RESTART SECTOR', () => {
      AudioSynth.playClick();
      this.scene.stop();
      this.scene.stop(SCENES.GAME);
      this.scene.start(SCENES.GAME);
    }, { width: 540, height: 110, theme: 'magenta' });

    // Home Button
    this.homeBtn = makeTextButton(this, width / 2, height / 2 + 220, 'MAIN MENU', () => {
      AudioSynth.playClick();
      AudioSynth.stopBGM();
      this.scene.stop();
      this.scene.stop(SCENES.GAME);
      this.scene.start(SCENES.HOME);
    }, { width: 540, height: 110, theme: 'cyan' });

    this.publish = () => publishLayout(this, [
      { id: 'pause-title', obj: title },
      { id: 'resume-btn', obj: this.resumeBtn.bg },
      { id: 'restart-btn', obj: this.restartBtn.bg }
    ], { requiredIds: ['resume-btn', 'restart-btn'] });

    this.publish();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, clearLayout);
  }
}
