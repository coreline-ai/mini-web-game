import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { GAME_RULES } from '../config/gameRules.js';
import { AudioManager } from '../systems/AudioManager.js';
import AimSystem from '../systems/AimSystem.js';
import MissionDirector from '../systems/MissionDirector.js';
import WeaponSystem from '../systems/WeaponSystem.js';
import GunshipHud from '../ui/GunshipHud.js';
import WeaponButton from '../ui/WeaponButton.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import EnemySoldier from '../entities/EnemySoldier.js';
import AttackHelicopterBoss from '../entities/AttackHelicopterBoss.js';
import { configureLogicalScene, RENDER_SCALE } from '../systems/LogicalViewport.js';
import CombatTutorial from '../ui/CombatTutorial.js';
import { SaveData } from '../systems/SaveData.js';

const TARGET_KEY = {
  rifleman: ASSET_KEYS.rifleman, rocketman: ASSET_KEYS.rocketman,
  drone: ASSET_KEYS.drone, apc: ASSET_KEYS.apc, boss: ASSET_KEYS.boss,
  civilian: ASSET_KEYS.civilians,
};

export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  create() {
    configureLogicalScene(this);
    this.ended = false;
    this.elapsed = 0;
    this.score = 0;
    this.combo = 1;
    this.civilianStrikes = 0;
    this.convoyHp = GAME_RULES.convoyHp;
    this.convoyWarningLevel = 0;
    this.targets = [];
    this.firstHostileCueShown = false;
    this.tracerCursor = 0;
    this.tracerPool = Array.from({ length: 16 }, () => ({
      active: false,
      line: this.add.graphics().setVisible(false).setDepth(52),
      impact: this.add.image(0, 0, ASSET_KEYS.fxImpact).setVisible(false).setDisplaySize(26, 26).setDepth(53),
      timer: null,
    }));
    this.phase = -1;
    this.background = null;
    // Phaser reuses Scene instances after shutdown. Never let create() touch
    // display objects destroyed by the previous run.
    this.phaseLabel = null;
    this.coach = null;
    this.coachTimer = null;
    this.coachHintsStarted = false;
    this.setMissionPhase(0, true);

    this.add.rectangle(0, GAME_RULES.playfield.bottom, SPEC.canvas.width, SPEC.canvas.height - GAME_RULES.playfield.bottom, 0x020b12, 0.96).setOrigin(0).setDepth(95);
    this.add.rectangle(8, 712, 374, 124, 0x071925, 0.94).setOrigin(0).setDepth(96).setStrokeStyle(1.5, 0x2e829b, 0.8);
    this.add.text(195, 719, '무기 조작', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial', fontSize: '10px', color: '#6aa8b8' }).setOrigin(0.5).setDepth(106);

    this.convoy = this.add.image(195, 625, ASSET_KEYS.rescueTruck).setDisplaySize(98, 98).setDepth(20);
    this.convoyMarker = this.makeMarker('friendly', this.convoy.x, this.convoy.y, 42);
    // Keep the firing platform visible in the combat scene. It sits behind
    // targets/HUD so every projectile has a readable physical source.
    this.gunshipSprite = this.add.image(195, 214, ASSET_KEYS.heroGunship)
      .setDisplaySize(150, 100).setDepth(12).setAlpha(0.96);
    this.gunshipBaseY = 214;
    this.gunMuzzleFx = this.add.graphics().setDepth(57).setVisible(false);
    this.gunMuzzleFxTimer = null;
    this.missileLaunchFx = this.add.graphics().setDepth(57).setVisible(false);
    this.missileLaunchFxTimer = null;
    this.aim = new AimSystem(this);
    this.hud = new GunshipHud(this, () => this.openPause(), () => this.openHelp());
    this.gunButton = new WeaponButton(this, 104, 782, 158, 82, '30MM 기관포', 0x43dfff, {
      down: () => { AudioManager.unlock(this); this.weapon.setGunHeld(true); }, up: () => this.weapon.setGunHeld(false),
    });
    this.missileButton = new WeaponButton(this, 286, 782, 158, 82, '유도 미사일', 0xffb43b, {
      down: () => { AudioManager.unlock(this); this.weapon.beginMissile(); }, up: () => this.weapon.endMissile(),
    });
    this.weapon = new WeaponSystem(this, this.aim, {
      getTargetAt: (x, y, hostileOnly) => this.getTargetAt(x, y, hostileOnly),
      damageTarget: (target, damage, weapon) => this.damageTarget(target, damage, weapon),
      drawTracer: (x, y) => this.drawTracer(x, y),
      explosion: (x, y) => this.explosion(x, y),
      registerMiss: () => this.registerMiss(),
      warn: (text, color) => this.warn(text, color),
      setGunAudio: (active) => active ? AudioManager.startGunLoop(this) : AudioManager.stopGunLoop(),
      onGunOverheat: () => AudioManager.playSfx(this, ASSET_KEYS.sfxGunOverheat, 0.48),
      onGunReady: () => AudioManager.playSfx(this, ASSET_KEYS.sfxGunReady, 0.38),
      onMissileLockTick: () => AudioManager.playSfx(this, ASSET_KEYS.sfxMissileLockTick, 0.22),
      onMissileLockComplete: () => AudioManager.playSfx(this, ASSET_KEYS.sfxMissileLockComplete, 0.4),
      onMissileLaunch: (target) => {
        AudioManager.playSfx(this, ASSET_KEYS.sfxMissileLaunch, 0.78);
        this.showMissileLaunchFx(this.getMissileLaunchPoint(target));
        this.tutorial?.onMissileLaunch();
      },
    });
    this.director = new MissionDirector(this, (entry) => this.spawnTarget(entry));
    this.phaseLabel = this.add.text(195, 127, 'APPROACH · IDENTIFY TARGETS', { fontFamily: 'Arial Black, Arial', fontSize: '12px', color: '#d9f8ff', backgroundColor: '#04131ddd', padding: { x: 12, y: 6 } }).setOrigin(0.5).setDepth(92);
    this.coach = this.add.text(195, 675, '전장 드래그 = 조준 · 아래 버튼 길게 = 공격', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial', fontSize: '11px', color: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(92);
    const qaMode = typeof location !== 'undefined' && /qaHoldLoading|skipTutorial/.test(location.search || '');
    const forceTraining = typeof location !== 'undefined' && /training=1/.test(location.search || '');
    this.tutorial = new CombatTutorial(this, !qaMode && (forceTraining || !SaveData.getTutorialDone()));
    if (!this.tutorial.active) this.startCoachHints();

    this.missionStartedAt = this.time.now;
    this.visibilityHandler = () => { if (document.hidden && !this.ended) this.openPause(); };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.resumeHandler = () => { this.missionStartedAt += this.time.now - (this.pausedAt || this.time.now); this.hud.setVisible(true); };
    this.events.on(Phaser.Scenes.Events.RESUME, this.resumeHandler);
    AudioManager.playGameplayMusic(this);
    this.publishQa();
    this.installDebugAdapter();
  }

  update(time, delta) {
    if (this.ended) return;
    const safeDelta = Math.min(delta, 50);
    const missionLive = !this.tutorial?.active;
    if (missionLive) {
      this.elapsed += safeDelta / 1000;
      this.director.update(this.elapsed);
    }
    this.weapon.update(safeDelta);
    this.updateTargets(safeDelta, time);
    this.tutorial?.update();
    this.convoy.y = 625 + Math.sin(time * 0.0025) * 4;
    if (this.gunshipSprite?.active) this.gunshipSprite.y = this.gunshipBaseY + Math.sin(time * 0.0018) * 2.5;
    this.convoyMarker.setPosition(this.convoy.x, this.convoy.y);
    const remaining = GAME_RULES.missionDuration - this.elapsed;
    this.hud.update({ score: this.score, combo: this.combo, remaining, convoyHp: this.convoyHp, convoyMax: GAME_RULES.convoyHp, heat: this.weapon.heat, overheated: this.weapon.overheated });
    this.gunButton.setState(this.weapon.overheated ? '냉각 중' : `열 ${Math.round(this.weapon.heat)}%`, this.weapon.overheated ? '#ff785f' : '#9dd7e9');
    const lock = this.weapon.missileHeld ? Math.round(this.weapon.lockProgress / GAME_RULES.missile.lockMs * 100) : null;
    this.missileButton.setState(lock !== null ? `잠금 ${lock}%` : `탄약 ${this.weapon.ammo}`, lock >= 100 ? '#65f7ff' : '#ffd27a');
    this.missileButton.setEnabled(this.weapon.ammo > 0 && this.weapon.cooldown <= 0);
    publishLayout(this, [...this.hud.layoutEntries(), { id: 'gun', obj: this.gunButton.label }, { id: 'missile', obj: this.missileButton.label }]);
    this.publishQa();
    if (this.elapsed >= SPEC.session.hardTimeoutSeconds) this.finish(false, 'TARGET ESCAPED');
  }

  setMissionPhase(phase, immediate = false) {
    if (phase === this.phase) return;
    this.phase = phase;
    const keys = [ASSET_KEYS.bgApproach, ASSET_KEYS.bgApproach, ASSET_KEYS.bgConflict, ASSET_KEYS.bgBridge];
    const labels = [
      'APPROACH · IDENTIFY TARGETS',
      'ESCORT · PROTECT THE CONVOY',
      'ARMOR BREAK · DISABLE THE APC',
      'EXTRACTION · BOSS INTERCEPT',
    ];
    const next = this.add.image(195, 422, keys[phase]).setDisplaySize(390, 844).setDepth(-30).setAlpha(immediate ? 1 : 0);
    if (this.background && !immediate) {
      const previous = this.background;
      this.tweens.add({ targets: next, alpha: 1, duration: 900, onComplete: () => previous.destroy() });
    }
    this.background = next;
    if (this.phaseLabel) { this.phaseLabel.setText(labels[phase]); this.warn(labels[phase], '#8fefff'); }
  }

  spawnTarget(entry) {
    const cfg = { ...GAME_RULES.targets[entry.type] };
    const sprite = this.add.image(entry.x, entry.y, TARGET_KEY[entry.type]).setDisplaySize(cfg.display, cfg.display).setDepth(entry.type === 'boss' ? 28 : 22);
    const side = entry.type === 'civilian' ? 'civilian' : 'hostile';
    const target = {
      id: `${entry.type}-${Math.round(entry.at * 10)}`, type: entry.type, side, sprite,
      hp: cfg.hp, maxHp: cfg.hp, radius: cfg.radius, score: cfg.score, active: true,
      spawnedAt: this.elapsed, expiresAt: entry.type === 'boss' ? 999 : this.elapsed + (entry.type === 'apc' ? 19 : entry.type === 'civilian' ? 9 : 13),
      nextAttack: this.elapsed * 1000 + (cfg.attackMs || 999999), cfg,
      originX: entry.x, marker: this.makeMarker(side, entry.x, entry.y, cfg.radius),
      parts: entry.type === 'apc' ? { turret: 72, engine: 84, wheels: 84 } : entry.type === 'boss' ? { rotor: 180, pod: 180 } : null,
      exposed: true, aiming: false, attackDisabled: false,
    };
    if (entry.type === 'rifleman' || entry.type === 'rocketman') target.controller = new EnemySoldier(this, target);
    if (entry.type === 'boss') target.controller = new AttackHelicopterBoss(this, target);
    this.targets.push(target);
    if (target.side === 'hostile' && entry.at >= 0 && !this.firstHostileCueShown) {
      this.firstHostileCueShown = true;
      this.warn('HOSTILE CONTACT · 빨간 마름모 = 적', '#ff6c5f');
    }
    if (entry.type === 'boss') this.warn('ATTACK HELICOPTER INBOUND', '#ff6c5f');
  }

  getGunMuzzle() {
    const ship = this.gunshipSprite;
    return { x: (ship?.x || 195) + 48, y: (ship?.y || 214) + 31 };
  }

  getMissileLaunchPoint(target) {
    const ship = this.gunshipSprite;
    const centerX = ship?.x || 195;
    const side = (target?.sprite?.x || this.aim?.x || centerX) < centerX ? -1 : 1;
    return { x: centerX + side * 42, y: (ship?.y || 214) + 23 };
  }

  startCoachHints() {
    if (this.coachHintsStarted || !this.coach) return;
    this.coachHintsStarted = true;
    this.coach.setVisible(true).setText('전장 드래그 = 조준 · 아래 버튼 길게 = 공격');
    // One-shot and non-blocking: do not queue coach follow-ups while the
    // interactive tutorial is active or when a scene instance is reused.
    this.coachTimer = this.time.delayedCall(7000, () => {
      if (!this.ended && !this.tutorial?.active && this.coach?.active) {
        this.coach.setText('빨간 마름모 = 적 · 흰 원 = 민간인 사격 금지');
      }
    });
  }

  makeMarker(side, x, y, radius) {
    const g = this.add.graphics().setDepth(78).setPosition(x, y);
    if (side === 'hostile') {
      g.lineStyle(2, 0xff4b45, 0.9).strokePoints([{ x: 0, y: -radius - 9 }, { x: radius + 9, y: 0 }, { x: 0, y: radius + 9 }, { x: -radius - 9, y: 0 }], true);
    } else if (side === 'friendly') {
      g.lineStyle(2, 0x44e3ff, 0.9).strokeRoundedRect(-radius - 8, -radius - 8, (radius + 8) * 2, (radius + 8) * 2, 12);
      g.fillStyle(0x44e3ff, 0.9).fillTriangle(0, -radius - 14, -6, -radius - 5, 6, -radius - 5);
    } else {
      g.lineStyle(2, 0xffffff, 0.9).strokeCircle(0, 0, radius + 8);
      g.lineBetween(-6, -radius - 12, 6, -radius - 12); g.lineBetween(0, -radius - 18, 0, -radius - 6);
    }
    return g;
  }

  updateTargets(delta, time) {
    for (const target of this.targets) {
      if (!target.active) continue;
      if (target.type === 'drone') target.sprite.x = target.originX + Math.sin(time * 0.003 + target.spawnedAt) * 42;
      if (target.type === 'apc') {
        const moving = target.parts.wheels > 0;
        const engineFactor = target.parts.engine > 0 ? 1 : 0.4;
        if (moving) target.sprite.y += delta * 0.008 * engineFactor;
      }
      if (target.type === 'civilian') target.sprite.y += delta * 0.012;
      const controllerAttack = target.controller?.update(delta, time);
      target.marker.setPosition(target.sprite.x, target.sprite.y);
      if (controllerAttack) {
        this.damageConvoy(controllerAttack.damage);
        this.enemyAttackFx(target, controllerAttack);
      } else if (!target.controller && target.side === 'hostile' && !target.attackDisabled && this.elapsed * 1000 >= target.nextAttack) {
        target.nextAttack += target.cfg.attackMs;
        this.damageConvoy(target.cfg.convoyDamage);
        this.enemyAttackFx(target);
      }
      if (this.elapsed >= target.expiresAt) this.removeTarget(target, false);
    }
  }

  getTargetAt(x, y, hostileOnly) {
    let best = null; let bestDist = Infinity;
    for (const target of this.targets) {
      if (!target.active || target.exposed === false || (hostileOnly && target.side !== 'hostile')) continue;
      const d = Phaser.Math.Distance.Between(x, y, target.sprite.x, target.sprite.y);
      if (d <= target.radius + 14 && d < bestDist) { best = target; bestDist = d; }
    }
    if (!hostileOnly) {
      const d = Phaser.Math.Distance.Between(x, y, this.convoy.x, this.convoy.y);
      if (d < 42 && d < bestDist) return { active: true, side: 'friendly', type: 'convoy', sprite: this.convoy, radius: 42 };
    }
    return best;
  }

  damageTarget(target, damage, weapon) {
    if (!target?.active) return;
    if (target.side === 'civilian' || target.side === 'friendly') {
      this.civilianStrikes += 1;
      this.score = Math.max(0, this.score - 500);
      this.combo = 1;
      this.warn(target.side === 'civilian' ? 'CIVILIAN HIT' : 'FRIENDLY FIRE', '#ff554f');
      AudioManager.playSfx(this, ASSET_KEYS.sfxCivilianWarning, 0.48);
      if (target.side === 'civilian') this.removeTarget(target, false);
      else this.damageConvoy(90);
      if (this.civilianStrikes >= GAME_RULES.civilianStrikeLimit) this.finish(false, 'CIVILIAN CASUALTIES');
      return;
    }
    let applied = damage;
    if (target.parts) applied = this.damagePart(target, damage, weapon);
    target.hp -= applied;
    this.score += 10;
    target.sprite.setTintFill(0xffffff);
    AudioManager.playSfx(this, ASSET_KEYS.sfxImpactMetal, 0.14, { throttleMs: 85 });
    this.time.delayedCall(45, () => target.sprite?.clearTint());
    if (target.hp <= 0) {
      this.score += target.score * this.combo;
      this.combo = Math.min(8, this.combo + 1);
      this.explosion(target.sprite.x, target.sprite.y, target.type === 'boss' ? 1.8 : 1);
      const boss = target.type === 'boss';
      this.removeTarget(target, true);
      if (boss) this.finish(true, 'EXTRACTION SECURED');
    }
  }

  damagePart(target, damage, weapon) {
    const dx = this.aim.x - target.sprite.x;
    const dy = this.aim.y - target.sprite.y;
    let part = null;
    if (target.type === 'apc') part = dy < -12 ? 'turret' : dx < 0 ? 'engine' : 'wheels';
    if (target.type === 'boss') part = dy < -18 ? 'rotor' : dx > 18 ? 'pod' : null;
    if (!part || target.parts[part] <= 0) return damage;
    target.parts[part] -= damage;
    if (target.parts[part] <= 0) {
      this.score += 250;
      this.warn(`${part.toUpperCase()} DESTROYED`, '#ffd06a');
      if (part === 'turret') target.attackDisabled = true;
      if (target.type === 'boss' && part === 'rotor') {
        target.controller?.stun(1200);
        return damage * 2;
      }
    }
    return weapon === 'missile' ? damage : damage * 0.7;
  }

  damageConvoy(amount) {
    this.convoyHp = Math.max(0, this.convoyHp - amount);
    this.convoy.setTintFill(0xff554f);
    AudioManager.playSfx(this, ASSET_KEYS.sfxConvoyHit, 0.2);
    this.time.delayedCall(80, () => this.convoy?.clearTint());
    const warningLevel = this.convoyHp <= 200 ? 3 : this.convoyHp <= 400 ? 2 : this.convoyHp <= 700 ? 1 : 0;
    if (warningLevel > this.convoyWarningLevel) {
      this.convoyWarningLevel = warningLevel;
      this.warn(warningLevel >= 3 ? 'CONVOY CRITICAL' : 'CONVOY TAKING FIRE', warningLevel >= 3 ? '#ff554f' : '#ffb43b');
    }
    if (this.convoyHp <= 0) this.finish(false, 'CONVOY DESTROYED');
  }

  removeTarget(target, destroyed) {
    if (!target?.active) return;
    target.active = false;
    target.controller?.destroy?.();
    target.marker.destroy();
    if (destroyed) this.tweens.add({ targets: target.sprite, alpha: 0, scale: target.sprite.scale * 1.2, duration: 240, onComplete: () => target.sprite.destroy() });
    else target.sprite.destroy();
  }

  drawTracer(x, y) {
    const slot = this.tracerPool[this.tracerCursor++ % this.tracerPool.length];
    slot.timer?.remove(false);
    slot.active = true;
    const origin = this.getGunMuzzle();
    const dx = x - origin.x;
    const dy = y - origin.y;
    const distance = Math.hypot(dx, dy) || 1;
    const ux = dx / distance;
    const uy = dy / distance;
    const streaks = [{ at: 0.22, length: 16 }, { at: 0.53, length: 20 }, { at: 0.84, length: 14 }];
    slot.line.clear().setVisible(true).setAlpha(1);
    slot.line.lineStyle(3, 0xff9d25, 0.96);
    for (const streak of streaks) {
      const end = Math.max(8, distance * streak.at);
      const start = Math.max(0, end - streak.length);
      slot.line.lineBetween(origin.x + ux * start, origin.y + uy * start, origin.x + ux * end, origin.y + uy * end);
    }
    slot.line.lineStyle(1, 0xfff4c0, 0.96);
    const coreEnd = Math.max(8, distance * 0.84);
    slot.line.lineBetween(origin.x + ux * Math.max(0, coreEnd - 8), origin.y + uy * Math.max(0, coreEnd - 8), origin.x + ux * coreEnd, origin.y + uy * coreEnd);
    slot.impact.setPosition(x, y).setVisible(true).setAlpha(1).setDisplaySize(20, 20);
    this.showGunMuzzleFx(origin, x, y);
    this.aim.view.y -= 1.5;
    this.cameras.main.shake(32, 0.0007);
    this.tweens.add({ targets: this.aim.view, y: this.aim.y, duration: 55, ease: 'Quad.easeOut' });
    slot.timer = this.time.delayedCall(90, () => {
      slot.active = false; slot.line.clear().setVisible(false); slot.impact.setVisible(false);
    });
  }

  showGunMuzzleFx(origin, targetX, targetY) {
    if (!this.gunMuzzleFx) return;
    const angle = Math.atan2(targetY - origin.y, targetX - origin.x);
    const spread = 0.38;
    const length = 18;
    const p1 = { x: origin.x + Math.cos(angle - spread) * length, y: origin.y + Math.sin(angle - spread) * length };
    const p2 = { x: origin.x + Math.cos(angle + spread) * length, y: origin.y + Math.sin(angle + spread) * length };
    this.gunMuzzleFx.clear().setVisible(true).fillStyle(0xff8a1e, 0.96).fillTriangle(origin.x, origin.y, p1.x, p1.y, p2.x, p2.y);
    this.gunMuzzleFx.fillStyle(0xfff4bd, 1).fillCircle(origin.x, origin.y, 4);
    this.gunMuzzleFxTimer?.remove(false);
    this.gunMuzzleFxTimer = this.time.delayedCall(70, () => this.gunMuzzleFx?.clear().setVisible(false));
  }

  showMissileLaunchFx(origin) {
    if (!this.missileLaunchFx) return;
    this.missileLaunchFx.clear().setVisible(true).lineStyle(3, 0x69eaff, 0.9).strokeCircle(origin.x, origin.y, 12);
    this.missileLaunchFx.fillStyle(0xffffff, 0.95).fillCircle(origin.x, origin.y, 4);
    this.missileLaunchFxTimer?.remove(false);
    this.missileLaunchFxTimer = this.time.delayedCall(150, () => this.missileLaunchFx?.clear().setVisible(false));
  }

  enemyAttackFx(target, attack = {}) {
    const g = this.add.graphics().setDepth(48);
    const color = attack.missile || attack.rocket ? 0xffb43b : 0xff543f;
    g.lineStyle(attack.missile || attack.rocket ? 4 : 2, color, 0.82).lineBetween(target.sprite.x, target.sprite.y, this.convoy.x, this.convoy.y);
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  explosion(x, y, scale = 1) {
    AudioManager.playSfx(this, scale > 1.2 ? ASSET_KEYS.sfxExplosionLarge : ASSET_KEYS.sfxExplosionSmall, scale > 1.2 ? 0.48 : 0.25);
    const ring = this.add.image(x, y, ASSET_KEYS.fxExplosion).setDisplaySize(54 * scale, 54 * scale).setDepth(60);
    const core = this.add.circle(x, y, 5, 0xffffff, 1).setDepth(61);
    this.tweens.add({ targets: ring, scale: ring.scaleX * 1.9, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    this.tweens.add({ targets: core, scale: 3.2 * scale, alpha: 0, duration: 190, onComplete: () => core.destroy() });
    this.cameras.main.shake(100, 0.003 * scale);
  }

  registerMiss() { if (this.weapon.shots % 3 === 0) this.combo = Math.max(1, this.combo - 1); }
  onBossPhase(phase) {
    this.cameras.main.flash(120, phase === 3 ? 110 : 60, 18, 12);
    AudioManager.playSfx(this, ASSET_KEYS.sfxBossPhase, 0.42);
    AudioManager.startBossLayer(this);
  }
  warn(text, color = '#ffffff') {
    const label = this.add.text(195, 164, text, { fontFamily: 'Arial Black, Arial', fontSize: '14px', color, stroke: '#000', strokeThickness: 4, backgroundColor: '#07131ecc', padding: { x: 10, y: 6 } }).setOrigin(0.5).setDepth(110);
    this.tweens.add({ targets: label, y: 150, alpha: 0, delay: 650, duration: 380, onComplete: () => label.destroy() });
  }

  finish(victory, reason) {
    if (this.ended) return;
    this.ended = true;
    this.weapon.stop();
    AudioManager.stopMusic();
    AudioManager.playSfx(this, victory ? ASSET_KEYS.sfxMissionClear : ASSET_KEYS.sfxMissionFailed, 0.52);
    const data = { score: Math.round(this.score), reason, accuracy: this.weapon.accuracy, convoyHp: this.convoyHp, strikes: this.civilianStrikes };
    this.time.delayedCall(450, () => this.scene.start(victory ? SCENES.RESULT : SCENES.GAMEOVER, data));
  }

  openPause() {
    if (this.ended) return;
    this.weapon.stop(); this.hud.setVisible(false); this.pausedAt = this.time.now;
    AudioManager.pauseMusic(); this.scene.launch(SCENES.PAUSE); this.scene.pause();
  }

  openHelp() {
    if (this.ended) return;
    this.weapon.stop(); this.hud.setVisible(false); this.pausedAt = this.time.now;
    AudioManager.pauseMusic(); this.scene.launch(SCENES.BRIEFING, { returnToGame: true }); this.scene.pause();
  }

  publishQa() {
    if (typeof window === 'undefined') return;
    const state = {
      scene: this.scene.key, phase: this.phase, elapsed: Number(this.elapsed.toFixed(2)),
      score: Math.round(this.score), combo: this.combo, heat: Number(this.weapon?.heat?.toFixed(1) || 0),
      overheated: Boolean(this.weapon?.overheated), ammo: this.weapon?.ammo ?? 4,
      convoyHp: this.convoyHp, civilianStrikes: this.civilianStrikes,
      activeTargets: this.targets.filter((t) => t.active).map((t) => ({ id: t.id, type: t.type, hp: Math.round(t.hp) })),
      accuracy: this.weapon?.accuracy ?? 100,
      bossPhase: this.targets.find((target) => target.active && target.type === 'boss')?.controller?.phase || 0,
      tutorialActive: Boolean(this.tutorial?.active),
      tutorialStep: this.tutorial?.active ? this.tutorial.step : -1,
      missionLive: !this.tutorial?.active,
      renderScale: RENDER_SCALE,
      sceneStackSize: this.scene.manager.getScenes(true).length,
      activeBgmInstances: AudioManager.activeCount('music'),
      rotorInstances: AudioManager.activeCount('rotor'),
      bossLayerInstances: AudioManager.activeCount('boss'),
      gunLoopInstances: AudioManager.activeCount('gun'),
      activeTracerCount: this.tracerPool.filter((slot) => slot.active).length,
      activeMissileCount: this.weapon?.missilePool?.filter((missile) => missile.active).length || 0,
      tracerPoolSize: this.tracerPool.length,
      missilePoolSize: this.weapon?.missilePool?.length || 0,
      timerCount: this.time.getAllEvents?.().length || 0,
      tweenCount: this.tweens.getTweens?.().length || 0,
    };
    window.__SKYBREAK_QA__ = state;
    window.__GAME_QA__ = { getState: () => window.__SKYBREAK_QA__ };
  }

  installDebugAdapter() {
    if (typeof window === 'undefined') return;
    const scene = this;
    this.debugAdapter = {
      get: () => window.__SKYBREAK_QA__,
      clearTargets() { scene.targets.filter((target) => target.active).forEach((target) => scene.removeTarget(target, false)); },
      spawn(type, x = 195, y = 260) {
        scene.spawnTarget({ at: scene.elapsed, type, x, y });
        return scene.targets.at(-1).id;
      },
      setAim(x, y) { scene.aim.x = x; scene.aim.y = y; scene.aim.view.setPosition(x, y); },
      target(id) { return scene.targets.find((target) => target.id === id); },
      advanceController(id, delta) { return this.target(id)?.controller?.update(delta, scene.time.now); },
      setTargetHp(id, hp) { const target = this.target(id); if (target) target.hp = hp; },
      setHeat(heat, overheated = heat >= 100) { scene.weapon.heat = heat; scene.weapon.overheated = overheated; },
      advanceWeapon(delta) { scene.weapon.update(delta); scene.publishQa(); },
      forceBossPhase(phase) {
        let boss = scene.targets.find((target) => target.active && target.type === 'boss');
        if (!boss) { this.clearTargets(); this.spawn('boss', 195, 240); boss = scene.targets.at(-1); }
        boss.hp = phase === 1 ? boss.maxHp : phase === 2 ? boss.maxHp * 0.65 : boss.maxHp * 0.3;
        boss.controller.update(0, scene.time.now); scene.publishQa();
      },
      forceWin() {
        let boss = scene.targets.find((target) => target.active && target.type === 'boss');
        if (!boss) { this.clearTargets(); this.spawn('boss', 195, 240); boss = scene.targets.at(-1); }
        boss.hp = 1; scene.damageTarget(boss, 20, 'gun');
      },
      forceLose(reason = 'CONVOY DESTROYED') {
        if (reason === 'CIVILIAN CASUALTIES') scene.civilianStrikes = 3;
        scene.finish(false, reason);
      },
    };
    window.__SKYBREAK_DEBUG__ = this.debugAdapter;
  }

  cleanup() {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.events.off(Phaser.Scenes.Events.RESUME, this.resumeHandler);
    // Scene shutdown owns display-list destruction. Only detach listeners and
    // cancel timers here; destroying render objects twice can leave the Canvas
    // renderer holding a null image source during rapid scene transitions.
    this.tutorial?.destroy();
    this.coachTimer?.remove(false);
    this.coachTimer = null;
    this.gunMuzzleFxTimer?.remove(false);
    this.missileLaunchFxTimer?.remove(false);
    this.gunMuzzleFxTimer = null;
    this.missileLaunchFxTimer = null;
    this.aim?.destroy(false); this.weapon?.destroy(false);
    for (const slot of this.tracerPool || []) slot.timer?.remove(false);
    this.tracerPool.length = 0;
    this.targets.length = 0;
    clearLayout();
    if (typeof window !== 'undefined' && window.__SKYBREAK_DEBUG__ === this.debugAdapter) delete window.__SKYBREAK_DEBUG__;
  }
}
