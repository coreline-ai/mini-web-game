import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { SaveData } from '../systems/SaveData.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { U, BUTTON } from '../constants/tuning.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAMEOVER); }
  create(data = {}) {
    const { width, height } = SPEC.canvas;
    const score = data.score || 0;
    const isBest = SaveData.record(score);
    this.add.rectangle(0, 0, width, height, 0x070814).setOrigin(0);
    this.goText = this.add.text(width / 2, height * 0.22, 'GAME OVER', { fontFamily: 'Arial Black, Arial', fontSize: 40 * U + 'px', color: '#ff6666', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.goScoreText = this.add.text(width / 2, height * 0.38, 'SCORE ' + score, { fontFamily: 'Arial Black, Arial', fontSize: 28 * U + 'px', color: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    // Bowls served is the run's real story — score alone hides whether you cooked well or
    // just survived a few slow customers.
    this.servedText = this.add.text(width / 2, height * 0.45, '서빙한 그릇 ' + (data.coins || 0), { fontFamily: 'Arial Black, Arial', fontSize: 20 * U + 'px', color: '#ffb347', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.515, 'BEST ' + SaveData.getBest(), { fontFamily: 'Arial Black, Arial', fontSize: 22 * U + 'px', color: '#ffd54a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    if (isBest) this.add.text(width / 2, height * 0.575, 'NEW BEST!', { fontFamily: 'Arial Black, Arial', fontSize: 22 * U + 'px', color: '#39e98a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    this.retryBtn = makeTextButton(this, width / 2, height * 0.66, 'RETRY', () => this.scene.start(SCENES.GAME), BUTTON.primary);
    this.homeBtn = makeTextButton(this, width / 2, height * 0.76, 'HOME', () => this.scene.start(SCENES.HOME), BUTTON.secondary);
    this._goLayout = [{ id: 'gameover', obj: this.goText }, { id: 'score', obj: this.goScoreText }, { id: 'served', obj: this.servedText }, { id: 'retry', obj: this.retryBtn.bg }, { id: 'home', obj: this.homeBtn.bg }];
    const pub = () => publishLayout(this, this._goLayout);
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
