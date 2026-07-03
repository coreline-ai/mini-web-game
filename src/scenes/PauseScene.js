import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import { FONT_HEAVY, imageTextButton, panel } from '../ui/UiKit.js';

// GameScene 위 오버레이 일시정지.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PAUSE);
  }

  create(data) {
    this.gameKey = data?.gameKey ?? SCENES.GAME;
    this.add.rectangle(0, 0, GC.WIDTH, GC.HEIGHT, 0x000000, 0.72).setOrigin(0, 0);
    panel(this, GC.WIDTH / 2, GC.HEIGHT * 0.55, 720, 880, { alpha: 0.76, depth: 1 });
    this.add.text(GC.WIDTH / 2, GC.HEIGHT * 0.25, 'PAUSED', { fontFamily: FONT_HEAVY, fontSize: '110px', color: '#fff', stroke: '#000', strokeThickness: 12 }).setOrigin(0.5).setDepth(3);

    const buttonOpts = {
      width: 540,
      height: 142,
      fontSize: '54px',
      maxTextWidth: 430,
      stroke: '#14315f',
      strokeThickness: 5,
    };
    imageTextButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.42, 'btn_wide_play', '계속하기', () => this.resumeGame(), buttonOpts).setDepth(3);
    imageTextButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.52, 'btn_wide_restart', '다시하기', () => this.restartGame(), buttonOpts).setDepth(3);
    imageTextButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.62, 'btn_wide_home', '홈으로', () => this.goHome(), buttonOpts).setDepth(3);
    this.soundBtn = imageTextButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.72, 'btn_wide_sound_on', '', () => this.toggleSound(), buttonOpts).setDepth(3);
    this.updateSoundLabel();

    this.input.keyboard.addKey('P').on('down', this.resumeGame, this);
    this.input.keyboard.addKey('ESC').on('down', this.resumeGame, this);
  }

  updateSoundLabel() {
    this.soundBtn
      .setButtonTexture(Save.mute ? 'btn_wide_sound_off' : 'btn_wide_sound_on')
      .setLabel(Save.mute ? '소리 꺼짐' : '소리 켜짐');
  }

  toggleSound() {
    Save.setMute(!Save.mute);
    this.sound.mute = Save.mute;
    this.updateSoundLabel();
  }

  resumeGame() {
    const g = this.scene.get(this.gameKey);
    if (g && g.setHudVisible) g.setHudVisible(true);
    this.scene.resume(this.gameKey);
    this.scene.stop();
  }

  restartGame() {
    const g = this.scene.get(this.gameKey);
    if (g && g.bankCoins) g.bankCoins(); // 코인만 적립(중도 포기 판은 랭킹 미기록)
    this.scene.stop(this.gameKey);
    this.scene.start(this.gameKey);
    this.scene.stop();
  }

  goHome() {
    const g = this.scene.get(this.gameKey);
    if (g && g.bankCoins) g.bankCoins(); // 코인만 적립(중도 포기 판은 랭킹 미기록)
    this.scene.stop(this.gameKey);
    this.scene.start(SCENES.HOME);
    this.scene.stop();
  }
}
