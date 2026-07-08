import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { TUNING } from '../constants/tuning.js';
import { AudioManager } from '../systems/AudioManager.js';
import ScoreManager from '../systems/ScoreManager.js';
import HudUI from '../ui/HudUI.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import StageManager from '../systems/StageManager.js';
import { Juice } from '../systems/Juice.js';
import SlingshotAimSystem from '../systems/SlingshotAimSystem.js';
import JungleRoundSystem from '../systems/JungleRoundSystem.js';
import { applyHiDpiCamera } from '../config.js';
import { su } from '../constants/tuning.js';

// Jungle Arc Shot — 포물선 트릭샷 사격 (custom-loop, Spawner 미사용).
// 슬링샷 드래그(각도+파워) → 중력+바람을 받는 화살 → 관통 콤보.
// 실패는 시간·HP가 아니라 화살 경제: 라운드 화살로 전 표적을 못 지우면 끝.
export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }
  preload() {
    if (!this.textures.exists('fruit')) this.load.image('fruit', 'enemies/fruit.png');
    if (!this.textures.exists('balloon')) this.load.image('balloon', 'items/balloon.png');
    if (!this.textures.exists('arrow')) this.load.image('arrow', 'items/arrow.png');
  }
  create() {
    applyHiDpiCamera(this);
    this.isOver = false;
    this.score = new ScoreManager();
    this.stage = new StageManager(this);
    this.player = this.physics.add.sprite(SPEC.canvas.width / 2, TUNING.playerY, ASSET_KEYS.player).setDepth(10);
    this.player.body.setAllowGravity(false);
    { const a = (this.player.width / this.player.height) || 1; this.player.setDisplaySize(TUNING.playerSize * a, TUNING.playerSize); }
    if (this.textures.exists(ASSET_KEYS.player) && this.textures.get(ASSET_KEYS.player).frameTotal > 1) {
      if (!this.anims.exists('player_run')) this.anims.create({ key: 'player_run', frames: this.anims.generateFrameNumbers(ASSET_KEYS.player), frameRate: 16, repeat: 0 });
      this.player.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.player.setFrame(0));
    }

    this.hud = new HudUI(this, () => this.openPause());
    this.aim = new SlingshotAimSystem(this);
    this.rounds = new JungleRoundSystem(this);
    this.hudLayout = [
      { id: 'score', obj: this.hud.scoreText },
      { id: 'level', obj: this.hud.levelText },
      { id: 'pause', obj: this.hud.pause.bg },
      { id: 'arrows-left', obj: this.rounds.arrowText },
      { id: 'wind', obj: this.rounds.windText },
    ];

    this.physics.add.overlap(this.aim.arrows, this.rounds.targets, (a, t) => this.rounds.onArrowHitTarget(a, t), undefined, this);

    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };
    if (SPEC.performance.pauseWhenHidden) document.addEventListener('visibilitychange', this.visibilityHandler);
    AudioManager.playGameplayMusic(this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.rounds.startRound(1);

    // 헤드리스 QA 훅 (씬 종료 후 안전)
    window.__JUNGLE_DEBUG__ = {
      get: () => ({
        round: this.rounds?.round,
        arrowsLeft: this.rounds?.arrowsLeft,
        wind: this.aim?.wind,
        fired: this.aim?.stats?.fired,
        hits: this.rounds?.stats?.hits,
        pierceBest: this.rounds?.stats?.pierceBest,
        roundsCleared: this.rounds?.stats?.roundsCleared,
        locked: this.aim?.locked,
        playerX: this.player?.x, playerY: this.player?.y,
        targets: (this.rounds?.targets?.children?.entries ?? []).filter((t) => t.active).map((t) => ({ x: t.x, y: t.y, kind: t._kind })),
        score: this.score?.getScore?.() ?? 0,
        over: this.isOver,
        reason: this.rounds?.lastReason,
      }),
    };
  }
  update(time, delta) {
    if (this.isOver) return;
    this.score.elapsedMs += delta; // 생존 점수 없음 — 명중/관통/클리어만 점수
    this.player.y = TUNING.playerY + Math.sin(time * 0.004) * su(2);
    this.aim.update(delta);
    this.rounds.update();
    this.hud.update(this.score.getScore(), this.rounds.round);
    publishLayout(this, this.hudLayout);
  }
  onHit() {
    if (this.isOver) return;
    this.isOver = true;
    const win = this.rounds.lastReason === 'allclear';
    if (win) { Juice.flash(this, 0x7bffb0); } else { Juice.shake(this); Juice.flash(this, 0xff5555); }
    AudioManager.playSfx(this, win ? ASSET_KEYS.sfxCollect : ASSET_KEYS.sfxGameOver, 0.6);
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
    this.aim.destroy();
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    clearLayout();
  }
}
