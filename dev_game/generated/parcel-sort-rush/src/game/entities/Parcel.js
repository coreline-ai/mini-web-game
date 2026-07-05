import Phaser from 'phaser';
import { ASSET_KEYS } from '../constants/gameKeys.js';

export default class Parcel extends Phaser.GameObjects.Container {
  constructor(scene, x, y, parcelType) {
    super(scene, x, y);
    this.scene = scene;
    this.baseWidth = 198;
    this.baseHeight = 148;
    this.reset(parcelType);
    scene.add.existing(this);
  }

  build() {
    this.removeAll(true);
    const texture = ASSET_KEYS.parcels[this.type.id] || ASSET_KEYS.parcels.north;
    const color = Phaser.Display.Color.HexStringToColor(this.type.color).color;
    const shadow = this.scene.add.ellipse(0, 62, this.baseWidth * 0.78, 30, 0x000000, 0.34).setName('shadow');
    const sprite = this.scene.add.image(0, 0, texture).setDisplaySize(this.baseWidth, this.baseHeight).setName('parcelSprite');
    const tagShadow = this.scene.add.rectangle(3, -76, 88, 42, 0x000000, 0.28).setName('tagShadow');
    const labelBg = this.scene.add.rectangle(0, -80, 88, 42, 0xfff4d6, 0.98)
      .setOrigin(0.5)
      .setStrokeStyle(4, color, 1)
      .setName('labelBg');
    const pointer = this.scene.add.triangle(0, -53, 0, 0, 22, 0, 11, 12, color, 0.96)
      .setOrigin(0.5)
      .setName('labelPointer');
    const label = this.scene.add.text(0, -80, this.type.icon || this.type.label, {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: this.type.id === 'fragile' ? '28px' : '26px',
      color: '#2a1b12',
      align: 'center',
      stroke: '#ffffff',
      strokeThickness: 2,
    }).setOrigin(0.5).setName('label');
    this.add([shadow, sprite, tagShadow, pointer, labelBg, label]);
    this.setSize(this.baseWidth, this.baseHeight);
  }

  reset(parcelType) {
    this.type = parcelType;
    this.sorted = false;
    this.missed = false;
    this.dragging = false;
    this.speed = 240;
    this.spawnedAt = 0;
    this.build();
    this.setVisible(true).setActive(true).setAlpha(1).setScale(1).setAngle(0).setDepth(20);
    return this;
  }

  update(delta) {
    if (!this.active || this.dragging || this.sorted) return;
    this.y += this.speed * (delta / 1000);
    this.angle = Math.sin((this.scene.time.now + this.x) / 220) * 1.5;
    const t = Phaser.Math.Clamp((this.y - 450) / 1060, 0, 1);
    this.setScale(Phaser.Math.Linear(0.9, 1.06, t));
  }

  containsPoint(x, y) {
    return Math.abs(x - this.x) <= (this.baseWidth * this.scaleX) / 2 && Math.abs(y - this.y) <= (this.baseHeight * this.scaleY) / 2;
  }

  startDrag() {
    this.dragging = true;
    this.setDepth(80).setScale(1.08);
  }

  dragTo(x, y) {
    this.x = x;
    this.y = y;
    this.angle = Phaser.Math.Clamp((x - this.scene.scale.width / 2) / 26, -8, 8);
  }

  stopDrag() {
    this.dragging = false;
    this.setScale(1).setAngle(0);
  }

  removeWithTween(ok = true) {
    this.sorted = true;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: ok ? 0.72 : 1.16,
      angle: ok ? 0 : 12,
      duration: ok ? 220 : 280,
      ease: 'Cubic.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}
