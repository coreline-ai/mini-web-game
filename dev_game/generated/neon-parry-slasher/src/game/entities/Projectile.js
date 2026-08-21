import Phaser from 'phaser';

export default class Projectile extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, type = 'pulse', targetX, targetY, speed = 420) {
    const textureKey = type === 'drone' ? 'projectile-drone' : 'projectile-pulse';
    super(scene, x, y, textureKey);
    this.scene = scene;
    this.projType = type;
    this.targetX = targetX;
    this.targetY = targetY;
    this.baseSpeed = speed;
    this.currentSpeed = speed;

    this.isParried = false;
    this.isDestroyed = false;
    this.spawnTime = scene.time.now;

    // Ultra-HD Combat Gunship: 100% Solid rendering (NORMAL blend mode)
    if (type === 'drone') {
      this.setScale(0.26);
      this.setBlendMode(Phaser.BlendModes.NORMAL);
      this.setAlpha(1.0);
    } else {
      this.setScale(1.0);
    }

    // Calculate angle towards target
    this.angleRad = Math.atan2(targetY - y, targetX - x);
    this.vx = Math.cos(this.angleRad) * this.currentSpeed;
    this.vy = Math.sin(this.angleRad) * this.currentSpeed;

    if (type === 'drone') {
      // Gunship nose points UP in texture, so +PI/2 aligns with velocity
      this.setRotation(this.angleRad + Math.PI / 2);
    }

    scene.add.existing(this);
  }

  deflect(sourceAngle, isJust = false) {
    if (this.isParried || this.isDestroyed) return;
    this.isParried = true;
    this.setTexture('projectile-parried');
    this.setScale(1.3);

    // Bounce back with high speed
    const bounceAngle = sourceAngle + (Math.random() * 0.4 - 0.2);
    this.currentSpeed = this.baseSpeed * (isJust ? 2.6 : 1.8);
    this.vx = Math.cos(bounceAngle) * this.currentSpeed;
    this.vy = Math.sin(bounceAngle) * this.currentSpeed;

    // Spin rapidly
    this.scene.tweens.add({
      targets: this,
      rotation: this.rotation + Math.PI * 4,
      duration: 600,
      repeat: -1
    });
  }

  update(time, delta) {
    if (this.isDestroyed) return;
    const dt = delta / 1000;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Check bounds in FHD (1080x1920)
    const { width, height } = this.scene.scale;
    if (
      this.x < -150 ||
      this.x > width + 150 ||
      this.y < -150 ||
      this.y > height + 150
    ) {
      this.destroyProjectile();
    }
  }

  destroyProjectile() {
    this.isDestroyed = true;
    this.destroy();
  }
}
