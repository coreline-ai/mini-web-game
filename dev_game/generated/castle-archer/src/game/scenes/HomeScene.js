import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton, makeIconButton } from '../ui/MobileButton.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }
  create() {
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    { const bg = this.add.image(width / 2, height / 2, 'bg_0').setDepth(-10); bg.setScale(Math.max(width / bg.width, height / bg.height)); }
    this.add.image(width / 2, height * 0.38, ASSET_KEYS.player).setDisplaySize(130, 130);
    this.titleText = this.add.text(width / 2, height * 0.18, SPEC.game.title, { fontFamily: 'Arial Black, Arial', fontSize: '38px', color: '#fff', align: 'center', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.bestText = this.add.text(width / 2, height * 0.55, 'BEST ' + SaveData.getBest(), { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffd54a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
    this.playBtn = makeTextButton(this, width / 2, height * 0.68, 'PLAY', () => { AudioManager.unlock(this); AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.55); this.scene.start(SCENES.GAME); }, 220, 64);
    const soundKey = AudioManager.mute ? ASSET_KEYS.iconSoundOff : ASSET_KEYS.iconSoundOn;
    this.soundBtn = makeIconButton(this, width / 2 - 44, height * 0.80, soundKey, () => { AudioManager.setMute(this, !AudioManager.mute); this.scene.restart(); }, 58);
    this.settingsBtn = makeIconButton(this, width / 2 + 44, height * 0.80, ASSET_KEYS.iconSettings, () => {
      AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.35);
      this.toast?.destroy();
      this.toast = this.add.text(width / 2, height * 0.88, 'Drag to aim · Release to shoot', {
        fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffffff', stroke: '#000000', strokeThickness: 4, align: 'center',
      }).setOrigin(0.5).setDepth(30);
      this.tweens.add({ targets: this.toast, alpha: 0, delay: 1200, duration: 450, onComplete: () => this.toast?.destroy() });
    }, 58);
    this._homeLayout = [{ id: 'title', obj: this.titleText }, { id: 'best', obj: this.bestText }, { id: 'play', obj: this.playBtn.bg }, { id: 'sound', obj: this.soundBtn.bg }, { id: 'settings', obj: this.settingsBtn.bg }];
    const pub = () => publishLayout(this, this._homeLayout);
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
