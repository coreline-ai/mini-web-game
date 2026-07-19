import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { WEAPON_ORDER, WEAPONS } from '../data/weaponConfig.js';
import { SaveData } from '../systems/SaveData.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout } from '../systems/LayoutRegistry.js';

export default class ArsenalScene extends Phaser.Scene {
  constructor() { super(SCENES.ARSENAL); }
  create() {
    const { width, height } = SPEC.canvas;
    this.add.image(width / 2, height / 2, 'bg_3').setDisplaySize(width, height);
    this.add.rectangle(0, 0, width, height, 0x02080b, 0.73).setOrigin(0);
    this.title = this.add.text(width / 2, 138, 'HELIOS 무기고', { fontFamily: 'Arial Black, Arial', fontSize: '78px', color: '#f1e4c7', stroke: '#020708', strokeThickness: 12 }).setOrigin(0.5);
    this.subtitle = this.add.text(width / 2, 235, '결정으로 무기를 영구 강화한다 · 강화 수치는 다음 방어 작전에도 유지된다', { fontFamily: 'Arial', fontSize: '30px', color: '#a9c9c2' }).setOrigin(0.5);
    this.coreText = this.add.text(width / 2, 328, '', { fontFamily: 'Arial Black, Arial', fontSize: '42px', color: '#8df7d6' }).setOrigin(0.5);
    this.cards = [];
    WEAPON_ORDER.forEach((id, i) => this.createCard(id, i));
    this.back = makeTextButton(this, width / 2, height - 128, '홈으로', () => this.scene.start(SCENES.HOME), 520, 118, { oneShot: true });
    this.refresh();
    this.layout = [{ id: 'arsenal-title', obj: this.title }, { id: 'arsenal-cores', obj: this.coreText }, ...this.cards.map((c) => ({ id: `upgrade-${c.id}`, obj: c.panel })), { id: 'home', obj: this.back.bg }];
    const pub = () => publishLayout(this, this.layout, { requiredIds: this.layout.map((e) => e.id) });
    pub(); this.time.delayedCall(80, pub); this.scale.on('resize', pub);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', pub));
  }

  createCard(id, index) {
    const cfg = WEAPONS[id]; const y = 520 + index * 348;
    const panel = this.add.rectangle(74, y, SPEC.canvas.width - 148, 292, 0x09161a, 0.92).setOrigin(0).setStrokeStyle(4, cfg.color, 0.5);
    const icon = this.add.image(220, y + 140, ASSET_KEYS.weapons, cfg.frame).setDisplaySize(140, 210);
    const name = this.add.text(360, y + 42, cfg.name, { fontFamily: 'Arial Black, Arial', fontSize: '43px', color: '#f5eee0' });
    const desc = this.add.text(360, y + 105, cfg.description, { fontFamily: 'Arial', fontSize: '30px', color: '#aec5bf' });
    const level = this.add.text(360, y + 174, '', { fontFamily: 'Arial Black, Arial', fontSize: '32px', color: '#e5b966' });
    const buy = makeTextButton(this, 1136, y + 158, '', () => {
      const result = SaveData.buyUpgrade(id);
      if (!result.ok) this.flash('결정이 부족합니다', '#ff9b86'); else this.flash(`${cfg.short} 강화 완료`, '#8df7d6');
      this.refresh();
    }, 360, 116, { oneShot: false });
    this.cards.push({ id, panel, icon, name, desc, level, buy });
  }

  refresh() {
    const progress = SaveData.getProgress();
    this.coreText.setText(`보유 감염 결정  ${progress.cores}`);
    this.cards.forEach((card) => {
      const level = progress.upgrades[card.id] || 0; const cost = SaveData.upgradeCost(card.id);
      card.level.setText(`LV.${level}  ·  피해 +${level * 12}%`);
      card.buy.txt.setText(`강화 ${cost}`);
      const affordable = progress.cores >= cost;
      card.buy.bg.setAlpha(affordable ? 1 : 0.56); card.buy.txt.setAlpha(affordable ? 1 : 0.65);
    });
  }

  flash(message, color) {
    const t = this.add.text(SPEC.canvas.width / 2, 420, message, { fontFamily: 'Arial Black, Arial', fontSize: '38px', color, stroke: '#020708', strokeThickness: 8 }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: t, y: 370, alpha: 0, duration: 950, onComplete: () => t.destroy() });
  }
}
