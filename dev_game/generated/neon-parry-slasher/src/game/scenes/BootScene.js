import Phaser from 'phaser';
import { SCENES } from '../data/spec.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  preload() {
    // 1. Load Real Ultra-HD Master PNG Image Assets
    this.load.image('bg-cyber-grid', 'images/cyber_grid_bg.png');
    this.load.image('bg-cyber-crimson', 'images/cyber_grid_bg_crimson.png');
    this.load.image('bg-cyber-aurora', 'images/cyber_grid_bg_aurora.png');
    this.load.image('player-ronin', 'images/player_ronin.png');
    this.load.image('player-ronin-slash', 'images/player_ronin_slash.png');
    this.load.image('player-ronin-parry', 'images/player_ronin_parry.png');
    this.load.image('ronin-storyboard', 'images/ronin_storyboard.png');
    this.load.image('projectile-drone', 'images/combat_drone.png');
    this.load.image('slash-arc', 'images/neon_slash_vfx.png');

    // 2. High-DPI Procedural Textures for FHD
    this.createProceduralTextures();
  }

  create() {
    this.scene.start(SCENES.HOME);
  }

  createProceduralTextures() {
    // 1. Projectile Pulse (100x100) - Intense Hot Plasma Sphere
    const orbCanvas = document.createElement('canvas');
    orbCanvas.width = 100;
    orbCanvas.height = 100;
    const orbCtx = orbCanvas.getContext('2d');

    const grad = orbCtx.createRadialGradient(50, 50, 4, 50, 50, 46);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, '#ff33aa');
    grad.addColorStop(0.65, '#cc0055');
    grad.addColorStop(1, 'rgba(204, 0, 85, 0)');

    orbCtx.fillStyle = grad;
    orbCtx.beginPath();
    orbCtx.arc(50, 50, 46, 0, Math.PI * 2);
    orbCtx.fill();

    orbCtx.strokeStyle = 'rgba(255, 60, 160, 0.9)';
    orbCtx.lineWidth = 4;
    orbCtx.beginPath();
    orbCtx.arc(50, 50, 32, 0, Math.PI * 2);
    orbCtx.stroke();

    this.textures.addCanvas('projectile-pulse', orbCanvas);

    // 2. Parried Bullet (100x100) - Radiant Cyan/Gold Blast
    const parryCanvas = document.createElement('canvas');
    parryCanvas.width = 100;
    parryCanvas.height = 100;
    const parryCtx = parryCanvas.getContext('2d');

    const parryGrad = parryCtx.createRadialGradient(50, 50, 4, 50, 50, 46);
    parryGrad.addColorStop(0, '#ffffff');
    parryGrad.addColorStop(0.25, '#00ffff');
    parryGrad.addColorStop(0.7, '#0088ff');
    parryGrad.addColorStop(1, 'rgba(0, 136, 255, 0)');

    parryCtx.fillStyle = parryGrad;
    parryCtx.beginPath();
    parryCtx.arc(50, 50, 46, 0, Math.PI * 2);
    parryCtx.fill();
    this.textures.addCanvas('projectile-parried', parryCanvas);

    // 3. Spark Particle (48x48)
    const spCanvas = document.createElement('canvas');
    spCanvas.width = 48;
    spCanvas.height = 48;
    const spCtx = spCanvas.getContext('2d');
    spCtx.fillStyle = '#ffffff';
    spCtx.shadowColor = '#00ffff';
    spCtx.shadowBlur = 12;
    spCtx.beginPath();
    spCtx.arc(24, 24, 12, 0, Math.PI * 2);
    spCtx.fill();
    this.textures.addCanvas('particle-spark', spCanvas);

    // 4. Shockwave Ring (360x360)
    const ringCanvas = document.createElement('canvas');
    ringCanvas.width = 360;
    ringCanvas.height = 360;
    const ringCtx = ringCanvas.getContext('2d');
    ringCtx.strokeStyle = '#00ffff';
    ringCtx.lineWidth = 10;
    ringCtx.shadowColor = '#00ffff';
    ringCtx.shadowBlur = 24;
    ringCtx.beginPath();
    ringCtx.arc(180, 180, 155, 0, Math.PI * 2);
    ringCtx.stroke();
    this.textures.addCanvas('shockwave-ring', ringCanvas);

    // 5. Shield Icon (80x80) - Glowing Diamond Shield
    const shCanvas = document.createElement('canvas');
    shCanvas.width = 80;
    shCanvas.height = 80;
    const shCtx = shCanvas.getContext('2d');
    shCtx.fillStyle = '#00f7ff';
    shCtx.shadowColor = '#00f7ff';
    shCtx.shadowBlur = 16;
    shCtx.beginPath();
    shCtx.moveTo(40, 10);
    shCtx.lineTo(66, 22);
    shCtx.lineTo(60, 52);
    shCtx.lineTo(40, 70);
    shCtx.lineTo(20, 52);
    shCtx.lineTo(14, 22);
    shCtx.closePath();
    shCtx.fill();
    this.textures.addCanvas('shield-icon', shCanvas);
  }
}
