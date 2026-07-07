import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from '../systems/AudioManager.js';
import { clearLayout } from '../systems/LayoutRegistry.js';
import StageManager from '../systems/StageManager.js';
import MarketEngine from '../systems/MarketEngine.js';
import DomGameUI from '../ui/DomGameUI.js';
import { stageLabel } from '../config/marketConfig.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  create() {
    this.isOver = false;
    this.engine = new MarketEngine();
    this.stage = new StageManager(this);
    this.domUi = new DomGameUI(this, {
      onPause: () => this.openPause(),
      onSelectTicker: (tickerId) => {
        const changed = this.engine.setSelectedTicker(tickerId);
        if (!changed) {
          this.domUi.setDecisionLockedMessage();
          this.render();
          return;
        }
        AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.25);
        this.render();
      },
      onAction: (action) => this.applyAction(action),
    });
    this.lastStageIndex = this.engine.stageIndex;
    this.lastEventId = this.engine.currentEvent?.id;

    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };
    if (SPEC.performance.pauseWhenHidden) document.addEventListener('visibilitychange', this.visibilityHandler);
    AudioManager.playGameplayMusic(this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.render(true);
  }

  applyAction(action) {
    if (this.isOver) return;
    const result = this.engine.applyAction(action);
    if (!result) return;
    if (result.blocked) {
      this.domUi.setDecisionLockedMessage();
      this.render();
      return;
    }
    this.domUi.setActionResult(result);
    AudioManager.playSfx(this, result.bad ? ASSET_KEYS.sfxHit : ASSET_KEYS.sfxCollect, 0.45);
    this.render();
    this.finishIfTerminal();
  }

  update(_time, delta) {
    if (this.isOver) return;
    const previousStage = this.engine.stageIndex;
    const previousEvent = this.engine.currentEvent?.id;
    this.engine.update(delta);
    if (this.engine.stageIndex !== previousStage) {
      this.stage.setLevel(this.engine.stageIndex * 3 + 1);
      this.domUi.setStageMessage(`스테이지 ${this.engine.stageIndex + 1}: ${stageLabel(this.engine.stage)}`);
      AudioManager.playSfx(this, ASSET_KEYS.sfxCollect, 0.5);
    } else if (this.engine.currentEvent?.id !== previousEvent) {
      this.domUi.setDecisionPrompt();
      AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.25);
    }
    this.render();
    this.finishIfTerminal();
  }

  render(force = false) {
    const snap = this.engine.snapshot();
    const eventLeft = Math.max(0, (this.engine.currentEventInterval() - this.engine.eventTimerMs) / 1000);
    this.domUi.update(snap, this.engine.stage, eventLeft);
  }

  finishIfTerminal() {
    const terminal = this.engine.terminal;
    if (!terminal || this.isOver) return;
    this.isOver = true;
    AudioManager.stopMusic();
    if (terminal.type === 'win') AudioManager.playSfx(this, ASSET_KEYS.sfxCollect, 0.7);
    else AudioManager.playSfx(this, ASSET_KEYS.sfxGameOver, 0.55);
    this.time.delayedCall(250, () => {
      this.scene.start(SCENES.GAMEOVER, {
        ...this.engine.snapshot(),
        score: this.engine.score,
        title: terminal.title,
        reason: terminal.reason,
        win: terminal.type === 'win',
      });
    });
  }

  openPause() {
    if (this.isOver || this.scene.isPaused()) return;
    AudioManager.pauseMusic();
    this.domUi.setVisible(false);
    this.scene.launch(SCENES.PAUSE);
    this.scene.pause();
  }

  onResume() {
    if (!this.isOver) this.domUi.setVisible(true);
  }

  cleanup() {
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.domUi?.destroy();
    clearLayout();
  }
}
