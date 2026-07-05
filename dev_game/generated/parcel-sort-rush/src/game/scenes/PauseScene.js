import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeImageTextButton } from '../ui/MobileButton.js';
import { publishLayoutBounds } from '../systems/LayoutBounds.js';

export default class PauseScene extends Phaser.Scene {
  constructor() { super(SCENES.PAUSE); }
  create() {
    const { width, height } = SPEC.canvas;
    this.add.rectangle(0, 0, width, height, 0x000000, 0.62).setOrigin(0).setDepth(100);
    const panelW = width * 0.78;
    const panel = this.add.image(width / 2, height / 2, ASSET_KEYS.ui.panelModal).setDisplaySize(panelW, panelW * 820 / 900).setDepth(101).setAlpha(0.97);
    const title = this.add.text(width / 2, height * 0.33, 'PAUSED', { fontFamily: 'Arial Black, Arial', fontSize: '96px', color: '#fff', stroke: '#000', strokeThickness: 14 }).setOrigin(0.5).setDepth(102);
    const resume = makeImageTextButton(this, width / 2, height * 0.50, 'RESUME', ASSET_KEYS.ui.buttonResume, () => {
      this.scene.stop();
      this.scene.resume(SCENES.GAME);
      AudioManager.resumeMusic();
    }, 520, 123, '58px');
    const home = makeImageTextButton(this, width / 2, height * 0.63, 'HOME', ASSET_KEYS.ui.buttonHome, () => {
      AudioManager.stopMusic();
      this.scene.stop(SCENES.GAME);
      this.scene.start(SCENES.HOME);
    }, 520, 123, '58px');
    for (const btn of [resume, home]) for (const p of btn.pieces) p.setDepth(p.depth + 72);
    publishLayoutBounds(this, [
      { id: 'pause-panel', object: panel, allowOverlap: true },
      { id: 'pause-title', object: title },
      { id: 'pause-resume-button', object: resume.bg },
      { id: 'pause-home-button', object: home.bg },
    ]);
  }
}
