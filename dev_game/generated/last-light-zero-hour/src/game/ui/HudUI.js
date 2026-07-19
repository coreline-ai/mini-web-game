import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { WEAPON_ORDER, WEAPONS } from '../data/weaponConfig.js';
import { makeTextButton } from './MobileButton.js';

export default class HudUI {
  constructor(scene, onPause, onWeapon) {
    this.scene = scene;
    const { width, height } = SPEC.canvas;
    this.topPanel = scene.add.rectangle(42, 36, width - 84, 138, 0x061014, 0.86).setOrigin(0).setStrokeStyle(3, 0xe5b966, 0.35).setDepth(90);
    this.dayText = scene.add.text(76, 60, 'DAY 01 · 새벽', { fontFamily: 'Arial Black, Arial', fontSize: '38px', color: '#e5b966' }).setDepth(91);
    this.timeText = scene.add.text(76, 111, '00:00', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#d9eeea' }).setDepth(91);
    this.killText = scene.add.text(width * 0.45, 61, 'KILL 0', { fontFamily: 'Arial Black, Arial', fontSize: '38px', color: '#f3f1e8' }).setOrigin(0.5, 0).setDepth(91);
    this.coreText = scene.add.text(width * 0.69, 62, '결정 0', { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#8df7d6' }).setOrigin(0.5, 0).setDepth(91);
    this.hpBack = scene.add.rectangle(76, 154, 720, 28, 0x020809, 0.85).setOrigin(0, 0.5).setDepth(92);
    this.hpFill = scene.add.rectangle(76, 154, 720, 22, 0x78d3a5, 1).setOrigin(0, 0.5).setDepth(93);
    this.hpLabel = scene.add.text(812, 138, 'HP 100', { fontFamily: 'Arial Black, Arial', fontSize: '29px', color: '#dff8e8' }).setDepth(93);
    if (scene.textures.exists(ASSET_KEYS.uiPause)) {
      const pauseIcon = scene.add.image(width - 120, 104, ASSET_KEYS.uiPause).setDisplaySize(104, 104).setDepth(95).setInteractive({ useHandCursor: true });
      pauseIcon.on('pointerdown', () => pauseIcon.setScale(pauseIcon.scaleX * 0.92, pauseIcon.scaleY * 0.92));
      pauseIcon.on('pointerup', () => { pauseIcon.setDisplaySize(104, 104); onPause?.(); });
      pauseIcon.on('pointerout', () => pauseIcon.setDisplaySize(104, 104));
      this.pause = { bg: pauseIcon, txt: scene.add.text(-1000, -1000, '') };
    } else this.pause = makeTextButton(scene, width - 120, 104, 'Ⅱ', onPause, 132, 102, { oneShot: false });
    this.pause.bg.setDepth(94); this.pause.txt.setDepth(95);

    this.bossPanel = scene.add.rectangle(width / 2, 438, width - 180, 82, 0x080b0c, 0.86).setStrokeStyle(4, 0xff6a5e, 0.75).setDepth(90).setVisible(false);
    this.bossFill = scene.add.rectangle(116, 458, width - 232, 28, 0xa52f2c, 0.96).setOrigin(0, 0.5).setDepth(92).setVisible(false);
    this.bossText = scene.add.text(width / 2, 412, 'TITAN · 헬리오 포식자', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffb29f' }).setOrigin(0.5).setDepth(93).setVisible(false);

    this.cards = [];
    const cardY = height - 162;
    WEAPON_ORDER.forEach((id, i) => {
      const cfg = WEAPONS[id]; const x = 152 + i * 284;
      const art = scene.add.image(x, cardY, ASSET_KEYS.uiWeaponCard).setDisplaySize(216, 216).setDepth(93).setAlpha(0.84);
      const bg = scene.add.rectangle(x, cardY, 250, 210, 0x081519, 0.38).setStrokeStyle(5, 0x58736e, 0.78).setDepth(94).setInteractive({ useHandCursor: true });
      const icon = scene.add.image(x, cardY - 38, ASSET_KEYS.weapons, cfg.frame).setDisplaySize(84, 126).setDepth(95);
      const name = scene.add.text(x, cardY + 39, cfg.short, { fontFamily: 'Arial Black, Arial', fontSize: '29px', color: '#f5eee0' }).setOrigin(0.5).setDepth(96);
      const barBack = scene.add.rectangle(x - 96, cardY + 79, 192, 16, 0x000000, 0.82).setOrigin(0, 0.5).setDepth(96);
      const bar = scene.add.rectangle(x - 96, cardY + 79, 192, 12, cfg.color, 1).setOrigin(0, 0.5).setDepth(97);
      bg.on('pointerdown', () => onWeapon?.(id));
      this.cards.push({ id, art, bg, icon, name, barBack, bar });
    });

    this.toastPanel = scene.add.rectangle(width / 2, height * 0.58, width - 260, 126, 0x03090b, 0.88).setStrokeStyle(3, 0xe5b966, 0.55).setDepth(110).setAlpha(0);
    this.toast = scene.add.text(width / 2, height * 0.58, '', { fontFamily: 'Arial Black, Arial', fontSize: '36px', color: '#f6e6bc', align: 'center', wordWrap: { width: width - 330 } }).setOrigin(0.5).setDepth(111).setAlpha(0);
  }

  update(stats, phaseState, weaponState) {
    const seconds = Math.max(0, Math.floor(stats.elapsed || 0));
    this.dayText.setText(`DAY ${String(phaseState.day).padStart(2, '0')} · ${phaseState.phase.name}`);
    this.dayText.setColor(phaseState.phase.color);
    this.timeText.setText(`${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`);
    this.killText.setText(`KILL ${stats.kills}`);
    this.coreText.setText(`결정 ${stats.cores}`);
    const hpRatio = Math.max(0, Math.min(1, stats.hp / stats.maxHp));
    this.hpFill.width = 720 * hpRatio;
    this.hpFill.fillColor = hpRatio > 0.55 ? 0x78d3a5 : hpRatio > 0.25 ? 0xe2a652 : 0xdb594e;
    this.hpLabel.setText(`HP ${Math.ceil(stats.hp)}`);
    this.cards.forEach((card) => {
      const selected = card.id === weaponState.selected;
      card.bg.setStrokeStyle(selected ? 9 : 5, selected ? WEAPONS[card.id].color : 0x58736e, selected ? 1 : 0.78);
      card.bg.setFillStyle(selected ? 0x173038 : 0x081519, selected ? 0.97 : 0.92);
      let ratio;
      if (card.id === 'gatling') {
        ratio = weaponState.heat / 100;
        card.bar.fillColor = weaponState.overheated ? 0xff403c : ratio > 0.72 ? 0xff8b4d : 0xe5b966;
      } else ratio = weaponState.energy[card.id] / 100;
      card.bar.width = Math.max(2, 192 * Math.max(0, Math.min(1, ratio)));
    });
  }

  setBoss(visible, ratio = 1) {
    this.bossPanel.setVisible(visible); this.bossFill.setVisible(visible); this.bossText.setVisible(visible);
    if (visible) this.bossFill.width = Math.max(0, (SPEC.canvas.width - 232) * ratio);
  }

  showToast(message, color = '#f6e6bc') {
    this.toast.setText(message).setColor(color).setAlpha(1);
    this.toastPanel.setAlpha(0.88);
    this.scene.tweens.killTweensOf([this.toast, this.toastPanel]);
    this.scene.tweens.add({ targets: [this.toast, this.toastPanel], alpha: 0, delay: 1250, duration: 420 });
  }

  setVisible(v) {
    [this.topPanel, this.dayText, this.timeText, this.killText, this.coreText, this.hpBack, this.hpFill, this.hpLabel, this.pause.bg, this.pause.txt].forEach((o) => o.setVisible(v));
    this.cards.forEach((card) => Object.values(card).filter((o) => o?.setVisible).forEach((o) => o.setVisible(v)));
    if (!v) this.setBoss(false);
  }

  entries() {
    const list = [
      { id: 'hud-top-panel', obj: this.topPanel, allowOverlap: true },
      { id: 'hud-day', obj: this.dayText, allowOverlap: true },
      { id: 'hud-time', obj: this.timeText, allowOverlap: true },
      { id: 'hud-kills', obj: this.killText, allowOverlap: true },
      { id: 'hud-cores', obj: this.coreText, allowOverlap: true },
      { id: 'hud-health', obj: this.hpBack, allowOverlap: true },
      { id: 'pause', obj: this.pause.bg },
    ];
    this.cards.forEach((card) => list.push({ id: `weapon-${card.id}`, obj: card.bg }));
    return list;
  }
}
