import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { TUNING } from '../constants/tuning.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from '../systems/AudioManager.js';
import { Juice } from '../systems/Juice.js';
import { fontPx, strokePx, su, sx, sy } from '../utils/scale.js';

// Bullseye Rush 고유 시스템 ②: 라운드/과녁 패턴/콤보/미스 판정.
// 라운드마다 과녁 1~3개(정지→왕복→상하→축소 패턴 진화), 제한 화살로 전부 파괴하면 클리어.
// 정중앙(불스아이) 연속 명중 시 콤보 배수 x2→x3→x4. 미스 3회 or 화살 소진+과녁 잔존 = 게임오버.
export const RUSH = {
  hitPoints: 30,
  bullseyePoints: 60,
  bullseyeBand: 0.34,     // 과녁 반지름 대비 불스아이 판정 반경
  comboMax: 4,
  roundClearBonus: 100,
  leftoverArrowBonus: 20,
  starPoints: 50,
  maxMisses: 3,
  maxRound: 12,
};

// 라운드 난이도 테이블(이후는 수식 램프)
function roundConfig(n) {
  const targets = Math.min(3, 1 + Math.floor((n - 1) / 2));      // 1,1,2,2,3,3,...
  const arrows = targets * 2 + 3 - Math.min(2, Math.floor(n / 5)); // 여유 화살 점감
  const sweep = sx(240 + (n - 1) * 26);                            // 조준 스윕 가속
  const scale = Math.max(0.72, 1 - (n - 1) * 0.035);              // 과녁 축소
  const moveSpeed = n < 3 ? 0 : sx(40 + (n - 3) * 14);            // R3부터 이동
  const bob = n >= 5;                                             // R5부터 상하 바운스
  const starChance = n >= 3 ? 0.5 : 0;
  return { targets, arrows, sweep, scale, moveSpeed, bob, starChance };
}

export default class RoundManager {
  constructor(scene) {
    this.scene = scene;
    this.round = 0;
    this.arrowsLeft = 0;
    this.misses = 0;
    this.combo = 1;
    this.stats = { hits: 0, bullseyes: 0, missShots: 0, roundsCleared: 0, stars: 0 };

    this.targets = scene.physics.add.group({ maxSize: 8, allowGravity: false });
    this.stars = scene.physics.add.group({ maxSize: 3, allowGravity: false });

    // HUD: 남은 화살(우상단 pause 아래) / 미스 X / 콤보 배지
    const w = SPEC.canvas.width;
    this.arrowText = scene.add.text(w - su(18), sy(92), '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: fontPx(17), color: '#ffe066', stroke: '#1b2a4a', strokeThickness: strokePx(4),
    }).setOrigin(1, 0).setDepth(20);
    this.missText = scene.add.text(su(18), sy(92), '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: fontPx(17), color: '#ff6b6b', stroke: '#1b2a4a', strokeThickness: strokePx(4),
    }).setOrigin(0, 0).setDepth(20);
    this.comboText = scene.add.text(w / 2, sy(96), '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: fontPx(19), color: '#7bffb0', stroke: '#1b2a4a', strokeThickness: strokePx(5),
    }).setOrigin(0.5, 0).setDepth(20);
    this.refreshHud();
  }

  startRound(n) {
    this.round = n;
    const cfg = roundConfig(n);
    this.cfg = cfg;
    this.arrowsLeft = cfg.arrows;
    this.scene.aim.setSweepSpeed(cfg.sweep);
    this.scene.aim.clearArrows();
    this.scene.stage.setLevel(n);
    // 과녁 배치: 상단 1/3 영역에 균등 분산
    const w = SPEC.canvas.width;
    const xs = cfg.targets === 1 ? [w / 2] : cfg.targets === 2 ? [w * 0.32, w * 0.68] : [w * 0.22, w * 0.5, w * 0.78];
    xs.forEach((x, i) => {
      const y = sy(190) + (i % 2) * sy(74);
      const t = this.targets.get(x, y, ASSET_KEYS.target);
      if (!t) return;
      t.enableBody(true, x, y, true, true);
      const size = TUNING.hazardSize * 1.18 * cfg.scale;
      t.setDepth(5).setDisplaySize(size, size);
      t.body.setCircle((Math.min(t.width, t.height) / 2) * 0.86, t.width * 0.07, t.height * 0.07);
      t._baseY = y; t._t = Math.random() * Math.PI * 2;
      t._dir = i % 2 === 0 ? 1 : -1;
      t.setVelocityX(cfg.moveSpeed * t._dir);
    });
    // 보너스 별 (확률): 맞히면 화살 +1
    if (Math.random() < cfg.starChance) {
      const s = this.stars.get(Phaser.Math.Between(sx(70), w - sx(70)), sy(132), ASSET_KEYS.star);
      if (s) {
        s.enableBody(true, s.x, sy(132), true, true);
        s.setDepth(5).setDisplaySize(su(52), su(52));
        s.body.setCircle((Math.min(s.width, s.height) / 2) * 0.8, s.width * 0.1, s.height * 0.1);
        s.setVelocityX(sx(70) * (Math.random() < 0.5 ? 1 : -1));
      }
    }
    // ROUND 배너
    const banner = this.scene.add.text(w / 2, SPEC.canvas.height * 0.4, 'ROUND ' + n, {
      fontFamily: 'Arial Black, sans-serif', fontSize: fontPx(42), color: '#ffe066', stroke: '#1b2a4a', strokeThickness: strokePx(8),
    }).setOrigin(0.5).setDepth(30).setAlpha(0);
    this.scene.aim.locked = true;
    this.scene.tweens.add({
      targets: banner, alpha: 1, scale: { from: 0.6, to: 1 }, duration: 240, yoyo: true, hold: 560,
      onComplete: () => { banner.destroy(); this.scene.aim.locked = false; },
    });
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxStart, 0.4);
    this.refreshHud();
  }

  onArrowHitTarget(arrow, target) {
    if (!arrow.active || !target.active) return;
    arrow._missed = true; // 미스 이중집계 방지
    arrow.disableBody(true, true);
    const r = target.displayWidth / 2;
    const isBullseye = Math.abs(arrow.x - target.x) < r * RUSH.bullseyeBand;
    const _x = target.x, _y = target.y;
    target.disableBody(true, true);
    let pts;
    if (isBullseye) {
      this.combo = Math.min(RUSH.comboMax, this.combo + 1);
      pts = RUSH.bullseyePoints * this.combo;
      this.stats.bullseyes += 1;
      Juice.burst(this.scene, _x, _y, 0xffd54a, ASSET_KEYS.fx.collect);
      Juice.scorePop(this.scene, _x, _y, `BULLSEYE x${this.combo} +${pts}`);
    } else {
      this.combo = 1;
      pts = RUSH.hitPoints;
      Juice.burst(this.scene, _x, _y, 0xe8433f, ASSET_KEYS.fx.hit);
      Juice.scorePop(this.scene, _x, _y, '+' + pts);
    }
    this.stats.hits += 1;
    this.scene.score.score += pts;
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxCollect, 0.55);
    this.refreshHud();
    if (this.targets.countActive(true) === 0) this.clearRound();
  }

  onArrowHitStar(arrow, star) {
    if (!arrow.active || !star.active) return;
    arrow._missed = true;
    arrow.disableBody(true, true);
    const _x = star.x, _y = star.y;
    star.disableBody(true, true);
    this.arrowsLeft += 1;
    this.stats.stars += 1;
    this.scene.score.score += RUSH.starPoints;
    this.scene.score.coins += 1;
    Juice.burst(this.scene, _x, _y, 0xffd54a, ASSET_KEYS.fx.collect);
    Juice.scorePop(this.scene, _x, _y, '+1 ARROW');
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxCollect, 0.6);
    this.refreshHud();
  }

  onArrowFired() {
    this.arrowsLeft -= 1;
    this.refreshHud();
  }

  onArrowMiss(x) {
    this.misses += 1;
    this.stats.missShots += 1;
    this.combo = 1;
    Juice.scorePop(this.scene, x, TUNING.safeTop + sy(44), 'MISS');
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxHit, 0.4);
    this.refreshHud();
    if (this.misses >= RUSH.maxMisses) return this.gameOver('misses');
    this.checkExhausted();
  }

  checkExhausted() {
    // 화살 소진 + 공중 화살 없음 + 과녁 잔존 → 실패
    if (this.arrowsLeft <= 0 && this.scene.aim.arrows.countActive(true) === 0 && this.targets.countActive(true) > 0) {
      this.gameOver('arrows');
    }
  }

  clearRound() {
    this.stats.roundsCleared += 1;
    const bonus = RUSH.roundClearBonus + this.arrowsLeft * RUSH.leftoverArrowBonus;
    this.scene.score.score += bonus;
    Juice.scorePop(this.scene, SPEC.canvas.width / 2, SPEC.canvas.height * 0.34, `CLEAR +${bonus}`);
    Juice.flash(this.scene, 0x7bffb0);
    this.stars.children.each((s) => s.disableBody(true, true));
    if (this.round >= RUSH.maxRound) return this.gameOver('allclear');
    this.scene.time.delayedCall(700, () => { if (!this.scene.isOver) this.startRound(this.round + 1); });
  }

  gameOver(reason) {
    this.lastReason = reason;
    this.scene.onHit();
  }

  update() {
    // 과녁 이동 패턴: 좌우 왕복 + (상위 라운드) 상하 바운스
    const w = SPEC.canvas.width;
    this.targets.children.each((t) => {
      if (!t.active) return;
      if (this.cfg?.moveSpeed) {
        if (t.x < sx(58)) t.setVelocityX(Math.abs(t.body.velocity.x));
        if (t.x > w - sx(58)) t.setVelocityX(-Math.abs(t.body.velocity.x));
      }
      if (this.cfg?.bob) {
        t._t += 0.03;
        t.y = t._baseY + Math.sin(t._t) * sy(26);
      }
    });
    this.stars.children.each((s) => {
      if (!s.active) return;
      if (s.x < sx(46)) s.setVelocityX(Math.abs(s.body.velocity.x));
      if (s.x > w - sx(46)) s.setVelocityX(-Math.abs(s.body.velocity.x));
    });
    this.checkExhausted();
  }

  refreshHud() {
    this.arrowText.setText(`ARROWS ${Math.max(0, this.arrowsLeft)}`);
    this.missText.setText(`MISS ${this.misses}/${RUSH.maxMisses}`);
    this.comboText.setText(this.combo > 1 ? `COMBO x${this.combo}` : '');
  }
}
