import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import { FONT_BODY, FONT_HEAVY, fitTextWidth, formatCount, iconButton, imageTextButton, panel, playClick } from '../ui/UiKit.js';
import { setViewportBackdrop } from '../ui/ViewportBackdrop.js';

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super(SCENES.SHOP);
  }

  create() {
    this.sound.mute = Save.mute;
    setViewportBackdrop(Save.selBg);
    this.tab = 'char';
    this.add.image(GC.WIDTH / 2, GC.HEIGHT / 2, Save.selBg).setDepth(0);
    this.add.rectangle(0, 0, GC.WIDTH, GC.HEIGHT, 0x0b0d1a, 0.78).setOrigin(0, 0).setDepth(1);
    panel(this, GC.WIDTH / 2, 910, 880, 1280, { alpha: 0.78, strokeAlpha: 0.34, radius: 34, depth: 2 });

    this.add.text(GC.WIDTH / 2, 70, '상점', { fontFamily: FONT_HEAVY, fontSize: '80px', color: '#fff', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(5);

    // 코인
    this.add.image(GC.WIDTH - 160, 90, 'coin_01').setDisplaySize(60, 60).setDepth(5);
    this.coinText = this.add.text(GC.WIDTH - 116, 90, formatCount(Save.coins), { fontFamily: FONT_HEAVY, fontSize: '52px', color: '#ffd54a', stroke: '#000', strokeThickness: 5 }).setOrigin(0, 0.5).setDepth(5);
    fitTextWidth(this.coinText, 116);

    // 탭
    const tabOpts = {
      width: 300,
      height: 82,
      fontSize: '45px',
      maxTextWidth: 210,
      stroke: '#14315f',
      strokeThickness: 5,
    };
    this.tabChar = imageTextButton(this, GC.WIDTH * 0.3, 205, 'btn_wide_menu', '캐릭터', () => this.setTab('char'), tabOpts).setDepth(5);
    this.tabBg = imageTextButton(this, GC.WIDTH * 0.7, 205, 'btn_wide_menu', '배경', () => this.setTab('bg'), tabOpts).setDepth(5);

    // 뒤로(홈)
    iconButton(this, 90, GC.HEIGHT - 100, 'btn_home', () => this.scene.start(SCENES.HOME)).setDepth(5);
    this.msg = this.add.text(GC.WIDTH / 2, GC.HEIGHT - 90, '', { fontFamily: FONT_BODY, fontSize: '40px', color: '#ff6b6b' }).setOrigin(0.5).setDepth(5);

    this.cells = [];
    this.render();
  }

  setTab(tab) {
    if (this.tab === tab) return;
    this.tab = tab;
    this.msg.setText('');
    this.render();
  }

  render() {
    this.cells.forEach((o) => o.destroy());
    this.cells = [];
    this.tabChar.setTextColor(this.tab === 'char' ? '#ffd54a' : '#ffffff');
    this.tabBg.setTextColor(this.tab === 'bg' ? '#ffd54a' : '#ffffff');
    this.tabChar.bg.setAlpha(this.tab === 'char' ? 1 : 0.72);
    this.tabBg.bg.setAlpha(this.tab === 'bg' ? 1 : 0.72);

    const items = this.tab === 'char' ? GC.ASSETS.characters : GC.ASSETS.shopBackgrounds;
    items.forEach((item, i) => {
      const c = i % 2;
      const r = Math.floor(i / 2);
      const x = GC.WIDTH * 0.3 + c * GC.WIDTH * 0.4;
      const y = 435 + r * 300;
      this.buildCell(item, x, y);
    });
  }

  buildCell(item, x, y) {
    const isChar = this.tab === 'char';
    const owned = isChar ? Save.ownsChar(item.id) : Save.ownsBg(item.key);
    const selected = isChar ? Save.selChar === item.id : Save.selBg === item.key;

    const frame = this.add
      .rectangle(x, y, 340, 286, 0x06101f, selected ? 0.9 : 0.78)
      .setStrokeStyle(selected ? 5 : 3, selected ? 0x41e786 : 0xffffff, selected ? 1 : 0.46)
      .setDepth(3);
    this.cells.push(frame);

    let thumb;
    if (isChar) thumb = this.add.image(x, y - 42, item.tex).setDisplaySize(148, 148).setDepth(4);
    else thumb = this.add.image(x, y - 42, item.card).setDisplaySize(98, 138).setDepth(4);
    if (!owned) thumb.setTint(0x555555);
    this.cells.push(thumb);

    const label = owned ? (selected ? '선택됨' : '선택') : `코인 ${item.price}`;
    const color = owned ? (selected ? '#00e676' : '#ffffff') : '#ffd54a';
    // 카드 하단 안전영역 안에 이름/상태를 분리 배치한다.
    // 기존 2줄 텍스트는 실제 렌더링 높이가 프레임 하단선을 넘어가 겹쳐 보였다.
    const nameText = this.add.text(x, y + 54, item.name, {
      fontFamily: FONT_HEAVY,
      fontSize: '34px',
      color,
      align: 'center',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(4);
    fitTextWidth(nameText, 286, 0.8);
    const stateText = this.add.text(x, y + 96, label, {
      fontFamily: FONT_HEAVY,
      fontSize: '34px',
      color,
      align: 'center',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(4);
    fitTextWidth(stateText, 304, 0.78);
    this.cells.push(nameText, stateText);

    frame.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.onCell(item, owned, selected));
  }

  onCell(item, owned, selected) {
    playClick(this);
    const isChar = this.tab === 'char';
    if (owned) {
      if (selected) return;
      if (isChar) Save.selectChar(item.id); else Save.selectBg(item.key);
    } else {
      const ok = isChar ? Save.buyChar(item.id, item.price) : Save.buyBg(item.key, item.price);
      if (!ok) { this.msg.setText('코인이 부족합니다!'); return; }
      if (isChar) Save.selectChar(item.id); else Save.selectBg(item.key);
      this.coinText.setText(formatCount(Save.coins));
      fitTextWidth(this.coinText, 116);
    }
    setViewportBackdrop(Save.selBg);
    this.msg.setText('');
    this.render();
  }
}
