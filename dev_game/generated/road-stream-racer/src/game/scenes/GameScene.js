import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { TUNING } from '../constants/tuning.js';
import { AudioManager } from '../systems/AudioManager.js';
import RoadSegmentSystem from '../systems/RoadSegmentSystem.js';
import LaneInputSystem from '../systems/LaneInputSystem.js';
import TrafficPatternSystem from '../systems/TrafficPatternSystem.js';
import BoostSystem from '../systems/BoostSystem.js';
import RacingScoreSystem from '../systems/RacingScoreSystem.js';
import NearMissSystem from '../systems/NearMissSystem.js';
import HudUI from '../ui/HudUI.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import { Juice } from '../systems/Juice.js';
import { setArcadeBox } from '../systems/CollisionSystem.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  create() {
    this.isOver = false;
    this.lastDebugUpdate = 0;
    const { width, height } = SPEC.canvas;

    this.road = new RoadSegmentSystem(this);
    this.forestSideOverlay = this.add.image(width / 2, height / 2, ASSET_KEYS.forestSideOverlay)
      .setDisplaySize(width, height)
      .setDepth(2);
    this.score = new RacingScoreSystem();
    this.boost = new BoostSystem(this);
    this.traffic = new TrafficPatternSystem(this);

    const startX = SPEC.racing.road.left + (SPEC.racing.road.right - SPEC.racing.road.left) / 2;
    this.playerShadow = this.add.ellipse(startX, TUNING.playerY + 116, 240, 62, 0x020913, 0.38)
      .setDepth(10);
    this.player = this.physics.add.sprite(startX, TUNING.playerY, ASSET_KEYS.player, 0).setDepth(12);
    this.player.body.setAllowGravity(false);
    this.player.setDisplaySize(TUNING.playerDisplaySize, TUNING.playerDisplaySize);
    setArcadeBox(this.player, TUNING.playerHitbox.width, TUNING.playerHitbox.height, 0, 34);
    if (this.anims.exists('player_drive')) this.player.play('player_drive');

    this.lanes = new LaneInputSystem(this, this.player);
    this.nearMiss = new NearMissSystem(this, this.player, this.score);
    this.boostTrail = this.add.image(this.player.x, this.player.y + 126, ASSET_KEYS.fxBoost)
      .setDepth(11)
      .setOrigin(1, 0.5)
      .setAngle(-90)
      .setDisplaySize(360, 230)
      .setAlpha(0);

    this.hud = new HudUI(this, () => this.openPause(), () => this.goHome());
    this.hudLayout = [
      { id: 'hud-panel', obj: this.hud.panel, allowOverlap: true },
      { id: 'score', obj: this.hud.scoreText },
      { id: 'coins', obj: this.hud.coinText },
      { id: 'speed', obj: this.hud.speedText },
      { id: 'level', obj: this.hud.levelText },
      { id: 'home', obj: this.hud.home.bg },
      { id: 'pause', obj: this.hud.pause.bg },
      { id: 'boost', obj: this.hud.boostText, allowOverlap: true },
    ];

    this.physics.add.overlap(this.player, this.traffic.traffic, this.onCrash, undefined, this);
    this.physics.add.overlap(this.player, this.traffic.items, this.onItem, undefined, this);
    this.events.on('near-miss', this.onNearMiss, this);
    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };
    if (SPEC.performance.pauseWhenHidden) document.addEventListener('visibilitychange', this.visibilityHandler);
    AudioManager.playGameplayMusic(this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  update(time, delta) {
    if (this.isOver) return;
    const level = this.score.getLevel();
    const baseSpeed = this.traffic.speedForLevel(level);
    const speed = baseSpeed * this.boost.multiplier(time);
    const boostActive = this.boost.isActive(time);

    this.road.update(delta, speed);
    this.traffic.update(time, delta, level, speed);
    this.lanes.update(time, delta);
    this.nearMiss.update(this.traffic.traffic);
    this.score.update(delta, speed, boostActive);

    this.player.y = TUNING.playerY + Math.sin(time * 0.0065) * (boostActive ? 5 : 2.5);
    this.playerShadow
      .setPosition(this.player.x, this.player.y + 116)
      .setScale(1 + Math.abs(this.player.angle) / 72, boostActive ? 0.86 : 1)
      .setAlpha(boostActive ? 0.3 : 0.38);
    this.boostTrail
      .setPosition(this.player.x, this.player.y + this.player.displayHeight * 0.48)
      .setAngle(-90);
    this.boostTrail.setAlpha(boostActive ? 0.86 : 0);

    this.hud.update({
      score: this.score.getScore(),
      level,
      coins: this.score.coins,
      speed,
      boostMs: this.boost.remainingMs(time),
    });
    publishLayout(this, this.hudLayout);
    this.publishDebug(time, speed, level, boostActive);
  }

  onItem(player, item) {
    const x = item.x;
    const y = item.y;
    const itemType = item.itemType;
    item.disableBody(true, true);
    if (itemType === 'boost') {
      this.boost.activate(this.time.now);
      Juice.burst(this, x, y, 0x64ffcb, ASSET_KEYS.fxBoost);
      Juice.scorePop(this, x, y, 'BOOST', '#64ffcb');
    } else {
      this.score.addCoin();
      Juice.burst(this, x, y, 0xffe066, ASSET_KEYS.fxCollect);
      Juice.scorePop(this, x, y, '+50', '#ffe066');
    }
    AudioManager.playSfx(this, ASSET_KEYS.sfxCollect, 0.55);
  }

  onNearMiss(x, y) {
    Juice.scorePop(this, x, y, 'NEAR +120', '#aef5ff');
  }

  onCrash() {
    if (this.isOver) return;
    this.isOver = true;
    this.lanes.enabled = false;
    Juice.shake(this, 0.018, 260);
    Juice.flash(this, 0xff5555, 180);
    Juice.burst(this, this.player.x, this.player.y, 0xff5555, ASSET_KEYS.fxHit);
    AudioManager.playSfx(this, ASSET_KEYS.sfxHit, 0.7);
    AudioManager.playSfx(this, ASSET_KEYS.sfxGameOver, 0.55);
    AudioManager.stopMusic();
    this.physics.pause();
    this.scene.start(SCENES.CRASH, {
      score: this.score.getScore(),
      coins: this.score.coins,
      nearMisses: this.score.nearMisses,
      distance: Math.round(this.score.distance),
    });
  }

  openPause() {
    if (this.isOver || this.scene.isPaused()) return;
    AudioManager.pauseMusic();
    this.hud.setVisible(false);
    this.scene.launch(SCENES.PAUSE);
    this.scene.pause();
  }

  goHome() {
    if (this.isOver) return;
    this.isOver = true;
    this.lanes.enabled = false;
    AudioManager.stopMusic();
    this.physics.pause();
    this.scene.stop(SCENES.PAUSE);
    this.scene.start(SCENES.HOME);
  }

  onResume() {
    if (!this.isOver) this.hud.setVisible(true);
  }

  activeGroupCount(group) {
    return group?.children?.entries?.filter((child) => child?.active).length || 0;
  }

  publishDebug(time, speed, level, boostActive) {
    if (time - this.lastDebugUpdate < 180) return;
    this.lastDebugUpdate = time;
    if (typeof window === 'undefined') return;
    const canvas = this.sys.game.canvas;
    window.__ROAD_STREAM_DEBUG__ = {
      runtimeStrategy: SPEC.assetFidelity.runtimeStrategy,
      logicalCanvas: { width: SPEC.canvas.width, height: SPEC.canvas.height },
      canvasBacking: { width: canvas.width, height: canvas.height },
      road: this.road.snapshot(),
      scenery: {
        forestSideOverlay: {
          texture: this.forestSideOverlay.texture.key,
          displayWidth: Math.round(this.forestSideOverlay.displayWidth),
          displayHeight: Math.round(this.forestSideOverlay.displayHeight),
          depth: this.forestSideOverlay.depth,
        },
      },
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        angle: Math.round(this.player.angle),
        lane: this.lanes.lane,
      },
      controls: this.lanes.snapshot(),
      score: this.score.getScore(),
      coins: this.score.coins,
      nearMisses: this.score.nearMisses,
      level,
      speed: Math.round(speed),
      boostActive,
      boostTrail: {
        x: Math.round(this.boostTrail.x),
        y: Math.round(this.boostTrail.y),
        angle: Math.round(this.boostTrail.angle),
        alpha: Number(this.boostTrail.alpha.toFixed(2)),
        displayWidth: Math.round(this.boostTrail.displayWidth),
        displayHeight: Math.round(this.boostTrail.displayHeight),
      },
      trafficActive: this.activeGroupCount(this.traffic.traffic),
      trafficMotionFxVisible: this.traffic.motionFxVisibleCount(),
      itemsActive: this.activeGroupCount(this.traffic.items),
    };
  }

  cleanup() {
    this.events.off('near-miss', this.onNearMiss, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.lanes?.destroy();
    this.traffic?.destroy();
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    clearLayout();
  }
}
