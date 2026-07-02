import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import { iconButton, textButton, playClick } from '../ui/UiKit.js';

export default class ShopScene extends Phaser.Scene {
  constructor() {
    super(SCENES.SHOP);
  }

  create() {
    this.sound.mute = Save.mute;
    this.tab = 'char';
    this.add.image(GC.WIDTH / 2, GC.HEIGHT / 2, Save.selBg).setDepth(0);
    this.add.rectangle(0, 0, GC.WIDTH, GC.HEIGHT, 0x0b0d1a, 0.72).setOrigin(0, 0).setDepth(1);

    this.add.text(GC.WIDTH / 2, 70, '상점', { fontFamily: 'Arial Black, Arial', fontSize: '80px', color: '#fff', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(3);

    // 코인
    this.add.image(GC.WIDTH - 200, 90, 'coin_01').setDisplaySize(60, 60).setDepth(3);
    this.coinText = this.add.text(GC.WIDTH - 160, 62, `${Save.coins}`, { fontFamily: 'Arial Black, Arial', fontSize: '52px', color: '#ffd54a', stroke: '#000', strokeThickness: 5 }).setDepth(3);

    // 탭
    this.tabChar = textButton(this, GC.WIDTH * 0.32, 200, '캐릭터', () => this.setTab('char'), { fontSize: '52px' }).setDepth(3);
    this.tabBg = textButton(this, GC.WIDTH * 0.68, 200, '배경', () => this.setTab('bg'), { fontSize: '52px' }).setDepth(3);

    // 뒤로(홈)
    iconButton(this, 90, GC.HEIGHT - 100, 'btn_home', () => this.scene.start(SCENES.HOME)).setDepth(3);
    this.msg = this.add.text(GC.WIDTH / 2, GC.HEIGHT - 90, '', { fontFamily: 'Arial', fontSize: '40px', color: '#ff6b6b' }).setOrigin(0.5).setDepth(3);

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
    this.tabChar.setColor(this.tab === 'char' ? '#ffd54a' : '#ffffff');
    this.tabBg.setColor(this.tab === 'bg' ? '#ffd54a' : '#ffffff');

    const items = this.tab === 'char' ? GC.ASSETS.characters : GC.ASSETS.shopBackgrounds;
    items.forEach((item, i) => {
      const c = i % 2;
      const r = Math.floor(i / 2);
      const x = GC.WIDTH * 0.28 + c * GC.WIDTH * 0.44;
      const y = 360 + r * 340;
      this.buildCell(item, x, y);
    });
  }

  buildCell(item, x, y) {
    const isChar = this.tab === 'char';
    const owned = isChar ? Save.ownsChar(item.id) : Save.ownsBg(item.key);
    const selected = isChar ? Save.selChar === item.id : Save.selBg === item.key;

    const frame = this.add.rectangle(x, y, 300, 300, 0x000000, 0.35).setStrokeStyle(selected ? 8 : 3, selected ? 0x00e676 : 0xffffff).setDepth(2);
    this.cells.push(frame);

    let thumb;
    if (isChar) thumb = this.add.image(x, y - 30, item.tex).setDisplaySize(150, 150).setDepth(3);
    else thumb = this.add.image(x, y - 30, item.card).setDisplaySize(130, 195).setDepth(3);
    if (!owned) thumb.setTint(0x555555);
    this.cells.push(thumb);

    const label = owned ? (selected ? '✔ 선택됨' : '선택') : `🪙 ${item.price}`;
    const color = owned ? (selected ? '#00e676' : '#ffffff') : '#ffd54a';
    const txt = this.add.text(x, y + 110, `${item.name}\n${label}`, { fontFamily: 'Arial', fontSize: '36px', color, align: 'center' }).setOrigin(0.5).setDepth(3);
    this.cells.push(txt);

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
      this.coinText.setText(`${Save.coins}`);
    }
    this.msg.setText('');
    this.render();
  }
}
