import Phaser from 'phaser';
import { SCENES } from '../data/spec.js';
import { AudioManager } from '../systems/AudioManager.js';
import DomSceneUI from '../ui/DomSceneUI.js';
import { openHelpOverlay } from '../ui/HelpOverlay.js';

export default class PauseScene extends Phaser.Scene {
  constructor() { super(SCENES.PAUSE); }
  create() {
    this.domUi = new DomSceneUI(this, 'Pause', 'mp-pause-ui', `
      <div class="mp-modal-backdrop"></div>
      <section class="mp-modal-card mp-pause-card" data-layout-id="pause-panel">
        <h2 data-layout-id="paused">일시정지</h2>
        <button class="mp-menu-button mp-pause-resume" data-layout-id="resume" type="button">계속하기</button>
        <button class="mp-menu-button mp-pause-help" data-layout-id="pause-help" type="button">? 도움말</button>
        <button class="mp-menu-button mp-pause-home" data-layout-id="home" type="button">홈으로</button>
      </section>
    `);
    this.domUi.on('.mp-pause-resume', () => {
      this.scene.stop();
      this.scene.resume(SCENES.GAME);
      AudioManager.resumeMusic();
    });
    this.domUi.on('.mp-pause-help', (_event, button) => {
      openHelpOverlay(this.domUi);
      button.disabled = false;
    });
    this.domUi.on('.mp-pause-home', () => {
      AudioManager.stopMusic();
      this.scene.stop(SCENES.GAME);
      this.scene.start(SCENES.HOME);
    });
  }
}
