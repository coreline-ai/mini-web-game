import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { TUNING } from '../constants/tuning.js';
import { AudioManager } from '../systems/AudioManager.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import DayNightSystem from '../systems/DayNightSystem.js';
import HybridAimController from '../systems/HybridAimController.js';
import CombatFeedbackSystem from '../systems/CombatFeedbackSystem.js';
import NarrativeRadioSystem from '../systems/NarrativeRadioSystem.js';
import EnemyWaveDirector from '../systems/EnemyWaveDirector.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import HudUI from '../ui/HudUI.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  create() {
    this.isOver = false;
    this.hasCleanedUp = false;
    this.runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.stats = { elapsed: 0, kills: 0, elites: 0, bosses: 0, cores: 0, score: 0, hp: 100, maxHp: 100 };
    this.invulnerableUntil = 0;
    this.layoutClock = 0;
    this.forcedElapsed = null;

    this.dayNight = new DayNightSystem(this, (phase, day, index) => this.onPhaseChanged(phase, day, index));
    this.coreAura = this.add.circle(SPEC.canvas.width / 2, SPEC.canvas.height * 0.795, 225, 0xe5b966, 0.045).setStrokeStyle(12, 0xe5b966, 0.16).setDepth(-4);
    this.tweens.add({ targets: this.coreAura, scale: 1.13, alpha: 0.1, yoyo: true, repeat: -1, duration: 1450, ease: 'Sine.easeInOut' });

    this.player = this.physics.add.sprite(TUNING.playerStartX, TUNING.playerStartY, ASSET_KEYS.player, 0).setDepth(28).setDisplaySize(TUNING.playerDisplay, TUNING.playerDisplay);
    this.player.body.setAllowGravity(false);
    this.player.body.setCircle(126, 193, 193);
    this.player.play('player_move');
    this.player.anims.timeScale = 0.9;
    this.weaponModel = this.add.image(this.player.x, this.player.y - 20, ASSET_KEYS.weapons, 0).setDisplaySize(100, 150).setDepth(30);

    this.feedback = new CombatFeedbackSystem(this);
    this.narrative = new NarrativeRadioSystem(this);
    this.director = new EnemyWaveDirector(this, {
      onPlayerHit: (damage, enemy) => this.damagePlayer(damage, enemy),
      onEnemyShoot: (enemy, dir, damage) => this.spawnEnemyShot(enemy, dir, damage),
      onEnemyDamaged: (enemy, damage, critical) => this.feedback.damageText(enemy.x, enemy.y - enemy.displayHeight * 0.16, damage, critical),
      onEnemyKilled: (info) => this.onEnemyKilled(info),
      onBossSpawn: (boss) => this.onBossSpawn(boss),
      onBossHealth: (ratio) => this.hud?.setBoss(ratio > 0, ratio),
      onBossCharge: () => this.hud?.showToast('타이탄 돌진 · 하단을 드래그해 회피', '#ff9f88'),
    });
    this.weapon = new WeaponSystem(this, this.player, this.director, this.feedback, {
      onSelected: (id) => {
        this.weaponModel.setFrame(['gatling', 'scatter', 'arc', 'rocket', 'rail'].indexOf(id));
        if (id === 'arc') this.hud?.showToast('연쇄 전격 · 첫 적에서 주변 5개체로 번지는 번개', '#71e7ff');
      },
      onUnavailable: (id, missing) => this.hud?.showToast(`충전 부족 · ${Math.ceil(missing)}% 필요`, '#ffb49d'),
      onOverheat: () => this.hud?.showToast('기관포 과열 · 충전 무기로 교대하라', '#ff9b7e'),
      onCooled: () => this.hud?.showToast('기관포 냉각 완료', '#9de8d6'),
      onFired: (id) => this.onWeaponFired(id),
    });
    this.controller = new HybridAimController(this);
    this.hud = new HudUI(this, () => this.openPause(), (id) => this.weapon.select(id));

    this.createCombatTextures();
    this.enemyShots = this.physics.add.group({ maxSize: 70, allowGravity: false });
    this.pickups = this.physics.add.group({ maxSize: 50, allowGravity: false });
    this.physics.add.overlap(this.player, this.enemyShots, this.onEnemyShotHit, undefined, this);
    this.physics.add.overlap(this.player, this.pickups, this.onPickup, undefined, this);

    this.narrative.set('HELIOS // DAY 01', '05:42 — 헬리오 코어 재가동. 북쪽 접근로의 감염체를 차단하라.');
    AudioManager.playGameplayMusic(this);
    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.installDebugApi();
  }

  createCombatTextures() {
    if (!this.textures.exists(ASSET_KEYS.infectedShot)) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x72e0c4, 0.25).fillCircle(28, 28, 26);
      g.fillStyle(0x091615, 1).fillCircle(28, 28, 15);
      g.lineStyle(5, 0x72e0c4, 0.9).strokeCircle(28, 28, 19);
      g.generateTexture(ASSET_KEYS.infectedShot, 56, 56); g.destroy();
    }
    if (!this.textures.exists(ASSET_KEYS.pickup)) {
      const g = this.make.graphics({ add: false });
      g.fillStyle(0x8df7d6, 0.18).fillCircle(42, 42, 40);
      g.fillStyle(0x173f3a, 1).fillTriangle(42, 8, 72, 42, 42, 76).fillTriangle(42, 8, 12, 42, 42, 76);
      g.lineStyle(5, 0xc8fff0, 0.9).strokeCircle(42, 42, 30);
      g.generateTexture(ASSET_KEYS.pickup, 84, 84); g.destroy();
    }
  }

  update(_time, rawDelta) {
    if (this.isOver) return;
    const delta = Math.min(rawDelta, 50);
    this.stats.elapsed = this.forcedElapsed == null ? this.stats.elapsed + delta / 1000 : this.forcedElapsed += delta / 1000;
    const phaseState = this.dayNight.update(this.stats.elapsed);
    const wave = this.director.update(delta, this.stats.elapsed, phaseState.index, phaseState.day, this.player);

    const manualAim = this.controller.getManualAim();
    const nearest = this.director.findNearest(this.player.x, this.player.y, 1750);
    const autoAim = nearest ? new Phaser.Math.Vector2(nearest.x - this.player.x, nearest.y - this.player.y).normalize() : new Phaser.Math.Vector2(0, -1);
    const aim = manualAim || autoAim;
    const move = this.controller.getMoveVector();
    const moveSpeed = 790;
    this.player.x = Phaser.Math.Clamp(this.player.x + move.x * moveSpeed * delta / 1000, TUNING.combatLeft, TUNING.combatRight);
    this.player.y = Phaser.Math.Clamp(this.player.y + move.y * moveSpeed * delta / 1000, TUNING.combatTop, TUNING.combatBottom);

    const tap = this.controller.consumeTapVector();
    if (tap) this.dodgeToward(tap);
    // The runner artwork is a rear view that must always read as facing north.
    // Rotate only the independent weapon layer toward the target; rotating the
    // whole body made the hero look sideways or even upside down in combat.
    const weaponRotation = Math.atan2(aim.y, aim.x) + Math.PI / 2;
    this.player.setRotation(0);
    this.weaponModel.setPosition(this.player.x + aim.x * 20, this.player.y + aim.y * 20).setRotation(weaponRotation);
    this.player.anims.timeScale = move.lengthSq() > 0.02 ? 1.5 : 0.82;
    this.weapon.update(delta, aim, !!manualAim || !!nearest);

    this.updateEnemyShots(delta);
    this.updatePickups(delta);
    this.narrative.update(delta);
    this.stats.score = Math.floor(this.stats.elapsed * 12 + this.stats.kills * 22 + this.stats.elites * 90 + this.stats.bosses * 900);
    this.hud.update(this.stats, phaseState, this.weapon.state());
    this.layoutClock += delta;
    if (this.layoutClock > 240) { this.layoutClock = 0; this.publishLayout(); }
    this.publishQaState(phaseState, wave);
  }

  dodgeToward(point) {
    const dir = new Phaser.Math.Vector2(point.x - this.player.x, point.y - this.player.y);
    if (dir.lengthSq() < 1) dir.set(0, -1); else dir.normalize();
    this.player.x = Phaser.Math.Clamp(this.player.x + dir.x * 205, TUNING.combatLeft, TUNING.combatRight);
    this.player.y = Phaser.Math.Clamp(this.player.y + dir.y * 205, TUNING.combatTop, TUNING.combatBottom);
    this.invulnerableUntil = Math.max(this.invulnerableUntil, this.time.now + 260);
    this.tweens.add({ targets: this.player, alpha: 0.38, yoyo: true, duration: 90, repeat: 1 });
  }

  onWeaponFired(id) {
    const scale = id === 'gatling' ? 0.94 : id === 'rail' ? 0.78 : 0.86;
    this.tweens.killTweensOf(this.weaponModel);
    this.weaponModel.setScale((100 / 256) * scale, (150 / 384) * scale);
    this.tweens.add({ targets: this.weaponModel, scaleX: 100 / 256, scaleY: 150 / 384, duration: id === 'gatling' ? 70 : 190, ease: 'Back.easeOut' });
  }

  spawnEnemyShot(enemy, dir, damage) {
    const shot = this.enemyShots.get(enemy.x, enemy.y, ASSET_KEYS.infectedShot);
    if (!shot) return;
    shot.enableBody(true, enemy.x, enemy.y, true, true).setTexture(ASSET_KEYS.infectedShot).setDisplaySize(62, 62).setDepth(25).setAlpha(1);
    shot.body.setAllowGravity(false); shot.body.setCircle(24, 4, 4);
    shot.setVelocity(dir.x * 360, dir.y * 360).setData({ damage, created: this.time.now });
    AudioManager.playSfx(this, ASSET_KEYS.sfxZombie, 0.18, Phaser.Math.FloatBetween(0.88, 1.08), 450);
  }

  onEnemyShotHit(_player, shot) {
    if (!shot.active) return;
    const damage = shot.getData('damage') || 8;
    shot.disableBody(true, true);
    this.damagePlayer(damage, shot);
  }

  damagePlayer(amount, source) {
    if (this.isOver || this.time.now < this.invulnerableUntil) return;
    this.invulnerableUntil = this.time.now + 270;
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.player.setTintFill(0xffa38f);
    this.time.delayedCall(95, () => { if (this.player?.active) this.player.clearTint(); });
    const dir = new Phaser.Math.Vector2(this.player.x - (source?.x || this.player.x), this.player.y - (source?.y || this.player.y));
    if (dir.lengthSq() > 0) { dir.normalize(); this.player.x = Phaser.Math.Clamp(this.player.x + dir.x * 52, TUNING.combatLeft, TUNING.combatRight); this.player.y = Phaser.Math.Clamp(this.player.y + dir.y * 52, TUNING.combatTop, TUNING.combatBottom); }
    this.feedback.infectedBurst(this.player.x, this.player.y, 0.75);
    this.cameras.main.shake(150, 0.009); this.cameras.main.flash(100, 70, 10, 8, false);
    AudioManager.playSfx(this, ASSET_KEYS.sfxHit, 0.46, 1, 170);
    if (this.stats.hp <= 0) this.endRun();
  }

  onEnemyKilled(info) {
    this.stats.kills += 1;
    if (info.elite) this.stats.elites += 1;
    if (info.boss) this.stats.bosses += 1;
    this.weapon.onKill(info);
    this.feedback.infectedBurst(info.x, info.y, info.boss ? 2.5 : info.elite ? 1.45 : 0.86);
    if (Math.random() < (info.boss ? 1 : info.elite ? 0.62 : 0.2)) this.spawnPickup(info.x, info.y, info.boss ? 14 : info.elite ? 4 : 1);
    if (info.boss) {
      this.narrative.set('HELIOS // 타이탄 제거', '헬리오 파편 회수. 하지만 북쪽에서 더 큰 군집 파형이 깨어난다.', '#8df7d6');
      this.hud.showToast('DAY 돌파 · 다음 변이 단계 진입', '#8df7d6');
    }
  }

  spawnPickup(x, y, value = 1) {
    const pickup = this.pickups.get(x, y, ASSET_KEYS.pickup);
    if (!pickup) return;
    pickup.enableBody(true, x, y, true, true).setTexture(ASSET_KEYS.pickup).setDisplaySize(value > 4 ? 106 : 78, value > 4 ? 106 : 78).setDepth(23).setAlpha(1).setData({ value, created: this.time.now, phase: Math.random() * 6 });
    pickup.body.setAllowGravity(false); pickup.body.setCircle(30, 12, 12); pickup.setVelocity(Phaser.Math.Between(-30, 30), Phaser.Math.Between(-20, 25));
  }

  onPickup(_player, pickup) {
    if (!pickup.active) return;
    const value = pickup.getData('value') || 1; this.stats.cores += value;
    pickup.disableBody(true, true); this.feedback.impact(this.player.x, this.player.y, 0x8df7d6);
    AudioManager.playSfx(this, ASSET_KEYS.sfxCollect, 0.42, Phaser.Math.FloatBetween(0.96, 1.08), 80);
  }

  updatePickups() {
    for (const pickup of this.pickups.getChildren()) {
      if (!pickup.active) continue;
      const d = Phaser.Math.Distance.Between(pickup.x, pickup.y, this.player.x, this.player.y);
      if (d < 350) {
        const dir = new Phaser.Math.Vector2(this.player.x - pickup.x, this.player.y - pickup.y).normalize();
        pickup.setVelocity(dir.x * 420, dir.y * 420);
      }
      pickup.angle += 2.4;
      if (this.time.now - pickup.getData('created') > 9000) pickup.disableBody(true, true);
    }
  }

  updateEnemyShots() {
    for (const shot of this.enemyShots.getChildren()) {
      if (!shot.active) continue;
      shot.rotation += 0.08;
      if (this.time.now - shot.getData('created') > 6500 || shot.x < -120 || shot.x > 1560 || shot.y < -120 || shot.y > 2680) shot.disableBody(true, true);
    }
  }

  onPhaseChanged(phase, day, index) {
    this.narrative?.set(`HELIOS // DAY ${String(day).padStart(2, '0')} · ${phase.name}`, phase.radio, phase.color);
    if (index >= 2) this.director?.forceSurge(index === 4 ? 14000 : 7500);
    if (index === 4) this.hud?.showToast('블러드 문 · 폭주 군집 접근', '#ff8a78');
  }

  onBossSpawn() {
    this.hud?.setBoss(true, 1);
    this.narrative?.set('HELIOS // 초대형 변이 경보', '타이탄의 흉부에 헬리오 파편이 박혀 있다. 돌진을 피하고 파편을 파괴하라.', '#ff8c78');
    this.hud?.showToast('TITAN 진입 · 흉부 파편 집중 사격', '#ff927e');
  }

  endRun() {
    if (this.isOver) return;
    this.isOver = true;
    AudioManager.stopMusic(); AudioManager.playSfx(this, ASSET_KEYS.sfxGameOver, 0.62);
    this.physics.pause();
    const reward = Math.max(8, Math.floor(this.stats.cores + this.stats.kills * 0.72 + this.stats.elites * 4 + this.stats.bosses * 25 + this.stats.elapsed / 12));
    this.scene.start(SCENES.GAMEOVER, { ...this.stats, reward, runId: this.runId, day: Math.floor(this.stats.elapsed / 180) + 1 });
  }

  openPause() {
    if (this.isOver || this.scene.isPaused()) return;
    AudioManager.pauseMusic(); this.hud.setVisible(false);
    this.scene.launch(SCENES.PAUSE); this.scene.pause();
  }
  onResume() { if (!this.isOver) { this.hud.setVisible(true); AudioManager.resumeMusic(); } }

  publishLayout() {
    const entries = [...this.hud.entries(), ...this.narrative.entries(), { id: 'playfield', obj: this.coreAura, allowOverlap: true }];
    publishLayout(this, entries, { requiredIds: ['hud-top-panel', 'hud-day', 'hud-kills', 'hud-health', 'pause', 'weapon-gatling', 'weapon-scatter', 'weapon-arc', 'weapon-rocket', 'weapon-rail', 'playfield'] });
  }

  publishQaState(phaseState, wave) {
    if (typeof window === 'undefined') return;
    window.__GAME_QA_STATE__ = {
      scene: SCENES.GAME, elapsed: this.stats.elapsed, day: phaseState.day, phase: phaseState.phase.id,
      hp: this.stats.hp, kills: this.stats.kills, cores: this.stats.cores, activeEnemies: wave.active,
      bossActive: !!wave.boss, player: { x: this.player.x, y: this.player.y }, weapon: this.weapon.state(),
    };
  }

  installDebugApi() {
    if (typeof window === 'undefined') return;
    window.__GAME_DEBUG__ = {
      spawn: (type = 'walker', count = 1) => { for (let i = 0; i < count; i += 1) this.director.spawn(type); },
      boss: () => this.director.spawn('titan', SPEC.canvas.width / 2, 260, Math.floor(this.stats.elapsed / 180) + 1),
      surge: () => this.director.forceSurge(20000),
      damage: (amount = 10) => this.damagePlayer(amount, { x: this.player.x, y: this.player.y - 100 }),
      charge: () => { Object.keys(this.weapon.energy).forEach((id) => { if (id !== 'gatling') this.weapon.energy[id] = 100; }); },
      setTime: (seconds) => { this.forcedElapsed = Math.max(0, Number(seconds) || 0); this.stats.elapsed = this.forcedElapsed; },
      killAll: () => this.director.activeEnemies().forEach((enemy) => this.director.damage(enemy, 99999, enemy.x, enemy.y, 0, true)),
    };
  }

  cleanup() {
    if (this.hasCleanedUp) return;
    this.hasCleanedUp = true;
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.controller?.cleanup(); this.weapon?.destroy(); this.director?.destroy(); this.narrative?.destroy();
    if (this.enemyShots?.children) this.enemyShots.clear(true, true);
    if (this.pickups?.children) this.pickups.clear(true, true);
    if (typeof window !== 'undefined') { delete window.__GAME_DEBUG__; window.__GAME_QA_STATE__ = { scene: '', inactive: true }; }
    clearLayout();
  }
}
