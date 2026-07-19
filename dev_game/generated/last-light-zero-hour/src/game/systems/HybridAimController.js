import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';

export default class HybridAimController {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.pointerId = null;
    this.anchor = new Phaser.Math.Vector2();
    this.current = new Phaser.Math.Vector2();
    this.vector = new Phaser.Math.Vector2(0, -1);
    this.move = new Phaser.Math.Vector2();
    this.startedAt = 0;
    this.maxRadius = 155;
    this.tapVector = null;

    this.ring = scene.add.circle(0, 0, this.maxRadius, 0x071218, 0.28).setStrokeStyle(9, 0xe5b966, 0.42).setDepth(60).setVisible(false);
    this.thumb = scene.add.circle(0, 0, 54, 0xe5b966, 0.46).setStrokeStyle(7, 0xffffff, 0.62).setDepth(61).setVisible(false);
    scene.input.on('pointerdown', this.onDown, this);
    scene.input.on('pointermove', this.onMove, this);
    scene.input.on('pointerup', this.onUp, this);
  }

  isControlPoint(pointer) {
    return pointer.y > SPEC.canvas.height * 0.52 && pointer.y < SPEC.canvas.height * 0.905;
  }

  onDown(pointer) {
    if (this.active || !this.isControlPoint(pointer)) return;
    this.active = true;
    this.pointerId = pointer.id;
    this.anchor.set(pointer.x, pointer.y);
    this.current.copy(this.anchor);
    this.startedAt = this.scene.time.now;
    this.ring.setPosition(pointer.x, pointer.y).setVisible(true);
    this.thumb.setPosition(pointer.x, pointer.y).setVisible(true);
  }

  onMove(pointer) {
    if (!this.active || pointer.id !== this.pointerId) return;
    this.current.set(pointer.x, pointer.y);
    const raw = this.current.clone().subtract(this.anchor);
    const len = raw.length();
    if (len > this.maxRadius) raw.scale(this.maxRadius / len);
    this.thumb.setPosition(this.anchor.x + raw.x, this.anchor.y + raw.y);
    if (raw.length() > 26) {
      this.vector.copy(raw).normalize();
      this.move.copy(this.vector).scale(Math.min(1, raw.length() / this.maxRadius));
    } else this.move.set(0, 0);
  }

  onUp(pointer) {
    if (!this.active || pointer.id !== this.pointerId) return;
    const duration = this.scene.time.now - this.startedAt;
    const distance = Phaser.Math.Distance.Between(this.anchor.x, this.anchor.y, pointer.x, pointer.y);
    if (duration < 210 && distance < 28) this.tapVector = new Phaser.Math.Vector2(pointer.x, pointer.y);
    this.active = false;
    this.pointerId = null;
    this.move.set(0, 0);
    this.ring.setVisible(false);
    this.thumb.setVisible(false);
  }

  getMoveVector() { return this.move; }
  getManualAim() { return this.active && this.move.lengthSq() > 0.02 ? this.vector : null; }
  consumeTapVector() { const v = this.tapVector; this.tapVector = null; return v; }
  cleanup() {
    this.scene.input.off('pointerdown', this.onDown, this);
    this.scene.input.off('pointermove', this.onMove, this);
    this.scene.input.off('pointerup', this.onUp, this);
    this.ring.destroy(); this.thumb.destroy();
  }
}
