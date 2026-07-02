import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import { iconButton, textButton } from '../ui/UiKit.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SCENES.SETTINGS);
  }

  create() {
    this.sound.mute = Save.mute;
    this.add.image(GC.WIDTH / 2, GC.HEIGHT / 2, Save.selBg).setDepth(0);
    this.add.rectangle(0, 0, GC.WIDTH, GC.HEIGHT, 0x0b0d1a, 0.8).setOrigin(0, 0).setDepth(1);

    this.add.image(GC.WIDTH / 2, 160, 'btn_settings').setDisplaySize(150, 150).setDepth(3);
    this.add.text(GC.WIDTH / 2, 300, '설정', { fontFamily: 'Arial Black, Arial', fontSize: '80px', color: '#fff', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(3);

    this.soundLabel = textButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.4, '', () => this.toggleSound(), { fontSize: '58px' }).setDepth(3);
    this.updateSoundLabel();

    textButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.54, '🗑  데이터 초기화', () => this.confirmReset(), { fontSize: '52px', color: '#ff8a8a' }).setDepth(3);
    this.resetMsg = this.add.text(GC.WIDTH / 2, GC.HEIGHT * 0.62, '', { fontFamily: 'Arial', fontSize: '38px', color: '#ffd54a' }).setOrigin(0.5).setDepth(3);

    this.add.text(GC.WIDTH / 2, GC.HEIGHT * 0.72, `보유 코인: ${Save.coins}\n최고점: ${Save.best}`, { fontFamily: 'Arial', fontSize: '42px', color: '#ffffffcc', align: 'center' }).setOrigin(0.5).setDepth(3);

    iconButton(this, 90, GC.HEIGHT - 100, 'btn_home', () => this.scene.start(SCENES.HOME)).setDepth(3);
  }

  updateSoundLabel() {
    this.soundLabel.setText(Save.mute ? '🔇  소리 꺼짐' : '🔊  소리 켜짐');
  }

  toggleSound() {
    Save.setMute(!Save.mute);
    this.sound.mute = Save.mute;
    this.updateSoundLabel();
  }

  confirmReset() {
    if (!this._armed) {
      this._armed = true;
      this.resetMsg.setText('한 번 더 누르면 모든 데이터가 삭제됩니다');
      return;
    }
    try { window.localStorage.removeItem(GC.SCORE.SAVE_KEY); } catch { /* 무시 */ }
    Save.data = Save.load();
    this._armed = false;
    this.resetMsg.setText('초기화 완료!');
    this.time.delayedCall(700, () => this.scene.start(SCENES.HOME));
  }
}
