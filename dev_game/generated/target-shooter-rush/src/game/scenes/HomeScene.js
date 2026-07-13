import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { fontPx, strokePx, su } from '../constants/tuning.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton } from '../ui/MobileButton.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }
  create() {
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    const bg = this.add.image(width / 2, height / 2, ASSET_KEYS.bg0).setDepth(-10);
    bg.setScale(Math.max(width / bg.width, height / bg.height));
    this.add.rectangle(0, 0, width, height, 0x07121d, 0.18).setOrigin(0);
    this.demoPlate = this.add.ellipse(width / 2, height * 0.38, su(188), su(188), 0x07121d, 0.7)
      .setStrokeStyle(strokePx(3), 0x57d8ff, 0.82);
    this.demoTarget = this.add.image(width / 2, height * 0.38, ASSET_KEYS.target).setDisplaySize(su(146), su(146));
    this.titleText = this.add.text(width / 2, height * 0.17, SPEC.game.title, { fontFamily: 'Arial Black, Arial', fontSize: fontPx(28), color: '#fff', align: 'center', stroke: '#000', strokeThickness: strokePx(6), wordWrap: { width: width - su(48) } }).setOrigin(0.5);
    this.bestText = this.add.text(width / 2, height * 0.55, 'BEST ' + SaveData.getBest(), { fontFamily: 'Arial Black, Arial', fontSize: fontPx(22), color: '#ffd54a', stroke: '#000', strokeThickness: strokePx(4) }).setOrigin(0.5);
    this.playBtn = makeTextButton(this, width / 2, height * 0.68, 'PLAY', () => { AudioManager.unlock(this); AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.55); this.scene.start(SCENES.GAME); }, su(220), su(64));
    this.soundBtn = makeTextButton(this, width / 2, height * 0.78, AudioManager.mute ? 'SOUND OFF' : 'SOUND ON', () => { AudioManager.setMute(this, !AudioManager.mute); this.scene.restart(); }, su(240), su(52));
    this.tweens.add({ targets: [this.demoTarget, this.demoPlate], x: width * 0.68, yoyo: true, repeat: -1, duration: 1250, ease: 'Sine.easeInOut' });
    this._homeLayout = [{ id: 'home-title', obj: this.titleText }, { id: 'home-demo-plate', obj: this.demoPlate, allowOverlap: true }, { id: 'home-demo-target', obj: this.demoTarget, allowOverlap: true }, { id: 'home-best', obj: this.bestText }, { id: 'play-button', obj: this.playBtn.bg }, { id: 'sound-button', obj: this.soundBtn.bg }];
    const pub = () => publishLayout(this, this._homeLayout, { requiredIds: ['home-title', 'home-demo-target', 'play-button', 'sound-button'] });
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
