import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { fontPx, strokePx, su } from '../utils/scale.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }
  create() {
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    { const bg = this.add.image(width / 2, height / 2, 'bg_0').setDepth(-10); bg.setScale(Math.max(width / bg.width, height / bg.height)); }
    this.add.image(width / 2, height * 0.38, ASSET_KEYS.player).setDisplaySize(su(130), su(130));
    this.titleText = this.add.text(width / 2, height * 0.18, SPEC.game.title, { fontFamily: 'Arial Black, Arial', fontSize: fontPx(38), color: '#fff', align: 'center', stroke: '#000', strokeThickness: strokePx(6) }).setOrigin(0.5);
    this.bestText = this.add.text(width / 2, height * 0.55, 'BEST ' + SaveData.getBest(), { fontFamily: 'Arial Black, Arial', fontSize: fontPx(22), color: '#ffd54a', stroke: '#000', strokeThickness: strokePx(4) }).setOrigin(0.5);
    this.playBtn = makeTextButton(this, width / 2, height * 0.68, 'PLAY', () => { AudioManager.unlock(this); AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.55); this.scene.start(SCENES.GAME); }, 220, 64);
    this.soundBtn = makeTextButton(this, width / 2, height * 0.78, AudioManager.mute ? 'SOUND OFF' : 'SOUND ON', () => { AudioManager.setMute(this, !AudioManager.mute); this.scene.restart(); }, 220, 52);
    this._homeLayout = [{ id: 'title', obj: this.titleText }, { id: 'best', obj: this.bestText }, { id: 'play', obj: this.playBtn.bg }, { id: 'sound', obj: this.soundBtn.bg }];
    const pub = () => publishLayout(this, this._homeLayout);
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
