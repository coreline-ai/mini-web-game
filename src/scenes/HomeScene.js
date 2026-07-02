import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import { iconButton, textButton, coinLabel } from '../ui/UiKit.js';

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super(SCENES.HOME);
  }

  create() {
    this.sound.mute = Save.mute;
    this.add.image(GC.WIDTH / 2, GC.HEIGHT / 2, Save.selBg).setDepth(0);
    this.add.rectangle(0, 0, GC.WIDTH, GC.HEIGHT, 0x0b0d1a, 0.4).setOrigin(0, 0).setDepth(1);

    this.add
      .text(GC.WIDTH / 2, GC.HEIGHT * 0.18, "💩 Don't Get\nPooped!", {
        fontFamily: 'Arial Black, Arial', fontSize: '116px', color: '#fff', align: 'center', stroke: '#3a2a10', strokeThickness: 16,
      })
      .setOrigin(0.5).setDepth(3);

    coinLabel(this, Save.coins);

    // 선택 캐릭터 미리보기
    const charDef = GC.ASSETS.characters.find((c) => c.id === Save.selChar) || GC.ASSETS.characters[0];
    if (charDef.walk && this.anims.exists(charDef.walk)) {
      this.add.sprite(GC.WIDTH / 2, GC.HEIGHT * 0.44, charDef.walk).setDepth(3).setScale(1.4).play(charDef.walk);
    } else {
      const s = this.add.image(GC.WIDTH / 2, GC.HEIGHT * 0.44, charDef.tex).setDepth(3).setScale(1.4);
      this.tweens.add({ targets: s, y: s.y - 20, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    // PLAY
    textButton(this, GC.WIDTH / 2, GC.HEIGHT * 0.62, '▶  PLAY', () => this.scene.start(SCENES.GAME), { fontSize: '84px', bg: '#00000088' })
      .setDepth(3);

    // 하단 아이콘 버튼: 상점 / 랭킹 / 설정 / 사운드
    const y = GC.HEIGHT * 0.78;
    iconButton(this, GC.WIDTH / 2 - 210, y, 'btn_shop', () => this.scene.start(SCENES.SHOP));
    iconButton(this, GC.WIDTH / 2 - 70, y, 'btn_ranking', () => this.scene.start(SCENES.RANKING));
    iconButton(this, GC.WIDTH / 2 + 70, y, 'btn_settings', () => this.scene.start(SCENES.SETTINGS));
    this.soundBtn = iconButton(this, GC.WIDTH / 2 + 210, y, 'btn_sound', () => this.toggleSound());
    this.soundBtn.setAlpha(Save.mute ? 0.4 : 1);

    this.add
      .text(GC.WIDTH / 2, GC.HEIGHT * 0.9, '상점 · 랭킹 · 설정', { fontFamily: 'Arial', fontSize: '34px', color: '#ffffffaa' })
      .setOrigin(0.5).setDepth(3);
  }

  toggleSound() {
    Save.setMute(!Save.mute);
    this.sound.mute = Save.mute;
    this.soundBtn.setAlpha(Save.mute ? 0.4 : 1);
  }
}
