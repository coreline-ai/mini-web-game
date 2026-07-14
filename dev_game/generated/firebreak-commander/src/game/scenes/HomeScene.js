import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout } from '../systems/LayoutRegistry.js';
import { addCoverImage } from '../ui/BackgroundArt.js';
import { configureLogicalScene } from '../systems/LogicalViewport.js';
import { RULE_TEXT } from '../config/gameRules.js';

export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }
  create() {
    configureLogicalScene(this);
    AudioManager.playHomeMusic(this);
    const { width, height } = SPEC.canvas;
    addCoverImage(this, 'bg_0', -50, 0.62);
    this.add.rectangle(0, 0, width, height, 0x04120d, 0.64).setOrigin(0).setDepth(-40);
    this.missionPanel = this.add.rectangle(width / 2, 365, 342, 244, 0x08241b, 0.95)
      .setStrokeStyle(2, 0x66c9a6, 0.72);
    this.missionTitle = this.add.text(width / 2, 264, '작전 목표', {
      fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '19px', color: '#ffd578',
    }).setOrigin(0.5);
    this.missionCopy = this.add.text(width / 2, 295, '불길을 끊고 · 급한 불을 끄고 · 도로를 방어', {
      fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '12px', color: '#cfe9df',
    }).setOrigin(0.5);
    const actionDefs = [
      { x: 84, key: ASSET_KEYS.dozer, label: '방화선\n확산 차단' },
      { x: 195, key: ASSET_KEYS.helicopter, label: '헬기\n긴급 진압' },
      { x: 306, key: ASSET_KEYS.engine, label: '소방차\n도로 방어' },
    ];
    this.actionCards = [];
    for (const action of actionDefs) {
      const card = this.add.rectangle(action.x, 367, 94, 102, 0x10362a, 0.94).setStrokeStyle(1, 0x5fc4a1, 0.45);
      const icon = this.textures.exists(action.key) ? this.add.image(action.x, 348, action.key).setDisplaySize(62, 48) : null;
      const label = this.add.text(action.x, 404, action.label, {
        fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '12px', color: '#eef9f4', align: 'center', lineSpacing: 2,
      }).setOrigin(0.5);
      this.actionCards.push({ card, icon, label });
    }
    this.winRule = this.add.text(width / 2, 464, '승리  불꽃 0   ·   패배  마을 또는 변전소 0', {
      fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '12px', color: '#ffca82',
    }).setOrigin(0.5);
    this.titleText = this.add.text(width / 2, 104, 'FIREBREAK\nCOMMANDER', { fontFamily: 'Arial Black, Arial', fontSize: '39px', color: '#f4e7c5', align: 'center', stroke: '#07100c', strokeThickness: 8, lineSpacing: -8 }).setOrigin(0.5);
    this.tagline = this.add.text(width / 2, 184, RULE_TEXT.homeTagline, { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '14px', color: '#b8f0dc', align: 'center', lineSpacing: 7 }).setOrigin(0.5);
    this.recordPanel = this.add.rectangle(width / 2, 555, 300, 72, 0x102c22, 0.94).setStrokeStyle(2, 0x66c9a6, 0.55);
    this.bestText = this.add.text(width / 2, 540, `최고 점수  ${SaveData.getBest()}`, { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '19px', color: '#ffd578' }).setOrigin(0.5);
    this.starsText = this.add.text(width / 2, 570, `최고 등급  ${'★'.repeat(SaveData.getBestStars())}${'☆'.repeat(3 - SaveData.getBestStars())}`, { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '17px', color: '#f0bd55' }).setOrigin(0.5);
    this.playBtn = makeTextButton(this, width / 2, 660, '출동 시작', () => {
      AudioManager.unlock(this); AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.55);
      // START always enters the playable scene so automated and returning-player
      // flows are predictable. The dedicated FIELD BRIEFING button remains the
      // explicit tutorial entry point for first-time commanders.
      this.scene.start(SCENES.GAME);
    }, 274, 68, { oneShot: true, fireOn: 'pointerup' });
    this.briefBtn = makeTextButton(this, width / 2, 744, '게임 방법', () => this.scene.start(SCENES.TUTORIAL), 236, 52, { oneShot: true, fireOn: 'pointerup' });
    this.soundBtn = makeTextButton(this, width / 2, 810, AudioManager.mute ? '소리 꺼짐' : '소리 켜짐', () => { AudioManager.setMute(this, !AudioManager.mute); this.scene.restart(); }, 190, 44);
    const layout = [
      { id: 'title', obj: this.titleText }, { id: 'tagline', obj: this.tagline }, { id: 'mission-panel', obj: this.missionPanel }, { id: 'record-panel', obj: this.recordPanel },
      { id: 'best', obj: this.bestText, allowOverlapWith: ['record-panel'] }, { id: 'play', obj: this.playBtn.bg }, { id: 'briefing', obj: this.briefBtn.bg }, { id: 'sound', obj: this.soundBtn.bg },
    ];
    const publish = () => publishLayout(this, layout);
    publish(); this.time.delayedCall(60, publish);
    this.scale.on('resize', publish);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', publish));
  }
}
