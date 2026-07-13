import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { TUNING } from '../constants/tuning.js';
import { AudioManager } from '../systems/AudioManager.js';
import ScoreManager from '../systems/ScoreManager.js';
import Spawner from '../systems/Spawner.js';
import HudUI from '../ui/HudUI.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import StageManager from '../systems/StageManager.js';
import { Juice } from '../systems/Juice.js';
import ShowerEventSystem from '../systems/ShowerEventSystem.js';
import ShieldSystem from '../systems/ShieldSystem.js';
import { applyLogicalCamera, logicalPointer } from '../systems/HiDpi.js';
import { su } from '../constants/tuning.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }
  create() {
    applyLogicalCamera(this);
    this.isOver = false;
    this.targetX = SPEC.canvas.width / 2;
    this.vx = 0; // 관성 이동 상태
    this.score = new ScoreManager();
    this.spawner = new Spawner(this);
    this.stage = new StageManager(this);
    this.player = this.physics.add.sprite(this.targetX, TUNING.playerY, ASSET_KEYS.player).setDepth(10);
    this.player.body.setAllowGravity(false);
    { const a = (this.player.width / this.player.height) || 1; this.player.setDisplaySize(TUNING.playerSize * a, TUNING.playerSize); }
    // displaySize가 만든 기준 스케일 저장 — 스쿼시&스트레치는 이 배수로만 트윈 (§A: 절대값 setScale 금지)
    this._baseSX = this.player.scaleX; this._baseSY = this.player.scaleY;
    if (this.textures.exists(ASSET_KEYS.player) && this.textures.get(ASSET_KEYS.player).frameTotal > 1) {
      if (!this.anims.exists('player_run')) this.anims.create({ key: 'player_run', frames: this.anims.generateFrameNumbers(ASSET_KEYS.player), frameRate: 12, repeat: -1 });
    }
    const playerHitbox = SPEC.player.hitbox || { width: 42, height: 42 };
    const playerRadius = Math.max(4, (Math.min(playerHitbox.width, playerHitbox.height) / 2) * (this.player.height / TUNING.playerSize));
    this.player.body.setCircle(playerRadius, Math.max(0, (this.player.width - playerRadius * 2) / 2), Math.max(0, (this.player.height - playerRadius * 2) / 2));
    this.hud = new HudUI(this, () => this.openPause());
    this.shower = new ShowerEventSystem(this);
    this.shield = new ShieldSystem(this);
    this.hudLayout = [{ id: 'score', obj: this.hud.scoreText }, { id: 'level', obj: this.hud.levelText }, { id: 'pause', obj: this.hud.pause.bg }];
    this.physics.add.overlap(this.player, this.spawner.hazards, this.onHit, undefined, this);
    this.physics.add.overlap(this.player, this.spawner.collectibles, this.onCollect, undefined, this);
    this.input.on('pointerdown', this.onPointer, this);
    this.input.on('pointermove', this.onPointer, this);
    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };
    if (SPEC.performance.pauseWhenHidden) document.addEventListener('visibilitychange', this.visibilityHandler);
    AudioManager.playGameplayMusic(this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this._trailAcc = 0;

    // 폴리시 §F: 기계 검증 훅 (씬 종료 후 안전)
    window.__METEOR_DEBUG__ = {
      get: () => ({
        over: this.isOver,
        runtimeStrategy: 'native-fhd-canvas',
        logicalCanvas: { width: SPEC.canvas.width, height: SPEC.canvas.height },
        canvasBacking: { width: this.sys.game.canvas.width, height: this.sys.game.canvas.height },
        cameraZoom: this.cameras.main.zoom,
        score: this.score?.getScore?.() ?? 0,
        showerState: this.shower?.state,
        showers: this.shower?.stats?.showers,
        hasShield: this.shield?.hasShield,
        shieldPickups: this.shield?.stats?.pickups,
        shieldBlocks: this.shield?.stats?.blocks,
        vx: Math.round(this.vx),
        playerAlpha: this.player?.alpha,
        playerScaleX: this.player?.scaleX,
        hazards: (this.spawner?.hazards?.children?.entries ?? []).filter((m) => m.active).length,
        shieldItems: (this.shield?.items?.children?.entries ?? []).filter((m) => m.active).map((m) => ({ x: m.x, y: m.y })),
      }),
    };
  }
  onPointer(pointer) {
    const p = logicalPointer(pointer);
    if (this.isOver || p.y < su(82)) return;
    if (SPEC.player.moveMode === 'tap-lane') {
      const lane = Math.floor(p.x / (SPEC.canvas.width / 3));
      this.targetX = (lane + 0.5) * (SPEC.canvas.width / 3);
    } else {
      this.targetX = Phaser.Math.Clamp(p.x, TUNING.safeSide, SPEC.canvas.width - TUNING.safeSide);
    }
  }
  update(time, delta) {
    if (this.isOver) return;
    this.score.update(delta);
    const elapsedSec = this.score.elapsedMs / 1000;
    const params = this.spawner.update(delta, elapsedSec, this.shower.intervalScale());
    this.stage.setLevel(params.level);
    this.shower.update(this.score.elapsedMs, params.level);
    this.shield.update(this.score.elapsedMs);

    // ── 움직임 업그레이드: 관성 이징(목표속도 추종) ──
    const dx = this.targetX - this.player.x;
    const maxV = (SPEC.player.speed || 760) * 1.15;
    const wantV = Phaser.Math.Clamp(dx * 11, -maxV, maxV);      // 거리 비례 목표 속도
    const prevSign = Math.sign(this.vx);
    const smoothing = 1 - Math.exp(-delta / 55);                 // 프레임 독립 이징
    this.vx = Phaser.Math.Linear(this.vx, wantV, smoothing);
    this.player.x = Phaser.Math.Clamp(this.player.x + this.vx * (delta / 1000), TUNING.safeSide, SPEC.canvas.width - TUNING.safeSide);
    // 방향 전환 스쿼시&스트레치 (기준 스케일 배수 트윈 — displaySize 안전)
    if (prevSign !== 0 && Math.sign(wantV) !== prevSign && Math.abs(this.vx) > 140 && !this._squash) {
      this._squash = true;
      this.tweens.add({
        targets: this.player,
        scaleX: this._baseSX * 1.14, scaleY: this._baseSY * 0.88,
        duration: 70, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => { this.player.setScale(this._baseSX, this._baseSY); this._squash = false; },
      });
    }
    // 추진 트레일: 빠르게 이동 중일 때만, 수명 있는 파티클(§K: onComplete destroy)
    this._trailAcc += delta;
    if (Math.abs(this.vx) > 220 && this._trailAcc > 70) {
      this._trailAcc = 0;
      const p = this.add.circle(this.player.x - Math.sign(this.vx) * su(22), this.player.y + su(26), su(5), 0x9fd7ff, 0.7).setDepth(8);
      this.tweens.add({ targets: p, alpha: 0, scale: 0.2, x: p.x - Math.sign(this.vx) * su(16), duration: 260, onComplete: () => p.destroy() });
    }
    // 기울기 + 부양 바운스 + 속도 비례 애니
    this.player.angle = Phaser.Math.Linear(this.player.angle, Phaser.Math.Clamp(this.vx * 0.022, -16, 16), 0.2);
    this.player.y = TUNING.playerY + Math.sin(time * 0.006) * su(3);
    if (this.anims.exists('player_run')) {
      if (Math.abs(this.vx) > 60) {
        if (!this.player.anims.isPlaying) this.player.play('player_run');
        this.player.anims.timeScale = 0.7 + (Math.abs(this.vx) / maxV) * 0.9; // 빠를수록 급한 걸음
      } else if (this.player.anims.isPlaying) { this.player.stop(); this.player.setFrame(0); }
    }
    this.hud.update(this.score.getScore(), params.level);
    publishLayout(this, this.hudLayout);
  }
  onCollect(player, coin) {
    const _cx = coin.x, _cy = coin.y;
    coin.disableBody(true, true);
    this.score.addCollectible();
    Juice.burst(this, _cx, _cy, 0xffe066, ASSET_KEYS.fx.collect); Juice.scorePop(this, _cx, _cy, '+' + (SPEC.collectibles?.scoreValue || SPEC.scoring.collectiblePoints || 50));
    AudioManager.playSfx(this, ASSET_KEYS.sfxCollect, 0.55);
  }
  onHit(_player, meteor) {
    if (this.isOver) return;
    // 실드/무적 흡수 — 유성 하나만 소멸시키고 계속
    if (this.shield.absorbHit()) { if (meteor?.active) meteor.disableBody(true, true); return; }
    this.isOver = true;
    Juice.shake(this); Juice.flash(this, 0xff5555); Juice.burst(this, this.player.x, this.player.y, 0xff5555, ASSET_KEYS.fx.hit);
    AudioManager.playSfx(this, ASSET_KEYS.sfxHit, 0.65);
    AudioManager.playSfx(this, ASSET_KEYS.sfxGameOver, 0.55);
    AudioManager.stopMusic();
    this.physics.pause();
    this.scene.start(SCENES.GAMEOVER, { score: this.score.getScore(), coins: this.score.coins });
  }
  openPause() {
    if (this.isOver || this.scene.isPaused()) return;
    AudioManager.pauseMusic();
    this.hud.setVisible(false);
    this.scene.launch(SCENES.PAUSE);
    this.scene.pause();
  }
  onResume() {
    if (!this.isOver) this.hud.setVisible(true);
  }
  cleanup() {
    this.input.off('pointerdown', this.onPointer, this);
    this.input.off('pointermove', this.onPointer, this);
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.shower?.destroy();
    this.shield?.destroy();
    clearLayout();
  }
}
