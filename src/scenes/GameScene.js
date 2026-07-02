import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import Player from '../entities/Player.js';
import PoopSpawner from '../systems/PoopSpawner.js';
import Difficulty from '../systems/Difficulty.js';
import ScoreManager from '../systems/ScoreManager.js';
import StageManager from '../systems/StageManager.js';
import ComboManager from '../systems/ComboManager.js';
import CoinManager from '../systems/CoinManager.js';
import PowerupManager from '../systems/PowerupManager.js';
import Boss from '../systems/Boss.js';
import Effects from '../systems/Effects.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAME);
  }

  create() {
    this.isGameOver = false;
    this.reviving = false;
    this.freeContinueUsed = false;
    this.spawnAcc = 0;
    this.lastTick = 0;
    this.lastTrail = 0;
    this.rainUntil = 0;
    this.rainSafeX = GC.WIDTH / 2;
    this.bossStarted = false;

    this.sound.mute = Save.mute;
    this.effects = new Effects(this);

    const charDef = GC.ASSETS.characters.find((c) => c.id === Save.selChar) || GC.ASSETS.characters[0];

    this.bg = this.add.image(GC.WIDTH / 2, GC.HEIGHT / 2, Save.selBg).setDepth(0);

    this.difficulty = new Difficulty();
    this.score = new ScoreManager();
    this.stageMgr = new StageManager();
    this.combo = new ComboManager();

    this.player = new Player(this, charDef);
    this.spawner = new PoopSpawner(this);
    this.coins = new CoinManager(this);
    this.powerups = new PowerupManager(this);
    this.boss = new Boss(this);

    this.hazards = this.physics.add.group({ allowGravity: false });

    // 콜백 연결
    this.spawner.onDodge = (poop) => this.onDodge(poop);
    this.spawner.onPoisonLand = (x) => this.spawnPoisonFloor(x);
    this.powerups.onClear = () => this.lightningClear();
    this.powerups.onEffect = (e) => this.onPowerupGained(e);
    this.boss.onDefeat = (x, y) => this.onBossDefeat(x, y);

    // 충돌
    this.physics.add.overlap(this.player, this.spawner.group, this.onHitPoop, undefined, this);
    this.physics.add.overlap(this.player, this.hazards, this.onHitObstacle, undefined, this);
    this.physics.add.overlap(this.player, this.boss.projGroup, this.onHitObstacle, undefined, this);
    this.physics.add.overlap(this.player, this.coins.group, this.onCoin, undefined, this);
    this.physics.add.overlap(this.player, this.powerups.group, this.onPowerup, undefined, this);

    this.buildHud();

    // 입력
    this.input.on('pointermove', this.onPointer, this);
    this.input.on('pointerdown', this.onPointer, this);
    this.keyP = this.input.keyboard.addKey('P');
    this.keyEsc = this.input.keyboard.addKey('ESC');
    this.keyP.on('down', this.openPause, this);
    this.keyEsc.on('down', this.openPause, this);

    // 폭우 이벤트
    this.rainTimer = this.time.addEvent({
      delay: GC.RAIN.everySec * 1000,
      loop: true,
      callback: () => this.triggerRain(),
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  buildHud() {
    const A = GC.ASSETS.ui;
    this.add.image(20, 20, A.hudPanel.key).setOrigin(0, 0).setDepth(19).setScale(0.9);
    this.hud = this.add
      .text(44, 34, '', { fontFamily: 'Arial', fontSize: '40px', color: '#ffffff', stroke: '#000', strokeThickness: 5 })
      .setDepth(20);
    // 코인
    this.add.image(GC.WIDTH / 2 - 80, 60, 'coin_01').setDepth(20).setDisplaySize(56, 56);
    this.coinText = this.add
      .text(GC.WIDTH / 2 - 44, 36, '0', { fontFamily: 'Arial Black, Arial', fontSize: '46px', color: '#ffd54a', stroke: '#000', strokeThickness: 5 })
      .setDepth(20);
    // 콤보
    this.comboText = this.add
      .text(GC.WIDTH / 2, 150, '', { fontFamily: 'Arial Black, Arial', fontSize: '54px', color: '#ff8adf', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5, 0)
      .setDepth(20);

    // 일시정지 버튼
    this.pauseBtn = this.add
      .image(GC.WIDTH - 76, 76, 'btn_pause')
      .setDepth(20)
      .setDisplaySize(104, 104)
      .setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', (p, x, y, e) => { if (e) e.stopPropagation(); this.openPause(); });

    // 배너
    this.banner = this.add
      .text(GC.WIDTH / 2, GC.HEIGHT * 0.34, '', { fontFamily: 'Arial Black, Arial', fontSize: '92px', color: '#fff', align: 'center', stroke: '#000', strokeThickness: 12 })
      .setOrigin(0.5).setDepth(25).setAlpha(0);

    // 파워업 아이콘 슬롯
    this.puEffectKey = {};
    GC.POWERUPS.forEach((p) => { this.puEffectKey[p.effect] = p.key; });
    this.puIcons = {};
    let i = 0;
    ['shield', 'speed', 'magnet', 'slow'].forEach((eff) => {
      const icon = this.add.image(60 + i * 92, 210, this.puEffectKey[eff]).setDepth(20).setDisplaySize(76, 76).setVisible(false);
      this.puIcons[eff] = icon;
      i += 1;
    });
  }

  onPointer(pointer) {
    if (this.isGameOver) return;
    if (pointer.x > GC.WIDTH - 160 && pointer.y < 160) return; // 일시정지 버튼 영역 제외
    this.player.setTargetX(pointer.x);
  }

  update(time, delta) {
    if (this.isGameOver) return;
    const now = time;
    const elapsedSec = this.score.survivalMs / 1000;

    // 스테이지
    const st = this.stageMgr.update(this.score.survivalMs);
    if (st.changed) this.onStageChange(st);

    // 보스 진입
    if (!this.bossStarted && elapsedSec >= GC.BOSS.enterAtSec) this.startBoss();

    const p = this.difficulty.getParams(this.score.survivalMs);

    // 슬로우
    const slow = this.powerups.isActive('slow') ? GC.POWERUP.slowFactor : 1;
    this.spawner.applySlow(slow);

    // 스폰 (보스 중엔 일반 똥 정지)
    if (!this.boss.active) {
      const raining = now < this.rainUntil;
      const interval = p.spawnInterval * (raining ? GC.RAIN.intervalMul : 1);
      const concurrent = p.concurrentMax + (raining ? 3 : 0);
      this.spawnAcc += delta;
      if (this.spawnAcc >= interval && this.spawner.activeCount < concurrent) {
        this.spawnOne(p.fallSpeed, raining);
        this.powerups.maybeDrop(p.fallSpeed);
        this.spawnAcc = 0;
      }
    } else {
      this.boss.update(delta);
    }

    // 플레이어
    const lerp = this.powerups.isActive('speed') ? GC.PLAYER.SPEED_LERP : GC.PLAYER.LERP;
    this.player.setInvincible(this.powerups.isActive('shield') || this.reviving);
    this.player.step(now, lerp);
    if (Math.abs(this.player.dx || 0) > 6 && now - this.lastTrail > 60) {
      this.lastTrail = now;
      this.effects.trail('fx_sparkle', this.player.x, this.player.y + 30);
    }

    this.spawner.update();
    this.coins.update(this.player, this.powerups.isActive('magnet'));
    this.powerups.update(now);
    this.checkNearMiss();

    this.score.addSurvival(delta);
    this.updateHud();
  }

  spawnOne(fallSpeed, raining) {
    const type = this.stageMgr.pickType();
    // 폭우 안전 통로: 플레이어 주변엔 스폰 자제(즉사 방지)
    this.spawner.spawn(type, fallSpeed);
    if (raining) {
      // 안전 통로 확보를 위해 방금 스폰이 통로에 있으면 x 이동
      const last = this.spawner.group.getChildren().find((c) => c.active && c.y <= GC.POOP.SPAWN_Y + 10);
      if (last && Math.abs(last.x - this.rainSafeX) < GC.RAIN.safeLaneWidth / 2) {
        last.x = this.rainSafeX + (last.x < this.rainSafeX ? -1 : 1) * GC.RAIN.safeLaneWidth;
        last.x = Phaser.Math.Clamp(last.x, 60, GC.WIDTH - 60);
      }
    }
  }

  onStageChange(st) {
    if (this.boss.active) return;
    this.swapBackground(st.stage.bg);
    this.showBanner(`STAGE ${st.number}\n${st.stage.intro} 등장!`);
    this.playSfx(GC.AUDIO.sfx.warning.key, 0.4);
  }

  swapBackground(key) {
    const next = this.add.image(GC.WIDTH / 2, GC.HEIGHT / 2, key).setDepth(0).setAlpha(0);
    this.tweens.add({ targets: next, alpha: 1, duration: 600, onComplete: () => { this.bg.setTexture(key); next.destroy(); } });
  }

  showBanner(text) {
    this.banner.setText(text).setAlpha(0).setScale(0.7);
    this.tweens.add({ targets: this.banner, alpha: 1, scale: 1, duration: 300, yoyo: true, hold: 900 });
  }

  triggerRain() {
    if (this.isGameOver || this.boss.active) return;
    this.rainUntil = this.time.now + GC.RAIN.durationMs;
    this.rainSafeX = this.player.x;
    this.showMessage('msg_warning');
    this.playSfx(GC.AUDIO.sfx.warning.key, 0.45);
  }

  showMessage(key, y = GC.HEIGHT * 0.3) {
    if (!this.textures.exists(key)) return;
    const m = this.add.image(GC.WIDTH / 2, y, key).setDepth(26).setScale(0.4).setAlpha(0);
    this.tweens.add({ targets: m, scale: 1, alpha: 1, duration: 260, yoyo: true, hold: 700, onComplete: () => m.destroy() });
  }

  onDodge(poop) {
    const mult = this.combo.multiplier;
    this.score.addDodge(poop._dodge, mult);
    if (poop._dodge > 0) {
      const milestone = this.combo.add(1);
      if (milestone) this.onComboMilestone(milestone);
    }
    // 코인 드롭
    const drop = poop._golden ? GC.COIN.goldenBonus : Math.random() < GC.COIN.dropChance ? 1 : 0;
    for (let i = 0; i < drop; i++) this.coins.spawn(poop.x + Phaser.Math.Between(-30, 30), poop.y);

    if (poop._golden) {
      this.playSfx(GC.AUDIO.sfx.coin.key, 0.8);
      this.effects.pop('fx_star_ring', poop.x, poop.y, { scale: 1.2 });
      this.effects.floatText(poop.x, poop.y, '+500', '#ffd54a');
    } else {
      const now = this.time.now;
      if (now - this.lastTick > 85) {
        this.lastTick = now;
        this.playSfx(Phaser.Utils.Array.GetRandom(GC.AUDIO.sfx.dodgeTicks).key, 0.22);
        this.effects.pop('fx_smoke', poop.x, GC.PLAYER.Y + 90, { scale: 0.6, duration: 380 });
      }
    }
  }

  onComboMilestone(name) {
    if (name === 'FANTASTIC') this.showMessage('msg_fantastic', GC.HEIGHT * 0.42);
    else this.effects.floatText(GC.WIDTH / 2, GC.HEIGHT * 0.42, name, '#ff8adf', 80);
    this.effects.pop('fx_star_ring', this.player.x, this.player.y, { scale: 1.6 });
  }

  checkNearMiss() {
    const pr = GC.PLAYER.HIT_RADIUS;
    this.spawner.group.children.each((poop) => {
      if (!poop.active || poop._near || poop._harmless) return;
      if (Math.abs(poop.y - this.player.y) > 46) return;
      const d = Phaser.Math.Distance.Between(poop.x, poop.y, this.player.x, this.player.y);
      const gap = d - (pr + poop.displayWidth * 0.3);
      if (gap > 4 && gap < GC.SCORE.NEAR_MISS_GAP) {
        poop._near = true;
        this.score.addNearMiss(this.combo.multiplier);
        this.playSfx(GC.AUDIO.sfx.nearMiss.key, 0.4);
        this.effects.floatText(poop.x, poop.y - 30, 'NEAR!', '#7fefff', 44);
      }
    });
  }

  spawnPoisonFloor(x) {
    const h = this.hazards.get(x, GC.PLAYER.Y + 30, 'poison_floor_01');
    if (!h) return;
    h.enableBody(true, x, GC.PLAYER.Y + 30, true, true);
    h.setDepth(4).setDisplaySize(150, 150);
    h.body.setCircle(h.width * 0.35, h.width * 0.15, h.width * 0.15);
    h.body.setAllowGravity(false);
    if (this.anims.exists('poison_floor')) h.play('poison_floor');
    this.time.delayedCall(2500, () => { if (h.active) { h.anims.stop(); h.disableBody(true, true); } });
  }

  onCoin(player, coin) {
    this.coins.collect(coin);
    this.playSfx(GC.AUDIO.sfx.coin.key, 0.5);
  }

  onPowerup(player, item) {
    this.powerups.pickup(item, this.time.now);
    this.playSfx(GC.AUDIO.sfx.shield.key, 0.7);
  }

  onPowerupGained(effect) {
    this.effects.pop('fx_star_ring', this.player.x, this.player.y, { scale: 1.4 });
    const labels = { shield: '무적!', speed: '스피드!', magnet: '자석!', slow: '슬로우!', clear: '번개!' };
    this.effects.floatText(this.player.x, this.player.y - 80, labels[effect] || '', '#9fd0ff', 56);
  }

  lightningClear() {
    this.spawner.group.children.each((poop) => {
      if (!poop.active) return;
      this.effects.pop('fx_explosion', poop.x, poop.y, { scale: 0.9, duration: 420 });
      this.score.addDodge(poop._dodge, this.combo.multiplier);
      this.spawner.disable(poop);
    });
    this.boss.projGroup.children.each((p) => { if (p.active) p.disableBody(true, true); });
    this.playSfx(GC.AUDIO.sfx.hit.key, 0.8);
    this.cameras.main.flash(200, 255, 255, 200);
  }

  startBoss() {
    this.bossStarted = true;
    this.spawner.reset();
    this.showBanner('BOSS\n변기 등장!');
    this.boss.start();
  }

  onBossDefeat(x, y) {
    this.effects.pop('fx_explosion', x, y, { scale: 2.2, duration: 700 });
    this.effects.pop('fx_star_ring', x, y, { scale: 2.4, duration: 800 });
    this.score.addBonus(GC.BOSS.defeatScore);
    for (let i = 0; i < GC.BOSS.defeatCoins; i++) {
      this.coins.spawn(x + Phaser.Math.Between(-120, 120), y + Phaser.Math.Between(-40, 40));
    }
    this.showBanner('BOSS 격파!\nENDLESS');
    this.playSfx(GC.AUDIO.sfx.coin.key, 1);
  }

  onHitPoop(player, poop) {
    if (poop._harmless) return;
    this.triggerGameOver();
  }

  onHitObstacle() {
    this.triggerGameOver();
  }

  triggerGameOver() {
    if (this.isGameOver || this.reviving || this.player.invincible) return;
    this.isGameOver = true;
    this.physics.pause();
    this.playSfx(GC.AUDIO.sfx.hit.key, 0.6);
    this.playSfx(GC.AUDIO.sfx.gameOver.key, 0.55);
    this.effects.pop('fx_explosion', this.player.x, this.player.y, { scale: 1.2 });
    this.scene.launch(SCENES.GAMEOVER, { gameKey: SCENES.GAME });
    this.scene.pause();
  }

  // GameOverScene가 호출: 이어하기
  canContinue() {
    return !this.freeContinueUsed || Save.coins >= GC.HEART.costCoins;
  }

  revive() {
    // 무료 우선, 없으면 코인
    if (!this.freeContinueUsed) this.freeContinueUsed = true;
    else Save.spendCoins(GC.HEART.costCoins);

    this.isGameOver = false;
    this.reviving = true;
    this.spawner.reset();
    this.boss.projGroup.children.each((p) => { if (p.active) p.disableBody(true, true); });
    this.hazards.children.each((h) => { if (h.active) h.disableBody(true, true); });
    this.combo.reset();
    this.spawnAcc = 0;
    this.physics.resume();
    this.effects.pop('fx_star_ring', this.player.x, this.player.y, { scale: 2 });
    this.time.delayedCall(GC.HEART.reviveInvincMs, () => { this.reviving = false; });
  }

  // 최종 종료 시 코인 적립 + 랭킹 기록
  bankRun() {
    Save.addCoins(this.coins.runCoins);
    Save.recordRun(this.score.getScore());
  }

  updateHud() {
    this.hud.setText(`SCORE ${this.score.getScore()}\nBEST  ${Save.best}\nSTAGE ${this.stageMgr.index + 1}`);
    this.coinText.setText(`${this.coins.runCoins}`);
    this.comboText.setText(this.combo.combo >= 5 ? `COMBO ${this.combo.combo}` : '');

    const now = this.time.now;
    ['shield', 'speed', 'magnet', 'slow'].forEach((eff) => {
      const icon = this.puIcons[eff];
      if (this.powerups.isActive(eff)) {
        const rem = this.powerups.active[eff] - now;
        const dur = GC.POWERUPS.find((p) => p.effect === eff).durationMs;
        icon.setVisible(true).setAlpha(Phaser.Math.Clamp(rem / dur, 0.2, 1));
      } else {
        icon.setVisible(false);
      }
    });
  }

  openPause() {
    if (this.isGameOver || this.scene.isPaused()) return;
    this.playSfx(GC.AUDIO.ui.buttonClick.key, 0.6);
    this.scene.launch(SCENES.PAUSE, { gameKey: SCENES.GAME });
    this.scene.pause();
  }

  playSfx(key, volume = 1) {
    if (this.cache.audio.exists(key)) this.sound.play(key, { volume });
  }

  cleanup() {
    this.input.off('pointermove', this.onPointer, this);
    this.input.off('pointerdown', this.onPointer, this);
    if (this.keyP) this.keyP.off('down', this.openPause, this);
    if (this.keyEsc) this.keyEsc.off('down', this.openPause, this);
    if (this.rainTimer) this.rainTimer.remove();
    if (this.boss) this.boss.reset();
  }
}
