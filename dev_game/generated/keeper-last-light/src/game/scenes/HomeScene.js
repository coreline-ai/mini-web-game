import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayoutStable } from '../systems/LayoutRegistry.js';
import { px, font, PALETTE } from '../config/theme.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveData } from '../systems/SaveData.js';
import { KEEPER_RULES } from '../config/keeperConfig.js';
import { SIGNAL_CODES } from '../config/keeperConfig.js';
import { renderCode } from '../systems/SignalCodec.js';

// 첫 플레이 이해도(목표·승리·패배·첫 행동·진행 지표)를 홈 화면에서 전부 선언한다.
// 이 다섯 가지가 없으면 first-play-clarity-qa가 실패한다 — 그리고 실제로 처음 보는
// 플레이어가 무엇을 눌러야 하는지 모른다.
export default class HomeScene extends Phaser.Scene {
  constructor() { super(SCENES.HOME); }

  create() {
    const { width, height } = SPEC.canvas;
    if (this.textures.exists('bg_0')) {
      this.add.image(width / 2, height / 2, 'bg_0').setDisplaySize(width, height).setDepth(-10);
      this.add.rectangle(0, 0, width, height, 0x04101d, 0.45).setOrigin(0).setDepth(-9);
    }

    this.title = this.add.text(width / 2, height * 0.16, SPEC.game.title, {
      fontFamily: 'Arial Black,Arial', fontSize: font(30), color: PALETTE.text,
      align: 'center', wordWrap: { width: width - px(50) },
    }).setOrigin(0.5);

    this.subtitle = this.add.text(width / 2, height * 0.225, '등대지기: 마지막 항로', {
      fontFamily: 'Arial', fontSize: font(16), color: '#ffcf6b',
    }).setOrigin(0.5);

    const stages = KEEPER_RULES.stages.length;
    this.goal = this.add.text(width / 2, height * 0.335,
      [
        '목표  ·  여명까지 배를 안전하게 인도한다',
        `승리  ·  스테이지 ${stages}(여명) 통과`,
        `패배  ·  난파 ${KEEPER_RULES.wreckAllowance}회`,
        '첫 행동  ·  램프를 짧게/길게 눌러 코드 전송',
        '진행 지표  ·  스테이지 / 인도한 배 / 남은 난파 허용',
      ].join('\n'), {
        fontFamily: 'Arial', fontSize: font(15), color: PALETTE.text,
        align: 'center', lineSpacing: px(7), wordWrap: { width: width - px(60) },
      }).setOrigin(0.5);

    // 코드표를 홈에서도 보여 준다 — 첫 플레이에서 "무엇을 눌러야 하는지"의 답이다.
    const codeLines = Object.values(SIGNAL_CODES)
      .map((r) => `${r.glyph}  ${r.label}   ${renderCode(r.code)}`).join('\n');
    this.codes = this.add.text(width / 2, height * 0.505, codeLines, {
      fontFamily: 'Arial', fontSize: font(14), color: '#ffd98d',
      align: 'center', lineSpacing: px(6),
    }).setOrigin(0.5);

    this.play = makeTextButton(this, width / 2, height * 0.665, 'PLAY',
      () => this.scene.start(SCENES.GAME), { variant: 'primary', oneShot: true });

    const settings = SaveData.getSettings();
    AudioManager.setMuted(settings.mute);
    // 홈 BGM. playMusic이 같은 키를 재생 중이면 재생성하지 않으므로 홈을 오갈 때마다
    // 인스턴스가 늘지 않는다(결함 클래스 H).
    // 지연 로드된 BGM은 아직 없을 수 있다 — 도착하면 재생한다.
    if (this.cache.audio.exists('bgm-home')) AudioManager.playMusic(this, 'bgm-home');
    else this.load.once('complete', () => { if (this.scene.isActive()) AudioManager.playMusic(this, 'bgm-home'); });
    this.soundBtn = makeTextButton(this, width / 2, height * 0.745,
      settings.mute ? 'SOUND OFF' : 'SOUND ON', () => {
        const next = !SaveData.getSettings().mute;
        SaveData.setSettings({ mute: next });
        AudioManager.setMuted(next);
        this.soundBtn.setLabel(next ? 'SOUND OFF' : 'SOUND ON');
      }, { variant: 'secondary' });

    this.best = this.add.text(width / 2, height * 0.82,
      `최고 점수  ${SaveData.getSettings().best || 0}`, {
        fontFamily: 'Arial', fontSize: font(15), color: PALETTE.textDim,
      }).setOrigin(0.5);

    publishLayoutStable(this, [
      { id: 'home-title', obj: this.title },
      { id: 'home-goal', obj: this.goal },
      { id: 'home-codes', obj: this.codes },
      { id: 'play', obj: this.play.bg },
      { id: 'sound', obj: this.soundBtn.bg },
      { id: 'best', obj: this.best },
    ], { requiredIds: ['home-title', 'home-goal', 'play'] });
  }
}
