import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import { textButton } from '../ui/UiKit.js';

// GameScene 위 오버레이 일시정지.
export default class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PAUSE);
  }

  create(data) {
    this.gameKey = data?.gameKey ?? SCENES.GAME;
    this.add.rectangle(0, 0, GC.WIDTH, GC.HEIGHT, 0x000000, 0.62).setOrigin(0, 0);
    this.add.text(GC.WIDTH / 2, GC.HEIGHT * 0.26, '⏸ PAUSED', { fontFamily: 'Arial Black, Arial', fontSize: '110px', color: '#fff', stroke: '#000', strokeThickness: 12 }).setOrigin(0.5);

    textButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.46, '▶  계속하기', () => this.resumeGame());
    textButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.56, '↻  다시하기', () => this.restartGame());
    textButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.66, '🏠  홈으로', () => this.goHome());
    this.soundBtn = textButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.76, '', () => this.toggleSound());
    this.updateSoundLabel();

    this.input.keyboard.addKey('P').on('down', this.resumeGame, this);
    this.input.keyboard.addKey('ESC').on('down', this.resumeGame, this);
  }

  updateSoundLabel() {
    this.soundBtn.setText(Save.mute ? '🔇  소리 꺼짐' : '🔊  소리 켜짐');
  }

  toggleSound() {
    Save.setMute(!Save.mute);
    this.sound.mute = Save.mute;
    this.updateSoundLabel();
  }

  resumeGame() {
    this.scene.resume(this.gameKey);
    this.scene.stop();
  }

  restartGame() {
    const g = this.scene.get(this.gameKey);
    if (g && g.bankRun) g.bankRun();
    this.scene.stop(this.gameKey);
    this.scene.start(this.gameKey);
    this.scene.stop();
  }

  goHome() {
    const g = this.scene.get(this.gameKey);
    if (g && g.bankRun) g.bankRun();
    this.scene.stop(this.gameKey);
    this.scene.start(SCENES.HOME);
    this.scene.stop();
  }
}
