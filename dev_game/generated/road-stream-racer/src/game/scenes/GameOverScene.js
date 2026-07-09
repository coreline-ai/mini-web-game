import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { SaveData } from '../systems/SaveData.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { fontPx, strokePx } from '../utils/scale.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAMEOVER); }
  create(data = {}) {
    const { width, height } = SPEC.canvas;
    const score = data.score || 0;
    const isBest = SaveData.record(score);
    this.add.image(width / 2, height / 2, ASSET_KEYS.stage3).setDisplaySize(width, height);
    this.add.rectangle(0, 0, width, height, 0x07111d, 0.48).setOrigin(0);
    this.add.image(width / 2, height * 0.25, ASSET_KEYS.fxHit).setDisplaySize(360, 360).setAlpha(0.78);
    this.goText = this.add.text(width / 2, height * 0.2, '결과', { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: fontPx(92), color: '#ffdedc', stroke: '#07111d', strokeThickness: strokePx(14) }).setOrigin(0.5);
    this.goScoreText = this.add.text(width / 2, height * 0.37, '점수 ' + score, { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: fontPx(64), color: '#fff', stroke: '#07111d', strokeThickness: strokePx(10) }).setOrigin(0.5);
    this.bestText = this.add.text(width / 2, height * 0.45, '최고 점수 ' + SaveData.getBest(), { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: fontPx(42), color: '#ffd54a', stroke: '#07111d', strokeThickness: strokePx(7) }).setOrigin(0.5);
    this.detailText = this.add.text(width / 2, height * 0.53, `코인 ${data.coins || 0}  ·  니어미스 ${data.nearMisses || 0}`, { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: fontPx(34), color: '#b9d7ff', stroke: '#07111d', strokeThickness: strokePx(5) }).setOrigin(0.5);
    if (isBest) this.add.text(width / 2, height * 0.59, '신기록!', { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: fontPx(42), color: '#39e98a', stroke: '#07111d', strokeThickness: strokePx(7) }).setOrigin(0.5);
    this.retryBtn = makeTextButton(this, width / 2, height * 0.72, '다시 달리기', () => this.scene.start(SCENES.COUNTDOWN), 570, 190);
    this.homeBtn = makeTextButton(this, width / 2, height * 0.84, '처음으로', () => this.scene.start(SCENES.HOME), 480, 160);
    this._goLayout = [{ id: 'gameover', obj: this.goText }, { id: 'score', obj: this.goScoreText }, { id: 'retry', obj: this.retryBtn.bg }, { id: 'home', obj: this.homeBtn.bg }];
    const pub = () => publishLayout(this, this._goLayout);
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
