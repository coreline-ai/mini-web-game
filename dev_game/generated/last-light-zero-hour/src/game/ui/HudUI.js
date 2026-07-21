import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { WEAPON_ORDER, WEAPONS } from '../data/weaponConfig.js';
import { makeTextButton } from './MobileButton.js';

export default class HudUI {
  constructor(scene, onPause, onWeapon, onAutoHunt) {
    this.scene = scene;
    const { width, height } = SPEC.canvas;
    this.topPanel = scene.add.rectangle(42, 36, width - 84, 138, 0x061014, 0.86).setOrigin(0).setStrokeStyle(3, 0xe5b966, 0.35).setDepth(90);
    this.dayText = scene.add.text(76, 60, 'DAY 01 · 새벽', { fontFamily: 'Arial Black, Arial', fontSize: '38px', color: '#e5b966' }).setDepth(91);
    this.timeText = scene.add.text(76, 111, '00:00', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#d9eeea' }).setDepth(91);
    this.killText = scene.add.text(width * 0.45, 61, 'KILL 0', { fontFamily: 'Arial Black, Arial', fontSize: '38px', color: '#f3f1e8' }).setOrigin(0.5, 0).setDepth(91);
    this.coreText = scene.add.text(width * 0.62, 62, '결정 0', { fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#8df7d6' }).setOrigin(0.5, 0).setDepth(91);
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
    this.autoHunt = makeTextButton(scene, width - 330, 104, '자동 사냥 OFF', onAutoHunt, 250, 82, { oneShot: false });
    this.autoHunt.bg.setDepth(94); this.autoHunt.txt.setDepth(95);
    this.setAutoHunt(false);

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
      const name = scene.add.text(x, cardY + 35, cfg.short, { fontFamily: 'Arial Black, Arial', fontSize: '29px', color: '#f5eee0' }).setOrigin(0.5).setDepth(96);
      const status = scene.add.text(x, cardY + 63, id === 'gatling' ? 'AUTO' : '충전 중', { fontFamily: 'Arial Black, Arial', fontSize: '19px', color: '#b5d8d1' }).setOrigin(0.5).setDepth(97);
      const barBack = scene.add.rectangle(x - 96, cardY + 88, 192, 16, 0x000000, 0.82).setOrigin(0, 0.5).setDepth(96);
      const bar = scene.add.rectangle(x - 96, cardY + 88, 192, 12, cfg.color, 1).setOrigin(0, 0.5).setDepth(98);
      bg.on('pointerdown', () => onWeapon?.(id));
      this.cards.push({ id, art, bg, icon, name, status, barBack, bar });
    });

    this.toastPanel = scene.add.rectangle(width / 2, height * 0.58, width - 260, 126, 0x03090b, 0.88).setStrokeStyle(3, 0xe5b966, 0.55).setDepth(110).setAlpha(0);
    this.toast = scene.add.text(width / 2, height * 0.58, '', { fontFamily: 'Arial Black, Arial', fontSize: '36px', color: '#f6e6bc', align: 'center', wordWrap: { width: width - 330 } }).setOrigin(0.5).setDepth(111).setAlpha(0);
  }

  update(stats, phaseState, weaponState, autoHuntEnabled = false) {
    const seconds = Math.max(0, Math.floor(stats.elapsed || 0));
    this.dayText.setText(`DAY ${String(phaseState.day).padStart(2, '0')} · ${phaseState.phase.name}`);
    this.dayText.setColor(phaseState.phase.color);
    this.timeText.setText(`${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`);
    this.killText.setText(`KILL ${stats.kills}`);
    this.coreText.setText(`결정 ${stats.cores}`);
    const hpRatio = Math.max(0, Math.min(1, stats.hp / stats.maxHp));
    this.hpFill.width = 720 * hpRatio;
    this.hpFill.fillColor = stats.invincible ? 0x8df7d6 : hpRatio > 0.55 ? 0x78d3a5 : hpRatio > 0.25 ? 0xe2a652 : 0xdb594e;
    this.hpLabel.setText(stats.invincible ? 'HP ∞' : `HP ${Math.ceil(stats.hp)}`);
    this.setAutoHunt(autoHuntEnabled);
    this.cards.forEach((card) => {
      const isAuto = card.id === 'gatling';
      const isFiringSpecial = card.id === weaponState.activeSpecial;
      const isSelected = isAuto || isFiringSpecial;
      card.bg.setStrokeStyle(isSelected ? (isFiringSpecial ? 9 : 7) : 5, isSelected ? WEAPONS[card.id].color : 0x58736e, isSelected ? 1 : 0.78);
      card.bg.setFillStyle(isAuto ? 0x173038 : isFiringSpecial ? 0x1b2930 : 0x081519, isSelected ? 0.97 : 0.92);
      let ratio;
      if (isAuto) {
        ratio = weaponState.heat / 100;
        card.bar.fillColor = weaponState.overheated ? 0xff403c : ratio > 0.72 ? 0xff8b4d : 0xe5b966;
        card.status.setText(weaponState.overheated ? 'OVERHEAT' : 'AUTO').setColor(weaponState.overheated ? '#ff8d82' : '#e5c77a');
      } else ratio = weaponState.energy[card.id] / 100;
      card.bar.width = Math.max(2, 192 * Math.max(0, Math.min(1, ratio)));
      if (!isAuto) {
        const cfg = WEAPONS[card.id];
        const energy = weaponState.energy[card.id] || 0;
        const cooldown = weaponState.cooldown?.[card.id] || 0;
        const ready = energy + 0.001 >= cfg.energyCost && cooldown <= 0.01;
        if (cooldown > 0.01) card.status.setText(`재사용 ${cooldown.toFixed(1)}초`).setColor('#b5d8eb');
        else if (ready) card.status.setText('READY · 탭').setColor('#a8f5d8');
        else card.status.setText(`충전 ${Math.floor(energy)}%`).setColor('#d6c89b');
      }
    });
  }

  setBoss(visible, ratio = 1) {
    this.bossPanel.setVisible(visible); this.bossFill.setVisible(visible); this.bossText.setVisible(visible);
    if (visible) this.bossFill.width = Math.max(0, (SPEC.canvas.width - 232) * ratio);
  }

  setAutoHunt(enabled) {
    const active = !!enabled;
    this.autoHunt.txt.setText(active ? '자동 사냥 ON' : '자동 사냥 OFF').setColor(active ? '#a8f5d8' : '#f5eee0');
    if (active) this.autoHunt.bg.setTint(0x9ff1d0); else this.autoHunt.bg.clearTint();
  }

  showToast(message, color = '#f6e6bc') {
    this.toast.setText(message).setColor(color).setAlpha(1);
    this.toastPanel.setAlpha(0.88);
    this.scene.tweens.killTweensOf([this.toast, this.toastPanel]);
    this.scene.tweens.add({ targets: [this.toast, this.toastPanel], alpha: 0, delay: 1250, duration: 420 });
  }

  setVisible(v) {
    [this.topPanel, this.dayText, this.timeText, this.killText, this.coreText, this.hpBack, this.hpFill, this.hpLabel, this.pause.bg, this.pause.txt, this.autoHunt.bg, this.autoHunt.txt].forEach((o) => o.setVisible(v));
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
      { id: 'auto-hunt', obj: this.autoHunt.bg },
      { id: 'pause', obj: this.pause.bg },
    ];
    this.cards.forEach((card) => list.push({ id: `weapon-${card.id}`, obj: card.bg }));
    return list;
  }
}
