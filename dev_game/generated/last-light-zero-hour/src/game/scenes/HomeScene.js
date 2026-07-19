import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout } from '../systems/LayoutRegistry.js';

export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }
  create() {
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    this.add.image(width / 2, height / 2, 'bg_0').setDisplaySize(width, height);
    this.add.rectangle(0, 0, width, height, 0x02080b, 0.46).setOrigin(0);
    this.add.rectangle(42, 62, width - 84, height - 124, 0x061014, 0.36).setOrigin(0).setStrokeStyle(3, 0xe5b966, 0.24);

    this.kicker = this.add.text(width / 2, 142, '2041 · HELIOS LAST DEFENSE', { fontFamily: 'Arial Black, Arial', fontSize: '31px', color: '#8fd2c7', letterSpacing: 6 }).setOrigin(0.5);
    this.titleText = this.add.text(width / 2, 246, 'LAST LIGHT', { fontFamily: 'Arial Black, Arial', fontSize: '116px', color: '#f1e4c7', stroke: '#020708', strokeThickness: 15, letterSpacing: 4 }).setOrigin(0.5);
    this.subTitle = this.add.text(width / 2, 344, '제로 아워', { fontFamily: 'Arial Black, Arial', fontSize: '58px', color: '#e5b966', stroke: '#020708', strokeThickness: 10 }).setOrigin(0.5);

    this.hero = this.add.image(width / 2, 765, ASSET_KEYS.playerPreview).setDisplaySize(610, 610).setDepth(3);
    this.weapon = this.add.image(width / 2 + 46, 735, ASSET_KEYS.weapons, 0).setDisplaySize(150, 225).setDepth(4).setAngle(3);
    this.add.circle(width / 2, 820, 300, 0xe5b966, 0.055).setDepth(1);

    this.story = this.add.text(width / 2, 1120,
      '감염 도시의 마지막 정화 장치가 켜졌다.\n빛이 강해질수록 더 많은 감염체가 몰려온다.\n기관포의 열을 관리하고 충전 무기를 교대해 코어를 지켜라.',
      { fontFamily: 'Arial, sans-serif', fontSize: '38px', color: '#edf3ed', align: 'center', lineSpacing: 18, wordWrap: { width: width - 190 } }).setOrigin(0.5);

    const progress = SaveData.getProgress();
    this.record = this.add.text(width / 2, 1390, `최고 기록 ${SaveData.getBest()}  ·  보유 결정 ${progress.cores}  ·  누적 처치 ${progress.totalKills}`, { fontFamily: 'Arial Black, Arial', fontSize: '31px', color: '#9be8d7' }).setOrigin(0.5);
    this.playBtn = makeTextButton(this, width / 2, 1635, '방어 개시', () => {
      AudioManager.unlock(this); AudioManager.playSfx(this, ASSET_KEYS.sfxStart, 0.6); this.scene.start(SCENES.BATTLE_LOADING, { destination: SCENES.GAME });
    }, 760, 150, { oneShot: true });
    this.arsenalBtn = makeTextButton(this, width / 2, 1835, '무기고 · 영구 강화', () => this.scene.start(SCENES.BATTLE_LOADING, { destination: SCENES.ARSENAL }), 760, 132, { oneShot: true });
    this.soundBtn = makeTextButton(this, width / 2, 2012, AudioManager.mute ? '사운드 꺼짐' : '사운드 켜짐', () => {
      AudioManager.setMute(this, !AudioManager.mute); this.scene.restart();
    }, 540, 112, { oneShot: true });
    this.help = this.add.text(width / 2, 2245, '손을 떼면 자동 조준 · 하단을 드래그하면 이동과 수동 조준\n충전된 무기 카드를 눌러 즉시 교체', { fontFamily: 'Arial', fontSize: '31px', color: '#c3d7d2', align: 'center', lineSpacing: 12 }).setOrigin(0.5);

    this._homeLayout = [
      { id: 'title', obj: this.titleText }, { id: 'story', obj: this.story }, { id: 'record', obj: this.record },
      { id: 'play', obj: this.playBtn.bg }, { id: 'arsenal', obj: this.arsenalBtn.bg }, { id: 'sound', obj: this.soundBtn.bg }, { id: 'help', obj: this.help },
    ];
    const pub = () => publishLayout(this, this._homeLayout, { requiredIds: this._homeLayout.map((e) => e.id) });
    pub(); this.time.delayedCall(80, pub); this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }
}
