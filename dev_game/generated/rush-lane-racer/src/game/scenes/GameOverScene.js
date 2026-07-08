import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import RoadRenderer from '../systems/RoadRenderer.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout, objectBounds } from '../systems/LayoutRegistry.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAMEOVER); }
  create(data = {}) {
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    const score = data.score || 0;
    const isBest = SaveData.record(score);
    this.road = new RoadRenderer(this, false);
    this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.48).setOrigin(0).setDepth(10);
    this.panel = this.add.rectangle(width / 2, height * 0.50, width * 0.76, height * 0.60, 0x07111e, 0.88).setStrokeStyle(7, 0xff4f66, 0.86).setDepth(11);
    this.title = this.add.text(width / 2, height * 0.21, 'GAME OVER', { fontFamily: 'Arial Black, Arial', fontSize: '98px', color: '#ff4f66', stroke: '#000', strokeThickness: 14 }).setOrigin(0.5).setDepth(12);
    this.stamp = this.add.image(width / 2, height * 0.30, ASSET_KEYS.fxResultStampFail).setDisplaySize(132, 132).setDepth(12);
    this.scoreText = this.add.text(width / 2, height * 0.39, 'SCORE ' + score, { fontFamily: 'Arial Black, Arial', fontSize: '58px', color: '#fff', stroke: '#000', strokeThickness: 9 }).setOrigin(0.5).setDepth(12);
    this.bestText = this.add.text(width / 2, height * 0.47, 'BEST ' + SaveData.getBest(), { fontFamily: 'Arial Black, Arial', fontSize: '44px', color: '#ffdf4a', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(12);
    this.statsText = this.add.text(width / 2, height * 0.535, `COINS ${data.coins || 0}   DODGE ${data.avoided || 0}   NEAR ${data.nearMisses || 0}`, { fontFamily: 'Arial Black, Arial', fontSize: '32px', color: '#bdeeff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(12);
    this.bestBadge = isBest ? this.add.text(width / 2, height * 0.595, 'NEW BEST!', { fontFamily: 'Arial Black, Arial', fontSize: '46px', color: '#39e98a', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(12) : null;
    this.retryButton = makeTextButton(this, width / 2, height * 0.71, 'RETRY', () => this.scene.start(SCENES.GAME), 520, 118, 0x24cc58, '58px');
    this.homeButton = makeTextButton(this, width / 2, height * 0.83, 'HOME', () => this.scene.start(SCENES.HOME), 520, 118, 0x187bd9, '58px');
    this.publishLayout();
  }
  publishLayout() {
    publishLayout(this, 'GameOver', [
      objectBounds(this, this.panel, 'gameover-panel', { allowOverlap: true }),
      objectBounds(this, this.title, 'gameover-title'),
      objectBounds(this, this.stamp, 'result-stamp-fail'),
      objectBounds(this, this.scoreText, 'gameover-score'),
      objectBounds(this, this.bestText, 'gameover-best'),
      objectBounds(this, this.statsText, 'gameover-stats'),
      objectBounds(this, this.bestBadge, 'new-best', { visible: Boolean(this.bestBadge) }),
      objectBounds(this, this.retryButton.bg, 'retry-button', { allowStretch: true }),
      objectBounds(this, this.homeButton.bg, 'home-button', { allowStretch: true }),
    ], ['gameover-title', 'result-stamp-fail', 'gameover-score', 'retry-button', 'home-button']);
  }
  update(_time, delta) { this.road?.update(delta, 620, false, false, 1); this.publishLayout(); }
}
