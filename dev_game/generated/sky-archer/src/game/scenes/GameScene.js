import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { TUNING } from '../constants/tuning.js';
import { AudioManager } from '../systems/AudioManager.js';
import ScoreManager from '../systems/ScoreManager.js';
import Spawner from '../systems/Spawner.js';
import HudUI from '../ui/HudUI.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import { applyLogicalCamera, logicalPointer } from '../systems/HiDpi.js';
import StageManager from '../systems/StageManager.js';
import { Juice } from '../systems/Juice.js';
import ArrowSystem from '../systems/ArrowSystem.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }
  preload() {
    // Sky Archer 전용: 화살 프로젝타일 아트 (AI 생성)
    this.load.image('arrow', 'items/arrow.png');
  }
  create() {
    applyLogicalCamera(this);
    this.isOver = false;
    this.targetX = SPEC.canvas.width / 2;
    this.score = new ScoreManager();
    this.spawner = new Spawner(this);
    this.stage = new StageManager(this);
    this.player = this.physics.add.sprite(this.targetX, TUNING.playerY, ASSET_KEYS.player).setDepth(10);
    this.player.body.setAllowGravity(false);
    { const a = (this.player.width / this.player.height) || 1; this.player.setDisplaySize(TUNING.playerSize * a, TUNING.playerSize); }
    if (this.textures.exists(ASSET_KEYS.player) && this.textures.get(ASSET_KEYS.player).frameTotal > 1) {
      if (!this.anims.exists('player_run')) this.anims.create({ key: 'player_run', frames: this.anims.generateFrameNumbers(ASSET_KEYS.player), frameRate: 12, repeat: -1 });
    }
    const playerHitbox = SPEC.player.hitbox || { width: 42, height: 42 };
    const playerRadius = Math.max(4, (Math.min(playerHitbox.width, playerHitbox.height) / 2) * (this.player.height / TUNING.playerSize));
    this.player.body.setCircle(playerRadius, Math.max(0, (this.player.width - playerRadius * 2) / 2), Math.max(0, (this.player.height - playerRadius * 2) / 2));
    this.archery = new ArrowSystem(this);
    this.hud = new HudUI(this, () => this.openPause());
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
  }
  onPointer(pointer) {
    const p = logicalPointer(pointer);
    if (this.isOver || p.y < 82) return;
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
    const params = this.spawner.update(delta, elapsedSec);
    this.stage.setLevel(params.level);
    const dx = this.targetX - this.player.x;
    const maxStep = (SPEC.player.speed || 760) * (delta / 1000);
    const vx = Phaser.Math.Clamp(dx, -maxStep, maxStep);
    this.player.x += vx;
    // 이동 피드백: 진행 방향으로 기울기 + 부드러운 부양 바운스(정지 시 원위치)
    this.player.angle = Phaser.Math.Linear(this.player.angle, Phaser.Math.Clamp(vx * 1.6, -16, 16), 0.18);
    this.player.y = TUNING.playerY + Math.sin(time * 0.006) * 3;
    if (this.anims.exists('player_run')) {
      if (Math.abs(vx) > 0.4) { if (!this.player.anims.isPlaying) this.player.play('player_run'); }
      else if (this.player.anims.isPlaying) { this.player.stop(); this.player.setFrame(0); }
    }
    this.archery.update(delta);
    // 사격 게임 실패 조건: 풍선 표적이 궁수 라인(지면)에 닿으면 게임오버
    const landY = TUNING.playerY + 34;
    this.spawner.hazards.children.each((t) => { if (t.active && t.y > landY) this.onHit(); });
    this.hud.update(this.score.getScore(), params.level);
    publishLayout(this, this.hudLayout);
  }
  onCollect(player, coin) {
    const _cx = coin.x, _cy = coin.y;
    coin.disableBody(true, true);
    this.score.addCollectible();
    Juice.burst(this, _cx, _cy, 0xffe066, 'fx_collect'); Juice.scorePop(this, _cx, _cy, '+' + (SPEC.collectibles?.scoreValue || SPEC.scoring.collectiblePoints || 50));
    AudioManager.playSfx(this, ASSET_KEYS.sfxCollect, 0.55);
  }
  onHit() {
    if (this.isOver) return;
    this.isOver = true;
    Juice.shake(this); Juice.flash(this, 0xff5555); Juice.burst(this, this.player.x, this.player.y, 0xff5555, 'fx_hit');
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
    clearLayout();
  }
}
