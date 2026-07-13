import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from '../systems/AudioManager.js';
import HudUI from '../ui/HudUI.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import StageManager from '../systems/StageManager.js';
import { Juice } from '../systems/Juice.js';
import TargetSystem from '../systems/TargetSystem.js';
import { SHOOTING } from '../config/shootingConfig.js';
import { fontPx, strokePx, su } from '../constants/tuning.js';

const RETICLE_KEY = 'reticle_ui';

function ensureReticleTexture(scene) {
  if (scene.textures.exists(RETICLE_KEY)) return;
  const texSize = Math.round(su(96));
  const center = texSize / 2;
  const outerRadius = texSize * 0.28;
  const innerGap = texSize * 0.22;
  const armInset = texSize * 0.07;
  const armOuter = texSize - armInset;
  const g = scene.make.graphics({ add: false });
  g.lineStyle(strokePx(3), 0x57d8ff, 0.92);
  g.strokeCircle(center, center, outerRadius);
  g.lineStyle(strokePx(2), 0xffffff, 0.85);
  g.lineBetween(center, armInset, center, center - innerGap);
  g.lineBetween(center, center + innerGap, center, armOuter);
  g.lineBetween(armInset, center, center - innerGap, center);
  g.lineBetween(center + innerGap, center, armOuter, center);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(center, center, su(2));
  g.generateTexture(RETICLE_KEY, texSize, texSize);
  g.destroy();
}

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  create() {
    this.isOver = false;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.hits = 0;
    this.perfects = 0;
    this.shots = 0;
    this.timeLeft = SHOOTING.sessionSeconds;
    this.elapsedSeconds = 0;
    this.lastHitAt = 0;
    this.stageIndex = 0;
    this.stageHits = 0;
    this.cleared = false;

    this.stage = new StageManager(this);
    const galleryWidth = SPEC.canvas.width - su(36);
    const galleryHeight = SHOOTING.galleryBottom - SHOOTING.galleryTop;
    const veilX = su(24);
    const veilY = SHOOTING.galleryTop + su(18);
    const veilWidth = SPEC.canvas.width - su(48);
    const veilHeight = galleryHeight - su(34);
    this.gallery = this.add.zone(
      SPEC.canvas.width / 2,
      (SHOOTING.galleryTop + SHOOTING.galleryBottom) / 2,
      galleryWidth,
      galleryHeight,
    );
    this.focusVeil = this.add.graphics().setDepth(4);
    this.focusVeil.fillStyle(0x06131d, 0.34);
    this.focusVeil.fillRoundedRect(veilX, veilY, veilWidth, veilHeight, su(18));
    this.focusVeil.lineStyle(strokePx(2), 0x57d8ff, 0.16);
    this.focusVeil.strokeRoundedRect(veilX, veilY, veilWidth, veilHeight, su(18));
    this.focusVeilBounds = this.add.zone(
      SPEC.canvas.width / 2,
      veilY + veilHeight / 2,
      veilWidth,
      veilHeight,
    );
    this.targetSystem = new TargetSystem(this, ASSET_KEYS.target);

    this.shooter = this.add.circle(SPEC.canvas.width / 2, SHOOTING.muzzleY, su(8), 0x57d8ff, 0.8)
      .setStrokeStyle(strokePx(2), 0xffffff, 0.72)
      .setDepth(12);
    ensureReticleTexture(this);
    this.crosshair = this.add.image(SPEC.canvas.width / 2, SPEC.canvas.height * 0.48, RETICLE_KEY)
      .setDisplaySize(su(56), su(56))
      .setAlpha(0.84)
      .setDepth(15);
    this.feedbackText = this.add.text(SPEC.canvas.width / 2, su(116), '', {
      fontFamily: 'Arial Black, Arial',
      fontSize: fontPx(25),
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: strokePx(5),
    }).setOrigin(0.5).setDepth(22).setVisible(false);

    this.hud = new HudUI(this, () => this.openPause());
    this.layoutItems = [
      { id: 'game-playfield', obj: this.gallery, allowOverlap: true },
      { id: 'game-focus-veil', obj: this.focusVeilBounds, allowOverlap: true },
      { id: 'game-target', obj: this.targetSystem.target.getLayoutObject(), allowOverlap: true },
      { id: 'game-crosshair', obj: this.crosshair, allowOverlap: true },
      { id: 'game-shooter', obj: this.shooter, allowOverlap: true },
      { id: 'hud-panel', obj: this.hud.panel },
      { id: 'hud-score', obj: this.hud.scoreText, allowOverlapWith: ['hud-panel'] },
      { id: 'hud-time', obj: this.hud.timeText, allowOverlapWith: ['hud-panel'] },
      { id: 'hud-stage', obj: this.hud.stageText, allowOverlapWith: ['hud-panel'] },
      { id: 'hud-goal', obj: this.hud.goalText, allowOverlapWith: ['hud-panel'] },
      { id: 'hud-combo', obj: this.hud.comboText, allowOverlapWith: ['hud-panel'] },
      { id: 'pause-button', obj: this.hud.pause.bg },
    ];

    this.input.on('pointerdown', this.onShot, this);
    this.input.on('pointermove', this.onAim, this);
    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };
    if (SPEC.performance.pauseWhenHidden) document.addEventListener('visibilitychange', this.visibilityHandler);
    AudioManager.playGameplayMusic(this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.publishLayout();
    if (typeof window !== 'undefined') {
      window.__TARGET_SHOOTER_QA__ = () => this.onShot({ x: this.targetSystem.target.sprite.x, y: this.targetSystem.target.sprite.y });
      window.__TARGET_SHOOTER_DEBUG__ = {
        get: () => ({
          runtimeStrategy: 'native-fhd-canvas',
          logicalCanvas: { width: SPEC.canvas.width, height: SPEC.canvas.height },
          gameConfig: { width: Number(this.sys.game.config.width), height: Number(this.sys.game.config.height) },
          gameSize: { width: this.scale.gameSize.width, height: this.scale.gameSize.height },
          canvasBacking: { width: this.sys.game.canvas.width, height: this.sys.game.canvas.height },
          cameraZoom: this.cameras.main.zoom,
          activeScene: this.scene.key,
          state: {
            score: Math.floor(this.score),
            hits: this.hits,
            shots: this.shots,
            combo: this.combo,
            stageIndex: this.stageIndex,
            timeLeft: this.timeLeft,
          },
          target: {
            x: this.targetSystem.target.sprite.x,
            y: this.targetSystem.target.sprite.y,
            displayWidth: this.targetSystem.target.sprite.displayWidth,
            displayHeight: this.targetSystem.target.sprite.displayHeight,
            alive: this.targetSystem.target.alive,
            edgeMargin: this.targetSystem.target.edgeMargin,
          },
          gallery: {
            top: SHOOTING.galleryTop,
            bottom: SHOOTING.galleryBottom,
            width: this.gallery.width,
            height: this.gallery.height,
          },
          crosshair: {
            texture: this.crosshair.texture.key,
            displayWidth: this.crosshair.displayWidth,
            displayHeight: this.crosshair.displayHeight,
            sourceWidth: this.textures.get(RETICLE_KEY).getSourceImage().width,
            sourceHeight: this.textures.get(RETICLE_KEY).getSourceImage().height,
          },
          requiredTextures: [ASSET_KEYS.target, ASSET_KEYS.hitBurst, ASSET_KEYS.ui.pause, ASSET_KEYS.backgrounds.stage1, ASSET_KEYS.backgrounds.stage2, ASSET_KEYS.backgrounds.stage3]
            .map((key) => ({
              key,
              exists: this.textures.exists(key),
              width: this.textures.exists(key) ? this.textures.get(key).getSourceImage().width : 0,
              height: this.textures.exists(key) ? this.textures.get(key).getSourceImage().height : 0,
            })),
        }),
      };
    }
  }

  level() {
    const stage = this.currentStage();
    return Math.min(SPEC.difficulty.maxLevel || 14, 1 + Math.floor(this.elapsedSeconds / 6) + Math.floor(this.hits / 5) + (stage.levelBonus || 0));
  }

  currentStage() {
    return SHOOTING.stages[Math.min(this.stageIndex, SHOOTING.stages.length - 1)];
  }

  stageStatus() {
    const stage = this.currentStage();
    return {
      label: `STAGE ${this.stageIndex + 1} ${stage.name}`,
      goal: `GOAL ${Math.min(this.stageHits, stage.goalHits)}/${stage.goalHits}`,
    };
  }

  onAim(pointer) {
    if (this.isOver || pointer.y < SHOOTING.galleryTop - su(24)) return;
    this.crosshair.setPosition(
      Phaser.Math.Clamp(pointer.x, su(24), SPEC.canvas.width - su(24)),
      Phaser.Math.Clamp(pointer.y, SHOOTING.galleryTop, SHOOTING.galleryBottom),
    );
  }

  onShot(pointer) {
    if (this.isOver) return;
    if (pointer.y < SHOOTING.galleryTop || pointer.y > SHOOTING.galleryBottom) return;
    if (!this.targetSystem.target.alive || this.targetSystem.target.sprite.alpha < 0.5) return;
    this.shots += 1;
    this.crosshair.setPosition(pointer.x, pointer.y);
    this.drawShot(pointer.x, pointer.y);
    const shot = this.targetSystem.evaluateShot(pointer.x, pointer.y);
    if (shot.result === 'miss') this.registerMiss(pointer.x, pointer.y);
    else this.registerHit(pointer.x, pointer.y, shot);
    this.publishLayout();
  }

  registerHit(x, y, shot) {
    const now = this.time.now;
    this.combo = now - this.lastHitAt <= SHOOTING.comboWindowMs ? this.combo + 1 : 1;
    this.lastHitAt = now;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.hits += 1;
    this.stageHits += 1;
    if (shot.result === 'perfect') this.perfects += 1;
    const comboBonus = Math.max(0, this.combo - 1) * 18;
    this.score += shot.score + comboBonus;
    this.timeLeft = Math.min(SHOOTING.sessionSeconds, this.timeLeft + SHOOTING.hitBonusSeconds);
    this.showFeedback(shot.result === 'perfect' ? 'PERFECT' : 'HIT', shot.result === 'perfect' ? '#ffd54a' : '#57d8ff', x, y);
    Juice.burst(this, x, y, shot.result === 'perfect' ? 0xffd54a : 0x57d8ff, ASSET_KEYS.hitBurst);
    AudioManager.playSfx(this, ASSET_KEYS.sfxCollect, 0.62);
    const stageCleared = this.stageHits >= this.currentStage().goalHits;
    const roundCleared = stageCleared ? this.advanceStage() : false;
    this.targetSystem.consumeHit(this.level(), this.stageIndex, !roundCleared);
  }

  registerMiss(x, y) {
    this.combo = 0;
    this.score = Math.max(0, this.score - SHOOTING.missScorePenalty);
    this.timeLeft = Math.max(0, this.timeLeft - SHOOTING.missPenaltySeconds);
    this.showFeedback('MISS', '#ff6666', x, y);
    Juice.shake(this, 0.006, 110);
    AudioManager.playSfx(this, ASSET_KEYS.sfxHit, 0.42);
  }

  drawShot(x, y) {
    const g = this.add.graphics().setDepth(18);
    g.lineStyle(strokePx(5), 0x57d8ff, 0.92);
    g.lineBetween(this.shooter.x, SHOOTING.muzzleY, x, y);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x, y, su(8));
    this.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
    this.shooter.setAlpha(1).setScale(1);
    this.tweens.add({ targets: this.shooter, scale: 2.1, alpha: 0.18, yoyo: true, duration: 80, ease: 'Quad.easeOut' });
  }

  showFeedback(label, color, x, y) {
    this.feedbackText.setText(label).setColor(color).setPosition(SPEC.canvas.width / 2, su(116)).setVisible(true).setAlpha(1);
    Juice.scorePop(this, x, y - su(12), label === 'MISS' ? '-TIME' : '+' + (label === 'PERFECT' ? SHOOTING.perfectScore : SHOOTING.hitScore), color);
    this.tweens.killTweensOf(this.feedbackText);
    this.tweens.add({ targets: this.feedbackText, y: su(94), alpha: 0, duration: 650, ease: 'Cubic.easeOut', onComplete: () => this.feedbackText.setVisible(false) });
  }

  advanceStage() {
    const stage = this.currentStage();
    this.score += stage.rewardScore || 0;
    this.timeLeft = Math.min(SHOOTING.sessionSeconds, this.timeLeft + (stage.rewardSeconds || 0));
    if (this.stageIndex >= SHOOTING.stages.length - 1) {
      this.cleared = true;
      this.showStageToast(`ALL CLEAR +${stage.rewardScore || 0}`, '#39e98a');
      this.time.delayedCall(SHOOTING.stageRewardToastMs, () => this.finishRound(true));
      return true;
    }
    this.stageIndex += 1;
    this.stageHits = 0;
    this.stage.setLevel(this.stageIndex * 3 + 1);
    const next = this.currentStage();
    this.showStageToast(`${next.name} +${stage.rewardSeconds || 0}s`, '#39e98a');
    return false;
  }

  showStageToast(label, color) {
    this.feedbackText.setText(label).setColor(color).setPosition(SPEC.canvas.width / 2, su(150)).setVisible(true).setAlpha(1);
    this.tweens.killTweensOf(this.feedbackText);
    this.tweens.add({ targets: this.feedbackText, y: su(126), alpha: 0, duration: SHOOTING.stageRewardToastMs, ease: 'Cubic.easeOut', onComplete: () => this.feedbackText.setVisible(false) });
  }

  update(time, delta) {
    if (this.isOver) return;
    this.timeLeft -= delta / 1000;
    this.elapsedSeconds += delta / 1000;
    this.targetSystem.update(delta);
    this.stage.setLevel(this.level());
    this.hud.update(Math.floor(this.score), this.timeLeft, this.combo, this.stageStatus());
    if (this.timeLeft <= 0) this.finishRound();
    else this.publishLayout();
  }

  finishRound(cleared = false) {
    if (this.isOver) return;
    this.isOver = true;
    AudioManager.playSfx(this, ASSET_KEYS.sfxGameOver, 0.55);
    AudioManager.stopMusic();
    this.scene.start(SCENES.GAMEOVER, {
      score: Math.floor(this.score),
      hits: this.hits,
      shots: this.shots,
      bestCombo: this.bestCombo,
      perfects: this.perfects,
      stage: this.stageIndex + 1,
      cleared: cleared || this.cleared,
    });
  }

  openPause() {
    if (this.isOver || this.scene.isPaused()) return;
    AudioManager.pauseMusic();
    this.hud.setVisible(false);
    this.scene.launch(SCENES.PAUSE);
    this.scene.pause();
  }

  onResume() {
    if (!this.isOver) {
      this.hud.setVisible(true);
      AudioManager.resumeMusic();
    }
  }

  publishLayout() {
    publishLayout(this, this.layoutItems, {
      requiredIds: ['game-playfield', 'game-target', 'game-crosshair', 'game-shooter', 'hud-panel', 'hud-score', 'hud-time', 'hud-stage', 'hud-goal', 'hud-combo', 'pause-button'],
    });
  }

  cleanup() {
    this.input.off('pointerdown', this.onShot, this);
    this.input.off('pointermove', this.onAim, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (typeof window !== 'undefined') {
      delete window.__TARGET_SHOOTER_QA__;
      delete window.__TARGET_SHOOTER_DEBUG__;
    }
    clearLayout();
  }
}
