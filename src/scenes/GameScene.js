import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import { Music } from '../systems/MusicManager.js';
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
import { FONT_HEAVY, fitTextWidth, formatCount } from '../ui/UiKit.js';
import { setViewportBackdrop } from '../ui/ViewportBackdrop.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAME);
  }

  create() {
    this.isGameOver = false;
    this.reviving = false;
    this.spawnAcc = 0;
    this.lastTick = 0;
    this.lastTrail = 0;
    this.rainUntil = 0;
    this.rainSafeX = GC.WIDTH / 2;
    this.wasRaining = false;
    this.bossIndex = 0; // 다음에 등장할 보스 인덱스(약→중→강)
    this.coinsBanked = 0; // 이번 판에서 이미 적립한 코인(멱등 뱅킹용)
    this.runRecorded = false; // 랭킹에 이번 판 점수를 기록했는지
    this.freeContinuesLeft = GC.HEART.freeContinues; // 무료 이어하기 횟수
    this.floorGen = 0; // 독 바닥 세대 id(타이머 오작동 방지)

    this.sound.mute = Save.mute;
    Music.play(this);
    this.effects = new Effects(this);

    const charDef = GC.ASSETS.characters.find((c) => c.id === Save.selChar) || GC.ASSETS.characters[0];

    setViewportBackdrop(Save.selBg);
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
    this.boss.onDefeat = (x, y, cfg) => this.onBossDefeat(x, y, cfg);

    // 충돌
    this.physics.add.overlap(this.player, this.spawner.group, this.onHitPoop, undefined, this);
    this.physics.add.overlap(this.player, this.hazards, this.onHitObstacle, undefined, this);
    this.physics.add.overlap(this.player, this.boss.projGroup, this.onHitObstacle, undefined, this);
    this.physics.add.overlap(this.player, this.coins.group, this.onCoin, undefined, this);
    this.physics.add.overlap(this.player, this.powerups.group, this.onPowerup, undefined, this);

    this.buildHud();

    // 입력 (동시 터치 2개는 main.js input.activePointers=2에서 설정)
    this.input.on('pointermove', this.onPointer, this);
    this.input.on('pointerdown', this.onPointer, this);
    this.keyP = this.input.keyboard.addKey('P');
    this.keyEsc = this.input.keyboard.addKey('ESC');
    this.keyP.on('down', this.openPause, this);
    this.keyEsc.on('down', this.openPause, this);

    // 폭우 이벤트(지터 포함해 재스케줄)
    this.scheduleRain();

    // 탭 백그라운드/종료 시 이번 판 코인을 잃지 않도록 즉시 적립
    this.visHandler = () => { if (document.hidden) this.bankCoins(); };
    document.addEventListener('visibilitychange', this.visHandler);
    window.addEventListener('pagehide', this.visHandler);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  buildHud() {
    this.hudObjects = [];
    const hudPanel = this.add
      .image(18, 14, GC.ASSETS.ui.hudPanel.key)
      .setOrigin(0, 0)
      .setDepth(19)
      .setDisplaySize(460, 136);
    this.hudObjects.push(hudPanel);

    const hudTextCenterY = 82;
    this.hudLabel = this.add
      .text(112, hudTextCenterY, 'SCORE\nBEST\nSTAGE', { fontFamily: FONT_HEAVY, fontSize: '27px', color: '#12366a', lineSpacing: 1 })
      .setOrigin(0, 0.5)
      .setDepth(20);
    this.hudValue = this.add
      .text(260, hudTextCenterY, '', { fontFamily: FONT_HEAVY, fontSize: '27px', color: '#0f2f62', lineSpacing: 1 })
      .setOrigin(0, 0.5)
      .setDepth(20);
    this.hudObjects.push(this.hudLabel, this.hudValue);
    // 코인: 별도 불투명 캡슐 배경을 깔아 낙하 오브젝트가 UI 장식처럼 붙어 보이지 않게 한다.
    const coinBack = this.add.graphics().setDepth(19);
    coinBack.fillStyle(0xf7fbff, 0.92);
    coinBack.fillRoundedRect(GC.WIDTH / 2 - 58, 18, 208, 88, 38);
    coinBack.lineStyle(4, 0x4fe8ff, 0.88);
    coinBack.strokeRoundedRect(GC.WIDTH / 2 - 58, 18, 208, 88, 38);
    this.hudObjects.push(coinBack);

    // 코인
    const coinIcon = this.add.image(GC.WIDTH / 2 + 12, 60, 'coin_01').setDepth(20).setDisplaySize(56, 56);
    this.hudObjects.push(coinIcon);
    this.coinText = this.add
      .text(GC.WIDTH / 2 + 52, 60, '0', { fontFamily: FONT_HEAVY, fontSize: '46px', color: '#ffd54a', stroke: '#000', strokeThickness: 5 })
      .setOrigin(0, 0.5)
      .setDepth(20);
    this.hudObjects.push(this.coinText);
    // 콤보
    this.comboText = this.add
      .text(GC.WIDTH / 2, 280, '', { fontFamily: FONT_HEAVY, fontSize: '54px', color: '#ff8adf', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5, 0)
      .setDepth(20);

    // 일시정지 버튼 — 표시 132px 풀프레임 판정(텍스처 크기 무관). 커스텀 픽셀 히트영역은
    // 텍스처가 512px일 때 좌상단 일부만 눌리는 버그가 있어 사용하지 않는다.
    this.pauseBtn = this.add
      .image(GC.WIDTH - 88, 88, 'btn_pause')
      .setDepth(20)
      .setDisplaySize(132, 132)
      .setInteractive({ useHandCursor: true });
    this.hudObjects.push(this.pauseBtn);
    this.pauseBtn.on('pointerdown', (p, x, y, e) => { if (e) e.stopPropagation(); this.openPause(); });

    // 배너
    this.banner = this.add
      .text(GC.WIDTH / 2, GC.HEIGHT * 0.34, '', { fontFamily: FONT_HEAVY, fontSize: '92px', color: '#fff', align: 'center', stroke: '#000', strokeThickness: 12 })
      .setOrigin(0.5).setDepth(25).setAlpha(0);

    // 파워업 아이콘 슬롯
    this.puEffectKey = {};
    GC.POWERUPS.forEach((p) => { this.puEffectKey[p.effect] = p.key; });
    this.puIcons = {};
    let i = 0;
    ['shield', 'speed', 'magnet', 'slow'].forEach((eff) => {
      const icon = this.add.image(60 + i * 92, 210, this.puEffectKey[eff]).setDepth(20).setDisplaySize(76, 76).setVisible(false);
      this.puIcons[eff] = icon;
      this.hudObjects.push(icon);
      i += 1;
    });
  }

  setHudVisible(visible) {
    (this.hudObjects || []).forEach((obj) => obj?.setVisible?.(visible));
  }

  onPointer(pointer) {
    if (this.isGameOver) return;
    // 상단 HUD 영역(점수판/코인/일시정지 버튼) 터치는 이동으로 처리하지 않는다(오터치로 캐릭터가 튀는 것 방지)
    if (pointer.y < 160) return;
    if (Phaser.Geom.Rectangle.Contains(this.pauseBtn.getBounds(), pointer.x, pointer.y)) return;
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
    if (!this.boss.active && this.bossIndex < GC.BOSSES.length && elapsedSec >= GC.BOSSES[this.bossIndex].enterAtSec) {
      this.startBoss(GC.BOSSES[this.bossIndex]);
    }

    const p = this.difficulty.getParams(this.score.survivalMs);

    // 슬로우
    const slow = this.powerups.isActive('slow') ? GC.POWERUP.slowFactor : 1;
    this.spawner.applySlow(slow);

    // 스폰 (보스 중엔 일반 똥 정지)
    if (!this.boss.active) {
      const raining = now < this.rainUntil;
      // 폭우가 막 끝난 프레임에 생존 보너스
      if (this.wasRaining && !raining) {
        this.score.addBonus(GC.RAIN.bonus);
        this.effects.floatText(this.player.x, this.player.y - 90, `+${GC.RAIN.bonus}`, '#7fefff', 56);
      }
      this.wasRaining = raining;

      const interval = p.spawnInterval * (raining ? GC.RAIN.intervalMul : 1);
      const concurrent = p.concurrentMax + (raining ? 3 : 0);
      // 델타 누적을 interval의 2배로 클램프(탭 복귀 등 큰 delta 시 폭발적 스폰 방지),
      // 소진분은 이월(= 정확한 스폰 주기 유지)
      this.spawnAcc = Math.min(this.spawnAcc + delta, interval * 2);
      if (this.spawnAcc >= interval && this.spawner.activeCount < concurrent) {
        this.spawnOne(p.fallSpeed, raining);
        this.powerups.maybeDrop(p.fallSpeed);
        this.spawnAcc -= interval;
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
    setViewportBackdrop(key);
    const next = this.add.image(GC.WIDTH / 2, GC.HEIGHT / 2, key).setDepth(0).setAlpha(0);
    this.tweens.add({ targets: next, alpha: 1, duration: 600, onComplete: () => { this.bg.setTexture(key); next.destroy(); } });
  }

  showBanner(text) {
    this.banner.setText(text).setAlpha(0).setScale(0.7);
    this.tweens.add({ targets: this.banner, alpha: 1, scale: 1, duration: 300, yoyo: true, hold: 900 });
  }

  // everySec ± jitterSec 간격으로 폭우를 재스케줄
  scheduleRain() {
    const jitter = Phaser.Math.Between(-GC.RAIN.jitterSec, GC.RAIN.jitterSec) * 1000;
    this.rainTimer = this.time.delayedCall(GC.RAIN.everySec * 1000 + jitter, () => {
      this.triggerRain();
      this.scheduleRain();
    });
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
    // 코인 드롭: onDodge는 똥이 화면 밖(하단)으로 나간 뒤 호출되므로 poop.y를 쓰면
    // 코인이 화면 아래에서 생겨 주울 수 없다. 화면 위에서 떨어뜨려 플레이어가 획득하게 한다.
    const drop = poop._golden ? GC.COIN.goldenBonus : Math.random() < GC.COIN.dropChance ? GC.COIN.perDrop : 0;
    for (let i = 0; i < drop; i++) {
      const cx = Phaser.Math.Clamp(poop.x + Phaser.Math.Between(-40, 40) + i * 46, 60, GC.WIDTH - 60);
      this.coins.spawn(cx, GC.POOP.SPAWN_Y);
    }

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
    // 세대 id: 이 바닥이 조기 비활성/재사용되면 이전 타이머는 무효화되어 다른 바닥을 잘못 끄지 않는다
    const gen = ++this.floorGen;
    h._gen = gen;
    this.time.delayedCall(2500, () => {
      if (h.active && h._gen === gen) { h.anims.stop(); h.disableBody(true, true); }
    });
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

  startBoss(cfg) {
    this.spawner.reset();
    this.showBanner(`⚠ ${cfg.name} ⚠\n등장!`);
    this.playSfx(GC.AUDIO.sfx.warning.key, 0.6);
    this.boss.start(cfg);
  }

  onBossDefeat(x, y, cfg) {
    this.effects.pop('fx_explosion', x, y, { scale: 2.2, duration: 700 });
    this.effects.pop('fx_star_ring', x, y, { scale: 2.4, duration: 800 });
    this.score.addBonus(cfg.defeatScore);
    // 보상 코인은 플레이어 근처(화면 위)에서 떨어뜨려 상시 자석으로 실제 수집되게 한다
    for (let i = 0; i < cfg.defeatCoins; i++) {
      const cx = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-130, 130), 60, GC.WIDTH - 60);
      this.coins.spawn(cx, GC.POOP.SPAWN_Y - (i % 6) * 40);
    }
    this.bossIndex += 1; // 다음 보스로
    const last = this.bossIndex >= GC.BOSSES.length;
    this.showBanner(last ? '최종 보스 격파!\nENDLESS' : `${cfg.name} 격파!`);
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
    this.setHudVisible(false);
    this.physics.pause();
    this.playSfx(GC.AUDIO.sfx.hit.key, 0.6);
    this.playSfx(GC.AUDIO.sfx.gameOver.key, 0.55);
    Music.stop(this);
    // 사망 시점에 이번 판 코인을 즉시 적립(결과화면에서 탭을 닫아도 코인이 보존됨)
    this.bankCoins();
    this.scene.launch(SCENES.GAMEOVER, { gameKey: SCENES.GAME });
    this.scene.pause();
  }

  // GameOverScene가 호출: 이어하기
  canContinue() {
    return this.freeContinuesLeft > 0 || Save.coins >= GC.HEART.costCoins;
  }

  revive() {
    // 무료 이어하기 우선, 없으면 코인 차감
    if (this.freeContinuesLeft > 0) this.freeContinuesLeft -= 1;
    else if (!Save.spendCoins(GC.HEART.costCoins)) return false;

    this.isGameOver = false;
    this.reviving = true;
    this.setHudVisible(true);
    this.spawner.reset();
    this.boss.projGroup.children.each((p) => { if (p.active) p.disableBody(true, true); });
    this.hazards.children.each((h) => { if (h.active) h.disableBody(true, true); });
    this.combo.reset();
    this.spawnAcc = 0;
    this.rainUntil = 0; // 폭우 중 부활 시 고밀도 스폰이 이어지지 않도록 해제
    this.wasRaining = false;
    this.physics.resume();
    this.effects.pop('fx_star_ring', this.player.x, this.player.y, { scale: 2 });
    this.time.delayedCall(GC.HEART.reviveInvincMs, () => { this.reviving = false; });
    return true;
  }

  // 이번 판에서 새로 번 코인만 멱등적으로 적립(이어하기로 이어져도 이중 적립 없음)
  bankCoins() {
    const delta = this.coins.runCoins - this.coinsBanked;
    if (delta > 0) {
      Save.addCoins(delta);
      this.coinsBanked += delta;
    }
  }

  // 정식 게임오버 종료 시에만 랭킹/최고점에 1회 기록(일시정지 이탈은 기록하지 않음)
  recordScore() {
    if (this.runRecorded) return;
    this.runRecorded = true;
    Save.recordRun(this.score.getScore());
  }

  updateHud() {
    this.hudValue.setText(`${formatCount(this.score.getScore())}\n${formatCount(Save.best)}\n${this.stageMgr.index + 1}`);
    fitTextWidth(this.hudValue, 132, 0.82);
    this.coinText.setText(formatCount(this.coins.runCoins));
    fitTextWidth(this.coinText, 150);
    this.comboText.setText(this.combo.combo >= 5 && !this.boss.active ? `COMBO ${formatCount(this.combo.combo)}` : '');
    fitTextWidth(this.comboText, 460);

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
    Music.pause(this);
    this.setHudVisible(false);
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
    if (this.visHandler) {
      document.removeEventListener('visibilitychange', this.visHandler);
      window.removeEventListener('pagehide', this.visHandler);
    }
    if (this.boss) this.boss.reset();
  }
}
