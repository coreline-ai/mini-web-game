import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from '../systems/AudioManager.js';
import ScoreManager from '../systems/ScoreManager.js';
import ConveyorSystem from '../systems/ConveyorSystem.js';
import SortingSystem from '../systems/SortingSystem.js';
import HudUI from '../ui/HudUI.js';
import { publishLayoutBounds } from '../systems/LayoutBounds.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  create() {
    this.isOver = false;
    this.wasRushActive = false;
    this.score = new ScoreManager();
    this.conveyor = new ConveyorSystem(this);
    this.sorting = new SortingSystem(this, this.conveyor, this.score);
    this.hud = new HudUI(this, () => this.openPause());
    this.feedbackText = this.add.text(SPEC.canvas.width / 2, SPEC.canvas.height * 0.38, '', { fontFamily: 'Arial Black, Arial', fontSize: '64px', color: '#38e88b', stroke: '#000', strokeThickness: 10 }).setOrigin(0.5).setDepth(120).setVisible(false);
    this.rushText = this.add.text(SPEC.canvas.width / 2, SPEC.canvas.height * 0.28, '⚠ 물량 폭주 ⚠', { fontFamily: 'Arial Black, Arial', fontSize: '74px', color: '#ffd35a', stroke: '#b32219', strokeThickness: 10 }).setOrigin(0.5).setDepth(118).setVisible(false);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.events.on('parcel-correct', this.onCorrect, this);
    this.events.on('parcel-wrong', this.onWrong, this);
    this.events.on('parcel-miss', this.onMiss, this);

    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };
    if (SPEC.performance.pauseWhenHidden) document.addEventListener('visibilitychange', this.visibilityHandler);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    AudioManager.playGameplayMusic(this);
    this.publishLayout();
    this.updateDebugState();
  }

  onPointerDown(pointer) {
    if (this.isOver || pointer.y < 200) return;
    this.sorting.pointerDown(pointer);
  }

  onPointerMove(pointer) {
    if (this.isOver) return;
    this.sorting.pointerMove(pointer);
  }

  onPointerUp(pointer) {
    if (this.isOver) return;
    this.sorting.pointerUp(pointer);
    this.checkGameOver();
  }

  update(_time, delta) {
    if (this.isOver) return;
    this.score.update(delta);
    const elapsedSec = this.score.elapsedMs / 1000;
    const params = this.sorting.update(delta, elapsedSec);
    this.rushText.setVisible(params.rushActive);
    if (params.rushActive && !this.wasRushActive) AudioManager.playSfx(this, ASSET_KEYS.sfxRush, 0.5);
    this.wasRushActive = params.rushActive;
    if (params.rushActive) this.rushText.setScale(1 + Math.sin(this.time.now / 85) * 0.045);
    this.hud.update({ score: this.score.getScore(), combo: this.score.combo, bestCombo: this.score.bestCombo, lives: this.score.lives, sorted: this.score.sorted, missed: this.score.missed, stage: params.stage, rush: params.rushActive });
    this.checkGameOver();
    this.publishLayout();
    this.updateDebugState(params);
  }

  onCorrect(event) {
    AudioManager.playSfx(this, ASSET_KEYS.sfxCollect, 0.55);
    const msg = this.score.combo > 0 && this.score.combo % 10 === 0 ? 'PERFECT SORT!' : `+${event.value} SORTED`;
    this.showFeedback(msg, '#38e88b');
  }

  onWrong() {
    AudioManager.playSfx(this, ASSET_KEYS.sfxHit, 0.55);
    this.cameras.main.shake(150, 0.008);
    this.showFeedback('WRONG CHUTE!', '#ff6172');
  }

  onMiss() {
    AudioManager.playSfx(this, ASSET_KEYS.sfxMiss, 0.5);
    this.cameras.main.shake(120, 0.006);
    this.showFeedback('MISSED!', '#ffb84a');
  }

  showFeedback(text, color) {
    this.feedbackText.setText(text).setColor(color).setVisible(true).setAlpha(1).setScale(1);
    this.tweens.killTweensOf(this.feedbackText);
    this.tweens.add({ targets: this.feedbackText, alpha: 0, scale: 1.12, y: SPEC.canvas.height * 0.34, duration: 520, ease: 'Cubic.easeOut', onComplete: () => { this.feedbackText.setVisible(false); this.feedbackText.y = SPEC.canvas.height * 0.38; } });
  }

  checkGameOver() {
    if (!this.isOver && this.score.lives <= 0) this.gameOver();
  }

  gameOver() {
    this.isOver = true;
    AudioManager.playSfx(this, ASSET_KEYS.sfxGameOver, 0.55);
    AudioManager.stopMusic();
    this.scene.start(SCENES.GAMEOVER, { score: this.score.getScore(), sorted: this.score.sorted, wrong: this.score.wrong, missed: this.score.missed, bestCombo: this.score.bestCombo });
  }

  openPause() {
    if (this.isOver || this.scene.isPaused()) return;
    AudioManager.pauseMusic();
    this.hud.setVisible(false);
    this.scene.launch(SCENES.PAUSE);
    this.scene.pause();
  }

  onResume() {
    if (!this.isOver) { this.hud.setVisible(true); AudioManager.resumeMusic(); }
  }

  publishLayout() {
    publishLayoutBounds(this, [
      ...this.hud.getLayoutItems(),
      ...this.conveyor.getLayoutItems(),
    ], {
      requiredIds: [
        'game-hud-left-panel',
        'game-hud-right-panel',
        'game-pause-button',
        'game-hud-score-text',
        'game-hud-life-text',
        'game-hud-sort-miss-text',
        'game-belt',
        'game-floor-panel',
        'game-scanner',
        'game-miss-line',
        'game-bin-hit-zone-north',
        'game-bin-label-north',
      ],
    });
  }

  updateDebugState(params = null) {
    window.__PARCEL_SORT_RUSH__ = {
      scene: 'Game',
      params,
      sorting: this.sorting?.getDebugState(),
      bins: this.conveyor ? this.conveyor.constructor.name && SPEC.sorting.bins : [],
      getBinCenter: (id) => this.conveyor?.getBinCenter(id),
    };
  }

  cleanup() {
    this.input.off('pointerdown', this.onPointerDown, this);
    this.input.off('pointermove', this.onPointerMove, this);
    this.input.off('pointerup', this.onPointerUp, this);
    this.events.off('parcel-correct', this.onCorrect, this);
    this.events.off('parcel-wrong', this.onWrong, this);
    this.events.off('parcel-miss', this.onMiss, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.sorting) this.sorting.destroy();
  }
}
