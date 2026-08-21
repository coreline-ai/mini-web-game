import Phaser from 'phaser';

export default class PlayerRonin extends Phaser.GameObjects.Container {
  constructor(scene, x, y) {
    super(scene, x, y);
    this.scene = scene;

    // 1. Visual Combat Zone Indicators (FHD 1080x1920)
    // Outer Deflect Perimeter (Radius 420px)
    this.outerPerimeter = scene.add.circle(0, 0, 420, 0x00f7ff, 0.03)
      .setStrokeStyle(2, 0x00f7ff, 0.35);
    this.add(this.outerPerimeter);

    // Inner Just Parry Zone (Radius 190px)
    this.justPerimeter = scene.add.circle(0, 0, 190, 0xffd700, 0.05)
      .setStrokeStyle(2.5, 0xffd700, 0.5);
    this.add(this.justPerimeter);

    // 2. Cyber Pedestal (Platform Base under feet in FHD)
    this.pedestalOuter = scene.add.ellipse(0, 135, 270, 85, 0x00f7ff, 0.25)
      .setStrokeStyle(4, 0x00f7ff, 0.9);
    this.add(this.pedestalOuter);

    this.pedestalInner = scene.add.ellipse(0, 135, 170, 50, 0x003366, 0.6)
      .setStrokeStyle(3, 0x00ffff, 0.85);
    this.add(this.pedestalInner);

    // Rotating Pedestal Animation
    scene.tweens.add({
      targets: this.pedestalOuter,
      scaleX: { from: 0.95, to: 1.05 },
      scaleY: { from: 0.95, to: 1.05 },
      alpha: { from: 0.25, to: 0.45 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // 3. Main Character Sprite (1024x1024 master scaled to ~390px crisp hero)
    this.sprite = scene.add.sprite(0, 0, 'player-ronin')
      .setOrigin(0.5, 0.52)
      .setScale(0.38);
    this.add(this.sprite);

    // 4. Neon Slash Arc VFX (1024x1024 master scaled with ADD blend)
    this.slashArc = scene.add.sprite(0, 0, 'slash-arc')
      .setOrigin(0.12, 0.5)
      .setScale(0.65)
      .setVisible(false)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.add(this.slashArc);

    // 5. Shield Aura
    this.aura = scene.add.circle(0, 15, 140, 0x00ffff, 0.12).setStrokeStyle(4, 0x00ffff, 0.75);
    this.add(this.aura);

    // Properties
    this.isSlashing = false;
    this.isParrying = false;
    this.slashAngle = 0;
    this.slashRadius = 450;
    this.isInvincible = false;
    this.slashCooldown = false;

    // Idle floating animation
    scene.tweens.add({
      targets: this.sprite,
      y: { from: -8, to: 8 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Aura pulse
    scene.tweens.add({
      targets: this.aura,
      scale: { from: 0.94, to: 1.12 },
      alpha: { from: 0.1, to: 0.25 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    scene.add.existing(this);
  }

  slash(angleRad) {
    if (this.slashCooldown) return null;
    this.slashCooldown = true;
    this.isSlashing = true;
    this.slashAngle = angleRad;

    // Swap to Dynamic Slash Pose
    this.sprite.setTexture('player-ronin-slash');
    this.sprite.setScale(0.38);

    // Torso lean towards attack direction
    const facingRight = Math.cos(angleRad) >= 0;
    this.sprite.setFlipX(!facingRight);
    this.sprite.setRotation(Math.cos(angleRad) * 0.18);

    // Lunge forward slightly in direction of slash
    const lungeX = Math.cos(angleRad) * 45;
    const lungeY = Math.sin(angleRad) * 30;

    this.scene.tweens.add({
      targets: this.sprite,
      x: lungeX,
      y: lungeY,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    // Powerful Slash Arc Expansion
    this.slashArc.setRotation(angleRad);
    this.slashArc.setVisible(true);
    this.slashArc.setScale(0.55);
    this.slashArc.setAlpha(1);

    this.scene.tweens.add({
      targets: this.slashArc,
      scale: 1.45,
      alpha: 0,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.slashArc.setVisible(false);
        this.isSlashing = false;
        if (!this.isParrying) {
          this.sprite.setTexture('player-ronin');
          this.sprite.setFlipX(false);
          this.sprite.setRotation(0);
          this.sprite.setPosition(0, 0);
        }
      }
    });

    this.scene.time.delayedCall(120, () => {
      this.slashCooldown = false;
    });

    return {
      angle: angleRad,
      radius: this.slashRadius,
      x: this.x + Math.cos(angleRad) * (this.slashRadius * 0.6),
      y: this.y + Math.sin(angleRad) * (this.slashRadius * 0.6)
    };
  }

  triggerParryStance() {
    this.isParrying = true;
    this.sprite.setTexture('player-ronin-parry');
    this.sprite.setScale(0.38);

    // Barrier flash
    this.aura.setAlpha(0.6).setScale(1.3);

    this.scene.time.delayedCall(250, () => {
      this.isParrying = false;
      if (!this.isSlashing) {
        this.sprite.setTexture('player-ronin');
        this.sprite.setFlipX(false);
        this.sprite.setRotation(0);
        this.aura.setAlpha(0.15).setScale(1);
      }
    });
  }

  takeDamage() {
    if (this.isInvincible) return false;
    this.isInvincible = true;

    // Flash red & flicker
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 0.2, to: 1 },
      duration: 100,
      repeat: 6,
      onComplete: () => {
        this.isInvincible = false;
        this.sprite.setAlpha(1);
      }
    });

    return true;
  }
}
