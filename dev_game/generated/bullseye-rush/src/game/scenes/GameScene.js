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
import OscillatingAimSystem from '../systems/OscillatingAimSystem.js';
import RoundManager from '../systems/RoundManager.js';
import { sy } from '../utils/scale.js';

// Bullseye Rush — 순수 타이밍 정밀 사격 (custom-loop).
// dodge 스포너를 쓰지 않는다: 라운드제 과녁 패턴 + 자동 왕복 조준 + 탭 발사.
// 실패는 낙하물 충돌이 아니라 "미스 3회 or 화살 소진" — 시간이 아니라 정확도가 자원이다.
export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }
  create() {
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
    this.aim = new OscillatingAimSystem(this);
    this.rounds = new RoundManager(this);
    this.hudLayout = [
      { id: 'score', obj: this.hud.scoreText },
      { id: 'level', obj: this.hud.levelText },
      { id: 'pause', obj: this.hud.pause.bg },
      { id: 'arrows-left', obj: this.rounds.arrowText },
      { id: 'miss-count', obj: this.rounds.missText },
    ];

    this.physics.add.overlap(this.aim.arrows, this.rounds.targets, (a, t) => this.rounds.onArrowHitTarget(a, t), undefined, this);
    this.physics.add.overlap(this.aim.arrows, this.rounds.stars, (a, s) => this.rounds.onArrowHitStar(a, s), undefined, this);

    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };
    if (SPEC.performance.pauseWhenHidden) document.addEventListener('visibilitychange', this.visibilityHandler);
    AudioManager.playGameplayMusic(this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.rounds.startRound(1);

    // 헤드리스 QA 훅 (씬 종료 후에도 throw 금지 — 옵셔널 체이닝)
    window.__BULLSEYE_DEBUG__ = {
      get: () => ({
        round: this.rounds?.round,
        arrowsLeft: this.rounds?.arrowsLeft,
        misses: this.rounds?.misses,
        combo: this.rounds?.combo,
        hits: this.rounds?.stats?.hits,
        bullseyes: this.rounds?.stats?.bullseyes,
        roundsCleared: this.rounds?.stats?.roundsCleared,
        stars: this.rounds?.stats?.stars,
        fired: this.aim?.stats?.fired,
        aimX: this.aim?.aimX,
        locked: this.aim?.locked,
        targets: (this.rounds?.targets?.children?.entries ?? []).filter((t) => t.active).map((t) => ({ x: t.x, y: t.y, r: t.displayWidth / 2 })),
        score: this.score?.getScore?.() ?? 0,
        over: this.isOver,
        reason: this.rounds?.lastReason,
      }),
    };
  }
  update(time, delta) {
    if (this.isOver) return;
    this.score.elapsedMs += delta; // 생존 점수 없음(정밀 게임) — 시간만 추적
    this.player.y = TUNING.playerY + Math.sin(time * 0.004) * sy(2);
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
