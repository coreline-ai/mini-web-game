import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';

export default class MovingTarget {
  constructor(scene, textureKey) {
    this.scene = scene;
    this.textureKey = textureKey;
    this.backplate = scene.add.ellipse(SPEC.canvas.width / 2, SPEC.canvas.height * 0.38, 124, 124, 0x07121d, 0.62)
      .setStrokeStyle(3, 0x57d8ff, 0.82)
      .setDepth(5);
    this.highlight = scene.add.ellipse(SPEC.canvas.width / 2, SPEC.canvas.height * 0.38, 104, 104, 0x57d8ff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.42)
      .setDepth(6);
    this.sprite = scene.add.image(SPEC.canvas.width / 2, SPEC.canvas.height * 0.38, textureKey)
      .setDepth(8)
      .setDisplaySize(90, 90);
    this.shadow = scene.add.ellipse(this.sprite.x, this.sprite.y + 42, 92, 20, 0x000000, 0.22)
      .setDepth(7);
    this.direction = 1;
    this.speed = 120;
    this.radius = 45;
    this.edgeMargin = this.radius + 24;
    this.alive = true;
  }

  reset({ x, y, size, speed, direction, edgeMargin }) {
    if (this.hitTween) {
      this.hitTween.stop();
      this.hitTween = null;
    }
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(x, y).setDisplaySize(size, size);
    this.sprite.setAlpha(1).setAngle(0).setVisible(true);
    this.backplate.setPosition(x, y).setSize(size * 1.56, size * 1.56).setAlpha(0.72).setVisible(true);
    this.highlight.setPosition(x, y).setSize(size * 1.72, size * 1.72).setAlpha(0.18).setVisible(true);
    this.shadow.setPosition(x, y + size * 0.45).setSize(size * 0.92, size * 0.2).setVisible(true);
    this.direction = direction || 1;
    this.speed = speed;
    this.radius = size * 0.5;
    this.edgeMargin = Math.max(edgeMargin || 0, this.radius + 24);
    this.alive = true;
  }

  update(delta) {
    if (!this.alive) return;
    const nextX = this.sprite.x + this.direction * this.speed * (delta / 1000);
    const margin = this.edgeMargin;
    if (nextX < margin || nextX > SPEC.canvas.width - margin) {
      this.direction *= -1;
      this.sprite.x = Phaser.Math.Clamp(nextX, margin, SPEC.canvas.width - margin);
    } else {
      this.sprite.x = nextX;
    }
    this.sprite.angle = Math.sin(this.scene.time.now * 0.006) * 5;
    this.shadow.x = this.sprite.x;
    this.highlight.x = this.sprite.x;
    this.backplate.x = this.sprite.x;
    const pulse = 1 + Math.sin(this.scene.time.now * 0.007) * 0.045;
    this.highlight.setScale(pulse);
    this.backplate.setScale(1 + Math.sin(this.scene.time.now * 0.005) * 0.018);
  }

  distanceTo(x, y) {
    return Phaser.Math.Distance.Between(x, y, this.sprite.x, this.sprite.y);
  }

  hideWithHit(onComplete) {
    this.alive = false;
    this.shadow.setVisible(false);
    this.highlight.setVisible(false);
    this.backplate.setVisible(false);
    this.scene.tweens.killTweensOf(this.sprite);
    this.hitTween = this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.sprite.scaleX * 1.28,
      scaleY: this.sprite.scaleY * 1.28,
      alpha: 0,
      angle: this.sprite.angle + 28,
      duration: 180,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.hitTween = null;
        onComplete?.();
      },
    });
  }

  getLayoutObject() {
    return this.sprite;
  }
}
