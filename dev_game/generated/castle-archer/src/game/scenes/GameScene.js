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
import AimShotSystem from '../systems/AimShotSystem.js';
import WaveGateSystem from '../systems/WaveGateSystem.js';
import { applyLogicalCamera } from '../constants/renderScale.js';

// Castle Archer — 성벽 방어 저격. dodge와 달리 궁수는 성벽 중앙에 고정되고,
// 드래그는 이동이 아니라 "조준"이다. 실패는 원힛이 아니라 성문 HP(3) 소진.
export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }
  create() {
    applyLogicalCamera(this);
    this.isOver = false;
    this.currentLevel = 1;
    this.score = new ScoreManager();
    this.spawner = new Spawner(this);
    this.stage = new StageManager(this);
    this.recoilOffset = 0;
    this.createAnimations();
    // 궁수: 성벽 위 중앙 고정
    this.player = this.physics.add.sprite(SPEC.canvas.width / 2, TUNING.playerY, ASSET_KEYS.player).setDepth(10);
    this.player.body.setAllowGravity(false);
    { const a = (this.player.width / this.player.height) || 1; this.player.setDisplaySize(TUNING.playerSize * a, TUNING.playerSize); }
    this.player.play('archer_idle');
    const playerHitbox = SPEC.player.hitbox || { width: 42, height: 42 };
    const playerRadius = Math.max(4, (Math.min(playerHitbox.width, playerHitbox.height) / 2) * (this.player.height / TUNING.playerSize));
    this.player.body.setCircle(playerRadius, Math.max(0, (this.player.width - playerRadius * 2) / 2), Math.max(0, (this.player.height - playerRadius * 2) / 2));

    this.hud = new HudUI(this, () => this.openPause());
    this.aim = new AimShotSystem(this);
    this.waves = new WaveGateSystem(this);
    this.hudLayout = [
      { id: 'score', obj: this.hud.scoreText },
      { id: 'level', obj: this.hud.levelText },
      { id: 'pause', obj: this.hud.pause.bg },
      { id: 'gate-hp', obj: this.waves.hearts[0] },
      { id: 'wave', obj: this.waves.waveText },
    ];

    // 충돌: 화살×몬스터(저격), 화살×물약(사격 회수), 몬스터가 궁수 접촉=성문 피해, 궁수×물약=회수
    this.physics.add.overlap(this.aim.arrows, this.spawner.hazards, (a, m) => this.waves.onArrowHitMonster(a, m), undefined, this);
    this.physics.add.overlap(this.aim.arrows, this.spawner.collectibles, (a, c) => this.waves.onPotionShot(a, c), undefined, this);
    this.physics.add.overlap(this.player, this.spawner.hazards, (_p, m) => this.waves.damageGate(m), undefined, this);
    this.physics.add.overlap(this.player, this.spawner.collectibles, (_p, c) => this.waves.collectPotion(c), undefined, this);

    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };
    if (SPEC.performance.pauseWhenHidden) document.addEventListener('visibilitychange', this.visibilityHandler);
    AudioManager.playGameplayMusic(this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    // 헤드리스 QA 훅
    window.__CASTLE_DEBUG__ = {
      get: () => ({
        fired: this.aim.stats.fired,
        kills: this.waves.stats.kills,
        headshots: this.waves.stats.headshots,
        shieldBreaks: this.waves.stats.shieldBreaks,
        breaches: this.waves.stats.breaches,
        heals: this.waves.stats.heals,
        gateHp: this.waves.hp,
        wave: this.waves.wave,
        score: this.score.getScore(),
        over: this.isOver,
        // 씬 종료(게임오버) 후에도 훅이 throw하지 않도록 가드
        monsters: (this.spawner?.hazards?.children?.entries ?? []).filter((m) => m.active).map((m) => ({ x: m.x, y: m.y, hp: m._hp || 1, type: m._enemyType || 'basic' })),
      }),
    };
  }
  update(time, delta) {
    if (this.isOver) return;
    this.score.update(delta);
    const elapsedSec = this.score.elapsedMs / 1000;
    const params = this.spawner.update(delta, elapsedSec);
    this.currentLevel = params.level;
    this.stage.setLevel(params.level);
    // 궁수는 고정 + 미세한 대기 바운스 + 발사 반동 오프셋.
    // tween이 update 루프에 덮이지 않도록 recoilOffset을 합산한다.
    this.player.y = TUNING.playerY + Math.sin(time * 0.004) * 2 + this.recoilOffset;
    if (!this.aim.aiming) this.player.angle = Phaser.Math.Linear(this.player.angle, 0, 0.12);
    this.aim.update(delta);
    this.waves.update();
    this.hud.update(this.score.getScore(), params.level);
    publishLayout(this, this.hudLayout);
  }
  createAnimations() {
    const make = (key, texture, frames, frameRate, repeat = -1) => {
      if (!this.anims.exists(key) && this.textures.exists(texture)) {
        this.anims.create({ key, frames: frames.map((frame) => ({ key: texture, frame })), frameRate, repeat });
      }
    };
    make('archer_idle', ASSET_KEYS.player, [0, 1, 2, 1], 5, -1);
    make('archer_aim', ASSET_KEYS.player, [2, 3, 4, 3], 8, -1);
    make('archer_shoot', ASSET_KEYS.player, [3, 4, 5, 6, 7, 0], 18, 0);
    make('archer_hit', ASSET_KEYS.player, [6, 7, 6, 0], 12, 0);
    const enemyKeys = [ASSET_KEYS.enemyBasic, ASSET_KEYS.enemyShield, ASSET_KEYS.enemyRunner, ASSET_KEYS.enemyBrute];
    enemyKeys.forEach((key) => make(`${key}_walk`, key, [0, 1, 2, 3], key === ASSET_KEYS.enemyRunner ? 12 : 8, -1));
  }
  onHit() {
    // 성문 함락 → 게임 오버 (WaveGateSystem이 HP 0일 때 호출)
    if (this.isOver) return;
    this.isOver = true;
    this.player.play('archer_hit', true);
    Juice.shake(this); Juice.flash(this, 0xff5555); Juice.burst(this, this.player.x, this.player.y, 0xff5555, ASSET_KEYS.fx.hit);
    AudioManager.playSfx(this, ASSET_KEYS.sfxGameOver, 0.55);
    AudioManager.stopMusic();
    this.physics.pause();
    this.scene.start(SCENES.GAMEOVER, { score: this.score.getScore(), coins: this.score.coins });
  }
  openPause() {
    if (this.isOver || this.scene.isPaused()) return;
    AudioManager.pauseMusic();
    this.hud.setVisible(false);
    this.waves.setVisible(false);
    this.player.setVisible(false);
    this.spawner.setVisibleAll(false);
    this.aim.arrows.children.each((a) => { if (a.active) a.setVisible(false); });
    this.aim.clearAim();
    this.scene.launch(SCENES.PAUSE);
    this.scene.pause();
  }
  onResume() {
    if (!this.isOver) {
      this.hud.setVisible(true);
      this.waves.setVisible(true);
      this.player.setVisible(true);
      this.spawner.setVisibleAll(true);
      this.aim.arrows.children.each((a) => { if (a.active) a.setVisible(true); });
    }
  }
  cleanup() {
    this.aim.destroy();
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    clearLayout();
  }
}
