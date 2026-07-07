import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { makeTextButton } from '../ui/MobileButton.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAMEOVER); }
  create(data = {}) {
    const { width, height } = SPEC.canvas;
    const score = data.score || 0;
    const isBest = SaveData.record(score);
    const cleared = Boolean(data.cleared);
    const bg = this.add.image(width / 2, height / 2, 'bg_2').setDepth(-10);
    bg.setScale(Math.max(width / bg.width, height / bg.height));
    this.panel = this.add.rectangle(width / 2, height * 0.42, width * 0.82, 300, 0x07121d, 0.78).setStrokeStyle(3, 0x57d8ff, 0.9);
    this.goText = this.add.text(width / 2, height * 0.22, cleared ? 'ALL CLEAR' : 'ROUND OVER', { fontFamily: 'Arial Black, Arial', fontSize: '36px', color: cleared ? '#39e98a' : '#ff6666', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.goScoreText = this.add.text(width / 2, height * 0.34, 'SCORE ' + score, { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#fff', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    this.bestText = this.add.text(width / 2, height * 0.41, `${cleared ? 'CLEAR' : 'BEST'} ${cleared ? 'STAGE ' + (data.stage || 1) : SaveData.getBest()}`, { fontFamily: 'Arial Black, Arial', fontSize: '21px', color: '#ffd54a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    const accuracy = data.shots ? Math.round((data.hits / data.shots) * 100) : 0;
    this.statsText = this.add.text(width / 2, height * 0.49, `HITS ${data.hits || 0}/${data.shots || 0}  ACC ${accuracy}%  BEST x${data.bestCombo || 0}`, { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#a8f3ff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
    this.resultIcon = this.add.image(width / 2, height * 0.56, ASSET_KEYS.collectible).setDisplaySize(72, 72);
    if (isBest) this.add.text(width / 2, height * 0.63, 'NEW BEST!', { fontFamily: 'Arial Black, Arial', fontSize: '19px', color: '#39e98a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    this.retryBtn = makeTextButton(this, width / 2, height * 0.71, 'RETRY', () => this.scene.start(SCENES.GAME), 230, 62);
    this.homeBtn = makeTextButton(this, width / 2, height * 0.81, 'HOME', () => this.scene.start(SCENES.HOME), 230, 62);
    this._goLayout = [{ id: 'gameover-panel', obj: this.panel, allowOverlap: true }, { id: 'gameover-title', obj: this.goText }, { id: 'gameover-score', obj: this.goScoreText }, { id: 'gameover-best', obj: this.bestText }, { id: 'gameover-stats', obj: this.statsText }, { id: 'gameover-result-icon', obj: this.resultIcon }, { id: 'retry-button', obj: this.retryBtn.bg }, { id: 'home-button', obj: this.homeBtn.bg }];
    const pub = () => publishLayout(this, this._goLayout, { requiredIds: ['gameover-panel', 'gameover-title', 'gameover-score', 'gameover-result-icon', 'retry-button', 'home-button'] });
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
