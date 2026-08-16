import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayoutStable } from '../systems/LayoutRegistry.js';
import { px, font, PALETTE } from '../config/theme.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveData } from '../systems/SaveData.js';
import { KEEPER_RULES } from '../config/keeperConfig.js';

// 첫 플레이 이해도(목표·승리·패배·첫 행동·진행 지표)를 홈에서 전부 선언한다.
export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }

  create() {
    const { width, height } = SPEC.canvas;
    if (this.textures.exists('bg_0')) {
      this.add.image(width / 2, height / 2, 'bg_0').setDisplaySize(width, height).setDepth(-10);
      this.add.rectangle(0, 0, width, height, 0x07130c, 0.52).setOrigin(0).setDepth(-9);
    }

    this.title = this.add.text(width / 2, height * 0.15, SPEC.game.title, {
      fontFamily: 'Arial Black,Arial', fontSize: font(30), color: PALETTE.text,
      align: 'center', wordWrap: { width: width - px(50) },
    }).setOrigin(0.5);
    this.subtitle = this.add.text(width / 2, height * 0.215, '최후의 1분', {
      fontFamily: 'Arial', fontSize: font(16), color: '#ffe066',
    }).setOrigin(0.5);

    const stages = KEEPER_RULES.stages.length;
    this.goal = this.add.text(width / 2, height * 0.345, [
      '목표  ·  추가시간까지 골문을 지킨다',
      `승리  ·  스테이지 ${stages}(추가시간) 통과`,
      `패배  ·  실점 ${KEEPER_RULES.concedeAllowance}회`,
      '첫 행동  ·  손가락으로 키퍼를 끌어 움직인다',
      '진행 지표  ·  스테이지 / 세이브 / 실점',
    ].join('\n'), {
      fontFamily: 'Arial', fontSize: font(15), color: PALETTE.text,
      align: 'center', lineSpacing: px(7), wordWrap: { width: width - px(60) },
    }).setOrigin(0.5);

    this.tip = this.add.text(width / 2, height * 0.485, [
      '빠르게 튕기면  →  다이빙 (도달 2배)',
      `다이빙 후 ${KEEPER_RULES.control.diveRecoveryMs}ms 동안 움직일 수 없다`,
      '쳐낸 공은 살아 있다 — 탭으로 펀칭',
    ].join('\n'), {
      fontFamily: 'Arial', fontSize: font(14), color: '#ffeaa0',
      align: 'center', lineSpacing: px(6),
    }).setOrigin(0.5);

    this.play = makeTextButton(this, width / 2, height * 0.645, 'PLAY',
      () => this.scene.start(SCENES.GAME), { variant: 'primary', oneShot: true });

    const settings = SaveData.getSettings();
    AudioManager.setMuted(settings.mute);
    if (this.cache.audio.exists('bgm-home')) AudioManager.playMusic(this, 'bgm-home');
    else this.load.once('complete', () => { if (this.scene.isActive()) AudioManager.playMusic(this, 'bgm-home'); });

    this.soundBtn = makeTextButton(this, width / 2, height * 0.725,
      settings.mute ? 'SOUND OFF' : 'SOUND ON', () => {
        const next = !SaveData.getSettings().mute;
        SaveData.setSettings({ mute: next });
        AudioManager.setMuted(next);
        this.soundBtn.setLabel(next ? 'SOUND OFF' : 'SOUND ON');
      }, { variant: 'secondary' });

    this.best = this.add.text(width / 2, height * 0.80, `최고 점수  ${settings.best || 0}`, {
      fontFamily: 'Arial', fontSize: font(15), color: PALETTE.textDim,
    }).setOrigin(0.5);

    publishLayoutStable(this, [
      { id: 'home-title', obj: this.title },
      { id: 'home-goal', obj: this.goal },
      { id: 'home-tip', obj: this.tip },
      { id: 'play', obj: this.play.bg },
      { id: 'sound', obj: this.soundBtn.bg },
      { id: 'best', obj: this.best },
    ], { requiredIds: ['home-title', 'home-goal', 'play'] });
  }
}
