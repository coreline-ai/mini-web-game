import Phaser from 'phaser';

export default class VFXManager {
  constructor(scene) {
    this.scene = scene;
  }

  triggerParryEffect(x, y, isJust = false) {
    // 1. Shockwave Ring (Expanded for FHD 1080x1920)
    const ring = this.scene.add.sprite(x, y, 'shockwave-ring')
      .setScale(0.3)
      .setAlpha(1)
      .setBlendMode(Phaser.BlendModes.ADD);

    if (isJust) {
      ring.setTint(0x00ffff);
    } else {
      ring.setTint(0xffd700);
    }

    this.scene.tweens.add({
      targets: ring,
      scale: isJust ? 1.6 : 1.1,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });

    // 2. Spark Emitters
    const sparkCount = isJust ? 24 : 14;
    for (let i = 0; i < sparkCount; i++) {
      const spark = this.scene.add.sprite(x, y, 'particle-spark')
        .setScale(isJust ? 1.0 : 0.7)
        .setBlendMode(Phaser.BlendModes.ADD);

      const angle = (Math.PI * 2 / sparkCount) * i + (Math.random() * 0.4 - 0.2);
      const distance = (isJust ? 160 : 100) + Math.random() * 60;
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;

      this.scene.tweens.add({
        targets: spark,
        x: targetX,
        y: targetY,
        scale: 0.1,
        alpha: 0,
        duration: 280 + Math.random() * 150,
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy()
      });
    }

    // 3. Screen Shake & Hit-Stop Time Dilation
    if (isJust) {
      this.scene.cameras.main.shake(120, 0.012);
      this.scene.physics.world.isPaused = true;
      this.scene.time.delayedCall(50, () => {
        this.scene.physics.world.isPaused = false;
      });
    } else {
      this.scene.cameras.main.shake(80, 0.006);
    }
  }

  triggerHitEffect(x, y) {
    this.scene.cameras.main.shake(220, 0.02);
    this.scene.cameras.main.flash(180, 255, 0, 80);
  }

  showFloatingText(x, y, text, color = '#00ffff', size = '36px') {
    const txt = this.scene.add.text(x, y, text, {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: size,
      color: color,
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(100);

    this.scene.tweens.add({
      targets: txt,
      y: y - 80,
      alpha: 0,
      scale: 1.15,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy()
    });
  }
}
