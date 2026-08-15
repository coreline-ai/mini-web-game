import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { U, BUTTON } from '../constants/tuning.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }
  create() {
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    { const bg = this.add.image(width / 2, height / 2, 'bg_0').setDepth(-10); bg.setScale(Math.max(width / bg.width, height / bg.height)); }
    this.add.image(width / 2, height * 0.38, ASSET_KEYS.player).setDisplaySize(130 * U, 130 * U);
    // 38px overflowed the safe margins on 390px-wide phones; wrap keeps it inside on anything narrower too.
    this.titleText = this.add.text(width / 2, height * 0.18, SPEC.game.title, { fontFamily: 'Arial Black, Arial', fontSize: 32 * U + 'px', color: '#fff', align: 'center', stroke: '#000', strokeThickness: 6, wordWrap: { width: width - 80 * U } }).setOrigin(0.5);
    // First-play clarity: the goal and the one rule that matters are on screen before PLAY,
    // because "tap ingredients" alone does not tell you that ORDER is what is being judged.
    this.howText = this.add.text(width / 2, height * 0.505, '주문서를 보고 재료를 순서대로 탭하세요\n손님 3명이 떠나면 종료', {
      fontFamily: 'system-ui, sans-serif', fontSize: 14 * U + 'px', color: '#ffe9c9', align: 'center', lineSpacing: 6 * U,
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    this.bestText = this.add.text(width / 2, height * 0.585, 'BEST ' + SaveData.getBest(), { fontFamily: 'Arial Black, Arial', fontSize: 22 * U + 'px', color: '#ffd54a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    this.playBtn = makeTextButton(this, width / 2, height * 0.68, 'PLAY', () => { AudioManager.unlock(this); AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.55); this.scene.start(SCENES.GAME); }, BUTTON.primary, { oneShot: true });
    this.soundBtn = makeTextButton(this, width / 2, height * 0.78, AudioManager.mute ? 'SOUND OFF' : 'SOUND ON', () => { AudioManager.setMute(this, !AudioManager.mute); this.scene.restart(); }, BUTTON.secondary, { oneShot: true });
    this._homeLayout = [{ id: 'title', obj: this.titleText }, { id: 'how-to', obj: this.howText }, { id: 'best', obj: this.bestText }, { id: 'play', obj: this.playBtn.bg }, { id: 'sound', obj: this.soundBtn.bg }];
    const pub = () => publishLayout(this, this._homeLayout);
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
