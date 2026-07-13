import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { TUNING } from '../constants/tuning.js';
import { AudioManager } from '../systems/AudioManager.js';
import ScoreManager from '../systems/ScoreManager.js';
import Spawner from '../systems/Spawner.js';
import RoadRenderer from '../systems/RoadRenderer.js';
import HudUI from '../ui/HudUI.js';
import { publishLayout, objectBounds, manualBounds } from '../systems/LayoutRegistry.js';
import { setBodySizeInDisplayPixels } from '../systems/PhysicsBounds.js';

function ms(v) { return Math.max(0, v || 0); }

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }
  create() {
    this.isOver = false;
    this.targetX = SPEC.canvas.width / 2;
    this.effects = { nitroMs: 0, shield: 0, magnetMs: 0, slowMs: 0, invulnMs: 0 };
    this.score = new ScoreManager();
    this.road = new RoadRenderer(this, true);
    this.spawner = new Spawner(this);
    this.player = this.physics.add.image(this.targetX, TUNING.playerY, ASSET_KEYS.player).setDepth(25).setDisplaySize(TUNING.playerDisplay.width, TUNING.playerDisplay.height);
    this.player.body.setAllowGravity(false);
    setBodySizeInDisplayPixels(this.player, SPEC.player.hitbox.width, SPEC.player.hitbox.height);
    this.hud = new HudUI(this, () => this.openPause());
    this.warningText = this.add.text(SPEC.canvas.width / 2, SPEC.canvas.height * 0.27, '⚠ WARNING ⚠', { fontFamily: 'Arial Black, Arial', fontSize: '76px', color: '#ffdf4a', stroke: '#a70000', strokeThickness: 12 }).setOrigin(0.5).setDepth(80).setVisible(false);
    this.comboBurst = this.add.text(SPEC.canvas.width / 2, SPEC.canvas.height * 0.38, '', { fontFamily: 'Arial Black, Arial', fontSize: '58px', color: '#7effff', stroke: '#07121d', strokeThickness: 10 }).setOrigin(0.5).setDepth(80).setVisible(false);
    this.physics.add.overlap(this.player, this.spawner.hazards, this.onHit, undefined, this);
    this.physics.add.overlap(this.player, this.spawner.collectibles, this.onCollect, undefined, this);
    this.input.on('pointerdown', this.onPointer, this);
    this.input.on('pointermove', this.onPointer, this);
    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };
    if (SPEC.performance.pauseWhenHidden) document.addEventListener('visibilitychange', this.visibilityHandler);
    AudioManager.playGameplayMusic(this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.publishLayout(1);
  }

  onPointer(pointer) {
    if (this.isOver || pointer.y < TUNING.safeTop) return;
    this.targetX = Phaser.Math.Clamp(pointer.x, TUNING.roadLeft + 56, TUNING.roadRight - 56);
  }

  update(_time, delta) {
    if (this.isOver) return;
    this.tickEffects(delta);
    this.score.update(delta);
    const elapsedSec = this.score.elapsedMs / 1000;
    const modifiers = {
      nitroActive: this.effects.nitroMs > 0,
      magnetActive: this.effects.magnetMs > 0,
      slowActive: this.effects.slowMs > 0,
    };
    const params = this.spawner.update(delta, elapsedSec, this.player, modifiers);
    const dx = this.targetX - this.player.x;
    const speedBoost = modifiers.nitroActive ? 1.35 : 1;
    const maxStep = (SPEC.player.speed || 1850) * speedBoost * (delta / 1000);
    this.player.x += Phaser.Math.Clamp(dx, -maxStep, maxStep);
    this.player.setTint(this.effects.invulnMs > 0 ? 0x7effff : modifiers.nitroActive ? 0xfff07a : 0xffffff);
    this.road.update(delta, params.speed, modifiers.nitroActive, params.warningActive, params.stage);
    this.processScoringEvents(params);
    this.warningText.setVisible(params.warningText || params.warningActive);
    if (params.warningText || params.warningActive) this.warningText.setScale(1 + Math.sin(this.time.now / 80) * 0.04);
    this.hud.update({ score: this.score.getScore(), bestCombo: this.score.bestCombo, combo: this.score.combo, coins: this.score.coins, avoided: this.score.avoided, stage: params.stage, level: params.level, effects: this.effects, warning: params.warningActive });
    this.publishLayout(params.stage);
  }

  tickEffects(delta) {
    this.effects.nitroMs = ms(this.effects.nitroMs - delta);
    this.effects.magnetMs = ms(this.effects.magnetMs - delta);
    this.effects.slowMs = ms(this.effects.slowMs - delta);
    this.effects.invulnMs = ms(this.effects.invulnMs - delta);
  }

  processScoringEvents(params) {
    for (const hazard of params.passed || []) {
      this.score.addAvoidance(hazard.variant?.scoreAvoid || 5);
      if (this.score.combo > 0 && this.score.combo % 25 === 0) this.showBurst(this.score.combo >= 100 ? 'FANTASTIC!' : 'COMBO x' + this.score.combo);
    }
    for (const hazard of params.nearMisses || []) {
      this.score.addNearMiss();
      this.showBurst('NEAR MISS +30');
      hazard.setTint(0x7effff);
      this.time.delayedCall(160, () => hazard.active && hazard.setTint(0xffffff));
    }
  }

  showBurst(text) {
    this.comboBurst.setText(text).setVisible(true).setAlpha(1).setScale(1);
    this.tweens.killTweensOf(this.comboBurst);
    this.tweens.add({ targets: this.comboBurst, alpha: 0, scale: 1.16, duration: 520, ease: 'Cubic.easeOut', onComplete: () => this.comboBurst.setVisible(false) });
  }

  onCollect(_player, item) {
    const spec = item.item || { id: 'coin', score: SPEC.scoring.collectiblePoints || 50 };
    item.disableBody(true, true);
    this.score.addCollectible(spec.score || 50, spec.id || 'coin');
    if (spec.effect === 'nitro') { this.effects.nitroMs = Math.max(this.effects.nitroMs, spec.durationMs || 5000); this.effects.invulnMs = Math.max(this.effects.invulnMs, 900); this.score.combo += 5; this.showBurst('NITRO!'); }
    if (spec.effect === 'shield') { this.effects.shield = Math.min(2, this.effects.shield + 1); this.showBurst('SHIELD READY'); }
    if (spec.effect === 'magnet') { this.effects.magnetMs = Math.max(this.effects.magnetMs, spec.durationMs || 7000); this.showBurst('MAGNET'); }
    if (spec.effect === 'slow') { this.effects.slowMs = Math.max(this.effects.slowMs, spec.durationMs || 5000); this.showBurst('SLOW'); }
    if (spec.effect === 'repair') { this.effects.shield = Math.max(this.effects.shield, 1); this.score.addBonus(40); this.showBurst('REPAIR + SHIELD'); }
    this.spawnFx(ASSET_KEYS.fxCoinSpark, item.x, item.y, 0.42);
    AudioManager.playSfx(this, ASSET_KEYS.sfxCollect, 0.55);
  }

  onHit(_player, hazard) {
    if (this.isOver) return;
    if (this.effects.invulnMs > 0) {
      hazard.disableBody(true, true);
      this.score.addBonus(15);
      return;
    }
    if (this.effects.shield > 0) {
      this.effects.shield -= 1;
      this.effects.invulnMs = 1150;
      this.score.breakCombo();
      hazard.disableBody(true, true);
      this.showBurst('SHIELD BLOCK!');
      this.spawnFx(ASSET_KEYS.fxCrash, hazard.x, hazard.y, 0.35);
      AudioManager.playSfx(this, ASSET_KEYS.sfxHit, 0.42);
      return;
    }
    this.isOver = true;
    this.score.breakCombo();
    this.spawnFx(ASSET_KEYS.fxCrash, hazard.x, hazard.y, 0.52);
    AudioManager.playSfx(this, ASSET_KEYS.sfxHit, 0.65);
    AudioManager.playSfx(this, ASSET_KEYS.sfxGameOver, 0.55);
    AudioManager.stopMusic();
    this.physics.pause();
    this.player.setTint(0xff334e).setAngle(-18);
    this.scene.start(SCENES.GAMEOVER, { score: this.score.getScore(), coins: this.score.coins, avoided: this.score.avoided, nearMisses: this.score.nearMisses, bestCombo: this.score.bestCombo });
  }

  spawnFx(key, x, y, scale = 0.45) {
    if (!this.textures.exists(key)) return;
    const fx = this.add.image(x, y, key).setScale(scale).setDepth(78).setAlpha(0.95);
    this.tweens.add({ targets: fx, alpha: 0, scale: scale * 1.35, duration: 420, ease: 'Cubic.easeOut', onComplete: () => fx.destroy() });
  }

  publishLayout(stage = 1) {
    publishLayout(this, 'Game', [
      manualBounds(this, 'playfield', TUNING.roadLeft, TUNING.safeTop + 40, TUNING.roadWidth, SPEC.canvas.height - TUNING.safeTop - 260, { allowOverlap: true }),
      objectBounds(this, this.player, 'runner-car'),
      ...this.hud.getLayoutItems(),
    ], ['hud-score', 'hud-stage', 'coin-icon', 'coin-text', 'pause-button', 'playfield', 'runner-car']);
  }

  openPause() {
    if (this.isOver || this.scene.isPaused()) return;
    AudioManager.pauseMusic();
    this.hud.setVisible(false);
    this.scene.launch(SCENES.PAUSE);
    this.scene.pause();
  }

  onResume() {
    if (!this.isOver) { this.hud.setVisible(true); AudioManager.resumeMusic(); }
  }

  cleanup() {
    this.input.off('pointerdown', this.onPointer, this);
    this.input.off('pointermove', this.onPointer, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
  }
}
