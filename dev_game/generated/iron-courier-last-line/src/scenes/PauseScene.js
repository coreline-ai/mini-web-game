import Phaser from 'phaser';
import { COLORS, H, SCENES, W } from '../constants.js';
import { button, label, panel } from '../ui.js';
import { publishLayout } from '../systems/LayoutRegistry.js';
import { Audio } from '../audio.js';
export default class PauseScene extends Phaser.Scene {
  constructor() { super(SCENES.PAUSE); }
  create() {
    const viewW = this.cameras.main.width; const viewH = this.cameras.main.height; const centerX = viewW / 2;
    this.transitioning = false;
    this.input.setTopOnly(true);
    this.pauseOverlay = this.add.rectangle(centerX, viewH / 2, viewW, viewH, 0x02070b, 0.78) // asset-coverage-allow modal-input-mask
      .setDepth(200)
      .setInteractive();
    this.pauseOverlay.on('pointerdown', (_pointer, _x, _y, event) => event.stopPropagation());
    this.pauseOverlay.on('pointerup', (_pointer, _x, _y, event) => event.stopPropagation());
    const compact = (this.scale?.canvasBounds?.width ?? window.innerWidth) < 1100;
    this.pausePanel = panel(this, centerX, 365, 560, 360).setDepth(205);
    const title = label(this, centerX, 245, '작전 일시정지', 44).setDepth(210);
    this.resumeButton = button(this, centerX, compact ? 335 : 350, '계속', () => this.resumeGame(), 240, 66, COLORS.cyan);
    this.retreatButton = button(this, centerX, compact ? 445 : 438, '철수', () => this.retreat(), 240, 60, COLORS.red);
    this.resumeButton.bg.setDepth(220); this.resumeButton.text.setDepth(221);
    this.retreatButton.bg.setDepth(220); this.retreatButton.text.setDepth(221);
    this.escapeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.escapeKey.on('down', this.resumeGame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.escapeKey?.off('down', this.resumeGame, this));
    publishLayout(this, [
      { id: 'pause-overlay', obj: this.pauseOverlay, role: 'modal-backdrop', checkOverlap: false },
      { id: 'pause-panel', obj: this.pausePanel, role: 'panel', checkOverlap: false },
      { id: 'pause-title', obj: title },
      { id: 'pause-resume', obj: this.resumeButton.bg, role: 'button' },
      { id: 'pause-resume-label', obj: this.resumeButton.text, role: 'button-label', checkOverlap: false },
      { id: 'pause-retreat', obj: this.retreatButton.bg, role: 'button' },
      { id: 'pause-retreat-label', obj: this.retreatButton.text, role: 'button-label', checkOverlap: false },
    ]);
  }
  resumeGame() {
    if (this.transitioning) return;
    this.transitioning = true;
    const gameScene = this.scene.get(SCENES.GAME);
    gameScene?.controls?.resetAll?.({ clearQueued: true });
    this.scene.resume(SCENES.GAME);
    gameScene?.applyControlVisibility?.();
    Audio.resumeMusic();
    this.scene.stop();
  }
  retreat() {
    if (this.transitioning) return;
    this.transitioning = true;
    Audio.stopMusic();
    this.scene.stop(SCENES.GAME);
    this.scene.start(SCENES.HOME);
  }
}
