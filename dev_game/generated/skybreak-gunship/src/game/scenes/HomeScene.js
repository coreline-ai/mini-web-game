import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout } from '../systems/LayoutRegistry.js';
import { configureLogicalScene } from '../systems/LogicalViewport.js';

export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }
  create() {
    configureLogicalScene(this);
    AudioManager.stopMusic();
    AudioManager.playHomeMusic(this);
    const { width, height } = SPEC.canvas;
    this.add.image(width / 2, height / 2, ASSET_KEYS.bgApproach).setDisplaySize(width, height).setTint(0x587080);
    this.add.rectangle(0, 0, width, height, 0x020c14, 0.38).setOrigin(0);
    this.add.rectangle(0, 0, width, 185, 0x03121d, 0.88).setOrigin(0);
    this.titleText = this.add.text(width / 2, 54, 'SKYBREAK', { fontFamily: 'Arial Black, Arial', fontSize: '46px', color: '#ffffff', stroke: '#07131e', strokeThickness: 8 }).setOrigin(0.5);
    this.add.text(width / 2, 102, 'GUNSHIP', { fontFamily: 'Arial Black, Arial', fontSize: '39px', color: '#56dfff', stroke: '#07131e', strokeThickness: 7, letterSpacing: 6 }).setOrigin(0.5);
    this.add.text(width / 2, 146, 'RESCUE FIRE SUPPORT COMMAND', { fontFamily: 'Arial Black, Arial', fontSize: '10px', color: '#a8c9d4', letterSpacing: 2 }).setOrigin(0.5);
    const hero = this.add.image(width / 2, 368, ASSET_KEYS.heroGunship).setDisplaySize(374, 211).setDepth(3);
    this.tweens.add({ targets: hero, y: 360, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // Keep the mission copy vertically balanced at the 390x844 logical size.
    this.add.rectangle(width / 2, 507, 336, 88, 0x03131e, 0.84).setStrokeStyle(1, 0x40dfff, 0.6);
    this.add.text(44, 480, '구조 작전', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial', fontSize: '10px', color: '#66dfff' });
    this.add.text(44, 500, '스카이브리지 작전', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial', fontSize: '17px', color: '#ffffff' });
    this.add.text(44, 527, '90초 작전 · 구조차 보호 · 민간인 금지 · 보스 격추', { fontFamily: 'Apple SD Gothic Neo, Arial', fontSize: '11px', color: '#a8c9d4' });
    this.bestText = this.add.text(width - 42, 486, `BEST\n${String(SaveData.getBest()).padStart(6, '0')}`, { fontFamily: 'Arial Black, Arial', fontSize: '12px', align: 'right', color: '#ffcc64' }).setOrigin(1, 0);
    this.playBtn = makeTextButton(this, width / 2, 625, '게임 시작', () => {
      AudioManager.unlock(this); AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.45);
      const qaDirect = typeof location !== 'undefined' && /qaHoldLoading/.test(location.search || '');
      this.time.delayedCall(32, () => this.scene.start(qaDirect ? SCENES.GAME : SCENES.BRIEFING));
    }, 300, 68);
    this.add.text(width / 2, 669, '첫 플레이는 3단계 실전 훈련으로 시작합니다', { fontFamily: 'Apple SD Gothic Neo, Arial', fontSize: '11px', color: '#d8f7ff' }).setOrigin(0.5);
    this.soundBtn = makeTextButton(this, width / 2, 724, AudioManager.mute ? '사운드 끄기' : '사운드 켜짐', () => { AudioManager.setMute(this, !AudioManager.mute); this.time.delayedCall(32, () => this.scene.restart()); }, 220, 48, 0x6e91a0);
    this.add.text(width / 2, 790, '조준 시스템 준비 완료', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial', fontSize: '10px', color: '#66dfff' }).setOrigin(0.5);
    publishLayout(this, [{ id: 'title', obj: this.titleText }, { id: 'best', obj: this.bestText }, { id: 'play', obj: this.playBtn.bg }, { id: 'sound', obj: this.soundBtn.bg }]);
  }
}
