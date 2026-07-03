import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import { Music } from '../systems/MusicManager.js';
import { FONT_BODY, FONT_HEAVY, iconButton, imageTextButton, panel } from '../ui/UiKit.js';
import { setViewportBackdrop } from '../ui/ViewportBackdrop.js';

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super(SCENES.SETTINGS);
  }

  create() {
    // Phaser는 씬 인스턴스를 재사용하므로, 재입장 시 확인 가드를 반드시 초기화한다.
    // (초기화 안 하면 "데이터 초기화"를 한 번 누르고 나갔다 오면 무경고 1탭 삭제됨)
    this._armed = false;
    this.sound.mute = Save.mute;
    setViewportBackdrop(Save.selBg);
    this.add.image(GC.WIDTH / 2, GC.HEIGHT / 2, Save.selBg).setDepth(0);
    this.add.rectangle(0, 0, GC.WIDTH, GC.HEIGHT, 0x0b0d1a, 0.8).setOrigin(0, 0).setDepth(1);
    panel(this, GC.WIDTH / 2, GC.HEIGHT * 0.53, 760, 900, { alpha: 0.7, depth: 2 });

    this.add.image(GC.WIDTH / 2, 160, 'btn_settings').setDisplaySize(150, 150).setDepth(3);
    this.add.text(GC.WIDTH / 2, 300, '설정', { fontFamily: FONT_HEAVY, fontSize: '80px', color: '#fff', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(3);

    const buttonOpts = {
      width: 580,
      height: 146,
      fontSize: '54px',
      maxTextWidth: 460,
      stroke: '#14315f',
      strokeThickness: 5,
    };
    this.soundLabel = imageTextButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.4, 'btn_wide_sound_on', '', () => this.toggleSound(), buttonOpts).setDepth(3);
    this.updateSoundLabel();

    imageTextButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.54, 'btn_wide_danger', '데이터 초기화', () => this.confirmReset(), {
      ...buttonOpts,
      fontSize: '50px',
      color: '#ffffff',
      stroke: '#5a160c',
    }).setDepth(3);
    this.resetMsg = this.add.text(GC.WIDTH / 2, GC.HEIGHT * 0.62, '', { fontFamily: FONT_BODY, fontSize: '38px', color: '#ffd54a', align: 'center', wordWrap: { width: 620 } }).setOrigin(0.5).setDepth(3);

    this.add.text(GC.WIDTH / 2, GC.HEIGHT * 0.72, `보유 코인: ${Save.coins}\n최고점: ${Save.best}`, { fontFamily: FONT_BODY, fontSize: '42px', color: '#ffffffcc', align: 'center', lineSpacing: 10 }).setOrigin(0.5).setDepth(3);

    iconButton(this, 90, GC.HEIGHT - 100, 'btn_home', () => this.scene.start(SCENES.HOME)).setDepth(3);
  }

  updateSoundLabel() {
    this.soundLabel
      .setButtonTexture(Save.mute ? 'btn_wide_sound_off' : 'btn_wide_sound_on')
      .setLabel(Save.mute ? '소리 꺼짐' : '소리 켜짐');
  }

  toggleSound() {
    Save.setMute(!Save.mute);
    Music.syncMute(this);
    this.updateSoundLabel();
  }

  confirmReset() {
    if (!this._armed) {
      this._armed = true;
      this.resetMsg.setText('한 번 더 누르면 모든 데이터가 삭제됩니다');
      return;
    }
    Save.reset();
    this._armed = false;
    this.resetMsg.setText('초기화 완료!');
    this.time.delayedCall(700, () => this.scene.start(SCENES.HOME));
  }
}
