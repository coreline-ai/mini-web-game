import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { SaveData } from '../systems/SaveData.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { fontPx, strokePx } from '../utils/scale.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAMEOVER); }
  create(data = {}) {
    const { width, height } = SPEC.canvas;
    const score = data.score || 0;
    const isBest = SaveData.record(score);
    this.add.rectangle(0, 0, width, height, 0x070814).setOrigin(0);
    this.goText = this.add.text(width / 2, height * 0.22, 'GAME OVER', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(40), color: '#ff6666', stroke: '#000', strokeThickness: strokePx(6) }).setOrigin(0.5);
    this.goScoreText = this.add.text(width / 2, height * 0.38, 'SCORE ' + score, { fontFamily: 'Arial Black, Arial', fontSize: fontPx(28), color: '#fff', stroke: '#000', strokeThickness: strokePx(5) }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.45, 'BEST ' + SaveData.getBest(), { fontFamily: 'Arial Black, Arial', fontSize: fontPx(22), color: '#ffd54a', stroke: '#000', strokeThickness: strokePx(4) }).setOrigin(0.5);
    if (isBest) this.add.text(width / 2, height * 0.52, 'NEW BEST!', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(22), color: '#39e98a', stroke: '#000', strokeThickness: strokePx(4) }).setOrigin(0.5);
    this.retryBtn = makeTextButton(this, width / 2, height * 0.66, 'RETRY', () => this.scene.start(SCENES.GAME), 230, 62);
    this.homeBtn = makeTextButton(this, width / 2, height * 0.76, 'HOME', () => this.scene.start(SCENES.HOME), 230, 62);
    this._goLayout = [{ id: 'gameover', obj: this.goText }, { id: 'score', obj: this.goScoreText }, { id: 'retry', obj: this.retryBtn.bg }, { id: 'home', obj: this.homeBtn.bg }];
    const pub = () => publishLayout(this, this._goLayout);
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
