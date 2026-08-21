import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { makeTextButton } from '../ui/MobileButton.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import { AudioSynth } from '../systems/AudioSynth.js';
import PlayerRonin from '../entities/PlayerRonin.js';
import Projectile from '../entities/Projectile.js';
import VFXManager from '../managers/VFXManager.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAME);
  }

  create() {
    const { width, height } = SPEC.canvas;

    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalParries = 0;
    this.shields = 3;
    this.gameTime = 0;
    this.isGameOver = false;

    // Sector Trackers
    this.currentSector = 1;

    // Fever System
    this.feverActive = false;
    this.feverTimeLeft = 0;

    // 1. Dynamic Multi-Stage Backgrounds (FHD Native 1080x1920)
    // Stage 1: Midnight Cyan Grid
    this.bgStage1 = this.add.image(width / 2, height / 2, 'bg-cyber-grid')
      .setDisplaySize(width, height)
      .setAlpha(0.72)
      .setDepth(-10);

    // Stage 2: Blood Crimson Sunset
    this.bgStage2 = this.add.image(width / 2, height / 2, 'bg-cyber-crimson')
      .setDisplaySize(width, height)
      .setAlpha(0)
      .setDepth(-9);

    // Stage 3: Emerald Golden Aurora
    this.bgStage3 = this.add.image(width / 2, height / 2, 'bg-cyber-aurora')
      .setDisplaySize(width, height)
      .setAlpha(0)
      .setDepth(-8);

    // 2. VFX Manager
    this.vfx = new VFXManager(this);

    // 3. Player Entity at Optimal Center-Road Anchor in FHD
    this.player = new PlayerRonin(this, width / 2, height * 0.52);

    // 4. Projectiles
    this.projectiles = [];

    // 5. HUD Top Bar (FHD 1080x1920)
    this.hudCard = this.add.rectangle(width / 2, 110, width - 60, 140, 0x061122, 0.8)
      .setStrokeStyle(3, 0x00f7ff, 0.45)
      .setOrigin(0.5);

    this.scoreText = this.add.text(60, 75, 'SCORE: 0', {
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: '42px',
      color: '#00f7ff',
      stroke: '#000000',
      strokeThickness: 6
    });

    this.comboText = this.add.text(60, 130, 'COMBO: x0', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '32px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 5
    });

    // 6. Shield Icons (Glow effect in FHD)
    this.shieldIcons = [];
    for (let i = 0; i < 3; i++) {
      const icon = this.add.sprite(width - 340 + i * 65, 110, 'shield-icon').setScale(0.95);
      this.shieldIcons.push(icon);
    }

    // 7. Fever Bar Container
    this.feverBg = this.add.rectangle(width / 2, 195, width - 90, 14, 0x08172c).setOrigin(0.5);
    this.feverFill = this.add.rectangle(45, 188, 0, 14, 0xff007f).setOrigin(0, 0);

    // 8. Cyber Pause Button
    this.pauseBtn = makeTextButton(this, width - 95, 110, 'Ⅱ', () => {
      AudioSynth.playClick();
      this.scene.launch(SCENES.PAUSE);
      this.scene.pause();
    }, { width: 85, height: 85, fontSize: '38px', theme: 'cyan' });

    // Setup Inputs
    this.setupInputs();

    // Spawner Timer
    this.spawnTimer = 0;

    // Layout Registry for QA Contracts
    this.publish = () => publishLayout(this, [
      { id: 'score-display', obj: this.scoreText },
      { id: 'combo-display', obj: this.comboText },
      { id: 'fever-bar', obj: this.feverBg },
      { id: 'pause', obj: this.pauseBtn.bg }
    ], { requiredIds: ['score-display', 'pause'] });

    this.publish();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, clearLayout);
  }

  setupInputs() {
    this.input.on('pointerdown', (pointer) => {
      if (this.isGameOver) return;
      this.handlePlayerInput(pointer.x, pointer.y);
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE
    });
  }

  handlePlayerInput(targetX, targetY) {
    const px = this.player.x;
    const py = this.player.y;

    // 1. Direct Tap on incoming bullet or drone
    let closestP = null;
    let closestDistToTap = 170;

    for (const p of this.projectiles) {
      if (!p || p.isParried || p.isDestroyed) continue;
      const d = Phaser.Math.Distance.Between(targetX, targetY, p.x, p.y);
      if (d < closestDistToTap) {
        closestDistToTap = d;
        closestP = p;
      }
    }

    let slashAngle = Math.atan2(targetY - py, targetX - px);

    if (closestP) {
      slashAngle = Math.atan2(closestP.y - py, closestP.x - px);
    } else {
      // 2. Auto-Aim Snap to nearest threat
      let bestThreat = null;
      let minAngleDiff = 1.0;

      for (const p of this.projectiles) {
        if (!p || p.isParried || p.isDestroyed) continue;
        const distToPlayer = Phaser.Math.Distance.Between(px, py, p.x, p.y);
        if (distToPlayer <= 540) {
          const angleToP = Math.atan2(p.y - py, p.x - px);
          const diff = Math.abs(Phaser.Math.Angle.Wrap(slashAngle - angleToP));
          if (diff < minAngleDiff) {
            minAngleDiff = diff;
            bestThreat = p;
          }
        }
      }

      if (bestThreat) {
        slashAngle = Math.atan2(bestThreat.y - py, bestThreat.x - px);
      }
    }

    this.executeSlash(slashAngle);
  }

  executeSlash(angle) {
    const slash = this.player.slash(angle);
    if (!slash) return;

    AudioSynth.playSlash();

    const isFever = this.feverActive;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p || p.isParried || p.isDestroyed) continue;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
      const angleToP = Math.atan2(p.y - this.player.y, p.x - this.player.x);
      let angleDiff = Math.abs(Phaser.Math.Angle.Wrap(angle - angleToP));

      const angleTolerance = isFever ? Math.PI : 1.35;
      const maxParryDist = isFever ? 550 : 460;

      if (dist <= maxParryDist && angleDiff <= angleTolerance) {
        const isJust = dist <= 220 || isFever;

        if (isJust) {
          this.player.triggerParryStance();
        }

        p.deflect(angleToP + Math.PI, isJust);
        this.vfx.triggerParryEffect(p.x, p.y, isJust);
        AudioSynth.playParry(isJust);

        const baseScore = isJust ? 300 : 120;
        const scoreEarned = baseScore * Math.max(1, this.combo);
        this.score += scoreEarned;
        this.combo++;
        this.totalParries++;
        if (this.combo > this.maxCombo) this.maxCombo = this.combo;

        const label = isJust ? `JUST PARRY! +${scoreEarned}` : `DEFLECT! +${scoreEarned}`;
        this.vfx.showFloatingText(p.x, p.y - 30, label, isJust ? '#00ffff' : '#ffd700', isJust ? '46px' : '36px');

        if (this.combo >= 10 && !this.feverActive) {
          this.activateFever();
        }
      }
    }

    this.updateHUD();
  }

  activateFever() {
    this.feverActive = true;
    this.feverTimeLeft = 6000;
    AudioSynth.playFever();
    this.vfx.showFloatingText(SPEC.canvas.width / 2, SPEC.canvas.height * 0.4, '🔥 OVERDRIVE FEVER! 🔥', '#ff007f', '52px');
  }

  spawnWave() {
    const px = this.player.x;
    const py = this.player.y;

    const angle = Math.random() * Math.PI * 2;
    const spawnRadius = 660;
    const sx = px + Math.cos(angle) * spawnRadius;
    const sy = py + Math.sin(angle) * spawnRadius;

    let type = 'pulse';
    let speed = 360 + Math.min(this.gameTime * 5.5, 300);

    // Drones spawn starting right away (40% chance)
    if (Math.random() < 0.45) {
      type = 'drone';
      speed += 50;
    }

    const p = new Projectile(this, sx, sy, type, px, py, speed);
    this.projectiles.push(p);

    if (this.gameTime > 20 && Math.random() < 0.35) {
      const angle2 = angle + Math.PI * 0.5;
      const p2 = new Projectile(
        this,
        px + Math.cos(angle2) * spawnRadius,
        py + Math.sin(angle2) * spawnRadius,
        'pulse',
        px,
        py,
        speed
      );
      this.projectiles.push(p2);
    }
  }

  updateBackgroundTransition() {
    const t = this.gameTime;

    // Sector 1 -> Sector 2 (18s ~ 30s)
    if (t < 18) {
      this.bgStage1.setAlpha(0.72);
      this.bgStage2.setAlpha(0);
      this.bgStage3.setAlpha(0);
    } else if (t >= 18 && t < 30) {
      const progress = (t - 18) / 12;
      this.bgStage1.setAlpha(0.72 * (1 - progress));
      this.bgStage2.setAlpha(0.75 * progress);
      this.bgStage3.setAlpha(0);

      if (this.currentSector === 1) {
        this.currentSector = 2;
        this.vfx.showFloatingText(SPEC.canvas.width / 2, SPEC.canvas.height * 0.35, '⚡ SECTOR 2: CRIMSON HAZARD ⚡', '#ff0055', '42px');
      }
    } else if (t >= 30 && t < 45) {
      this.bgStage1.setAlpha(0);
      this.bgStage2.setAlpha(0.75);
      this.bgStage3.setAlpha(0);
    } else if (t >= 45 && t < 58) {
      // Sector 2 -> Sector 3 (45s ~ 58s)
      const progress = (t - 45) / 13;
      this.bgStage2.setAlpha(0.75 * (1 - progress));
      this.bgStage3.setAlpha(0.78 * progress);

      if (this.currentSector === 2) {
        this.currentSector = 3;
        this.vfx.showFloatingText(SPEC.canvas.width / 2, SPEC.canvas.height * 0.35, '🌌 SECTOR 3: AURORA OVERDRIVE 🌌', '#00ffaa', '42px');
      }
    } else {
      this.bgStage1.setAlpha(0);
      this.bgStage2.setAlpha(0);
      this.bgStage3.setAlpha(0.78);
    }
  }

  update(time, delta) {
    if (this.isGameOver) return;

    this.gameTime += delta / 1000;

    // Smooth Background Transition
    this.updateBackgroundTransition();

    if (this.feverActive) {
      this.feverTimeLeft -= delta;
      const progress = Math.max(0, this.feverTimeLeft / 6000);
      this.feverFill.width = (SPEC.canvas.width - 90) * progress;
      if (this.feverTimeLeft <= 0) {
        this.feverActive = false;
        this.feverFill.width = 0;
      }
    }

    this.handleKeyboardInputs();

    this.spawnTimer += delta;
    const currentInterval = Math.max(500, 1300 - this.gameTime * 18);
    if (this.spawnTimer >= currentInterval) {
      this.spawnTimer = 0;
      this.spawnWave();
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p || p.isDestroyed) {
        this.projectiles.splice(i, 1);
        continue;
      }

      p.update(time, delta);

      // Active slash window defense
      if (!p.isParried && !p.isDestroyed && this.player.isSlashing) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
        const angleToP = Math.atan2(p.y - this.player.y, p.x - this.player.x);
        let angleDiff = Math.abs(Phaser.Math.Angle.Wrap(this.player.slashAngle - angleToP));
        if (dist <= 380 && angleDiff <= 1.2) {
          p.deflect(angleToP + Math.PI, false);
          this.vfx.triggerParryEffect(p.x, p.y, false);
          AudioSynth.playParry(false);
          this.score += 120 * Math.max(1, this.combo);
          this.combo++;
          this.totalParries++;
          this.updateHUD();
          continue;
        }
      }

      // Hitbox with player
      if (!p.isParried && !p.isDestroyed) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, p.x, p.y);
        if (dist <= 75) {
          p.destroyProjectile();
          this.handlePlayerHit();
        }
      }
    }
  }

  handleKeyboardInputs() {
    let kx = 0, ky = 0;
    if (this.cursors.left.isDown || this.wasd.left.isDown) kx -= 1;
    if (this.cursors.right.isDown || this.wasd.right.isDown) kx += 1;
    if (this.cursors.up.isDown || this.wasd.up.isDown) ky -= 1;
    if (this.cursors.down.isDown || this.wasd.down.isDown) ky += 1;

    if (kx !== 0 || ky !== 0) {
      const angle = Math.atan2(ky, kx);
      this.executeSlash(angle);
    } else if (Phaser.Input.Keyboard.JustDown(this.wasd.space)) {
      this.executeSlash(this.player.slashAngle || 0);
    }
  }

  handlePlayerHit() {
    if (this.player.isInvincible) return;

    this.player.takeDamage();
    this.vfx.triggerHitEffect(this.player.x, this.player.y);
    AudioSynth.playHit();

    this.shields--;
    this.combo = 0;
    this.feverActive = false;
    this.feverFill.width = 0;
    this.updateHUD();

    if (this.shields <= 0) {
      this.triggerGameOver();
    }
  }

  updateHUD() {
    this.scoreText.setText(`SCORE: ${this.score.toLocaleString()}`);
    this.comboText.setText(`COMBO: x${this.combo}`);

    for (let i = 0; i < 3; i++) {
      if (this.shieldIcons[i]) {
        this.shieldIcons[i].setVisible(i < this.shields);
      }
    }
  }

  triggerGameOver() {
    this.isGameOver = true;
    AudioSynth.stopBGM();

    const best = parseInt(localStorage.getItem('neon_parry_high_score') || '0', 10);
    if (this.score > best) {
      localStorage.setItem('neon_parry_high_score', this.score.toString());
    }

    this.time.delayedCall(600, () => {
      this.scene.start(SCENES.GAME_OVER, {
        score: this.score,
        maxCombo: this.maxCombo,
        totalParries: this.totalParries
      });
    });
  }
}
