import Phaser from 'phaser';

export default class WeaponButton {
  constructor(scene, x, y, width, height, label, accent, handlers = {}) {
    this.scene = scene;
    this.bg = scene.add.graphics().setDepth(105);
    this.bg.fillStyle(0x071925, 0.96).fillRoundedRect(-width / 2, -height / 2, width, height, 16);
    this.bg.lineStyle(2, accent, 0.95).strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
    this.bg.setPosition(x, y).setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
    this.label = scene.add.text(x, y - 5, label, { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial', fontSize: '18px', color: '#ffffff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(106);
    this.state = scene.add.text(x, y + 20, '', { fontFamily: 'Apple SD Gothic Neo, Arial, sans-serif', fontSize: '10px', color: '#9dd7e9' }).setOrigin(0.5).setDepth(106);
    this.bg.on('pointerdown', (p) => { this.bg.setScale(0.96); handlers.down?.(p); });
    const release = (p) => { this.bg.setScale(1); handlers.up?.(p); };
    this.bg.on('pointerup', release);
    this.bg.on('pointerout', release);
  }
  setState(text, color = '#9dd7e9') { this.state.setText(text).setColor(color); }
  setEnabled(enabled) { this.bg.setAlpha(enabled ? 1 : 0.42); this.label.setAlpha(enabled ? 1 : 0.42); }
}
