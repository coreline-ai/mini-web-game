import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { fontPx, strokePx } from '../utils/scale.js';

import { publishLayout } from '../systems/LayoutRegistry.js';

export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }
  create() {
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    this.add.image(width / 2, height / 2, ASSET_KEYS.roadFlatLoop).setDisplaySize(width, height).setDepth(1);
    this.add.image(width / 2, height / 2, ASSET_KEYS.forestSideOverlay).setDisplaySize(width, height).setDepth(2);
    this.add.rectangle(0, 0, width, height, 0x07111d, 0.34).setOrigin(0).setDepth(3);
    this.playerPreview = this.add.sprite(width / 2, height * 0.55, ASSET_KEYS.player, 0).setDisplaySize(390, 390).setDepth(4);
    if (this.anims.exists('player_drive')) this.playerPreview.play('player_drive');
    this.titleText = this.add.text(width / 2, 440, SPEC.game.title, {
      fontFamily: '"Arial Black", Arial, sans-serif',
      fontSize: fontPx(86),
      color: '#ffffff',
      align: 'center',
      stroke: '#07111d',
      strokeThickness: strokePx(14),
    }).setOrigin(0.5).setDepth(5);
    this.tipText = this.add.text(width / 2, 602, '차선을 바꿔 트래픽을 피하고\n코인과 부스트를 잡으세요', {
      fontFamily: 'Arial, sans-serif',
      fontSize: fontPx(38),
      color: '#e7f6ff',
      align: 'center',
      lineSpacing: 12,
      stroke: '#07111d',
      strokeThickness: strokePx(5),
    }).setOrigin(0.5).setDepth(5);
    this.bestText = this.add.text(width / 2, height * 0.68, '최고 점수 ' + SaveData.getBest(), { fontFamily: '"Arial Black", Arial, sans-serif', fontSize: fontPx(38), color: '#ffd54a', stroke: '#07111d', strokeThickness: strokePx(7) }).setOrigin(0.5).setDepth(5);
    this.playBtn = makeTextButton(this, width / 2, height * 0.77, '플레이', () => { AudioManager.unlock(this); AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.55); this.scene.start(SCENES.COUNTDOWN); }, 540, 180);
    this.soundBtn = makeTextButton(this, width / 2, height * 0.88, AudioManager.mute ? '사운드 끔' : '사운드 켬', () => { AudioManager.setMute(this, !AudioManager.mute); this.scene.restart(); }, 420, 140);
    this.playBtn.bg.setDepth(5); this.playBtn.txt.setDepth(6);
    this.soundBtn.bg.setDepth(5); this.soundBtn.txt.setDepth(6);
    this._homeLayout = [{ id: 'title', obj: this.titleText }, { id: 'tip', obj: this.tipText }, { id: 'best', obj: this.bestText }, { id: 'play', obj: this.playBtn.bg }, { id: 'sound', obj: this.soundBtn.bg }];
    const pub = () => publishLayout(this, this._homeLayout);
    pub();
    this.time.delayedCall(60, pub);
    this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
