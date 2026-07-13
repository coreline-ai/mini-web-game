import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { SCALE, fontPx, strokePx, su, sy, worldX } from '../constants/tuning.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from '../systems/AudioManager.js';
import { Juice } from '../systems/Juice.js';

// Jungle Arc Shot 고유 시스템 ②: 라운드/바람/관통 콤보/화살 경제.
// - 라운드마다 과일·풍선 클러스터 배치(관통 라인이 나오도록 세로/대각 줄 세움)
// - 바람: 라운드 고정값(px/s²), HUD 화살표+세기 표시 — 궤적과 실제 비행 둘 다에 적용
// - 관통: 화살이 표적을 뚫고 지나감. 한 화살의 n번째 표적 = n×기본점 ("PIERCE xN!")
// - 실패: 화살 소진(+비행 중 화살 없음)+표적 잔존. R10 전체 클리어 = 올클리어 승리.
export const JUNGLE = {
  fruitPoints: 40,
  balloonPoints: 25,
  pierceStep: 1,          // n번째 관통 = 기본점 × n
  roundClearBonus: 120,
  leftoverArrowBonus: 25,
  maxRound: 10,
};

function roundConfig(n) {
  const fruits = Math.min(7, 2 + Math.floor(n * 0.8));
  const balloons = Math.min(4, Math.floor(n / 2));
  const arrows = Math.max(2, Math.ceil((fruits + balloons) / 2) + 1); // 관통을 강제하는 경제
  const wind = n < 2 ? 0 : (n % 2 === 0 ? 1 : -1) * su(30 + n * 16); // 방향 교대, 세기 증가
  const drift = n >= 4;                                              // R4+ 풍선 상승 드리프트
  return { fruits, balloons, arrows, wind, drift };
}

export default class JungleRoundSystem {
  constructor(scene) {
    this.scene = scene;
    this.round = 0;
    this.arrowsLeft = 0;
    this.stats = { hits: 0, pierceBest: 0, fruits: 0, balloons: 0, roundsCleared: 0 };

    this.targets = scene.physics.add.group({ maxSize: 16, allowGravity: false });

    const w = SPEC.canvas.width;
    this.arrowText = scene.add.text(worldX(372), su(92), '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: fontPx(17), color: '#ffe066', stroke: '#1b3a2a', strokeThickness: strokePx(4),
    }).setOrigin(1, 0).setDepth(20);
    this.windText = scene.add.text(worldX(18), su(92), '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: fontPx(17), color: '#bfe9ff', stroke: '#1b3a2a', strokeThickness: strokePx(4),
    }).setOrigin(0, 0).setDepth(20);
    this.roundText = scene.add.text(w / 2, su(96), '', {
      fontFamily: 'Arial Black, sans-serif', fontSize: fontPx(16), color: '#ffffff', stroke: '#1b3a2a', strokeThickness: strokePx(4),
    }).setOrigin(0.5, 0).setDepth(20);
    this.refreshHud();
  }

  startRound(n) {
    this.round = n;
    const cfg = this.cfg = roundConfig(n);
    this.arrowsLeft = cfg.arrows;
    this.scene.aim.wind = cfg.wind;
    this.scene.aim.clearArrows();
    this.scene.stage.setLevel(Math.min(12, n));
    const w = SPEC.canvas.width;
    // 클러스터 배치: 세로 줄(관통 유도) + 흩뿌림
    const cols = [worldX(97.5), SPEC.canvas.width / 2, worldX(292.5)];
    let placed = 0;
    for (let i = 0; i < cfg.fruits; i += 1) {
      const cx = cols[i % cols.length] + Phaser.Math.Between(-su(26), su(26));
      const cy = sy(170) + Math.floor(i / cols.length) * sy(92) + Phaser.Math.Between(-su(12), su(12));
      const t = this.targets.get(cx, cy, ASSET_KEYS.fruit);
      if (!t) break;
      t.enableBody(true, cx, cy, true, true);
      t._kind = 'fruit'; t._t = Math.random() * Math.PI * 2; t._baseY = cy; t._drift = 0;
      t.setDepth(5).setDisplaySize(su(58), su(58));
      t.body.setCircle((Math.min(t.width, t.height) / 2) * 0.8, t.width * 0.1, t.height * 0.1);
      placed += 1;
    }
    for (let i = 0; i < cfg.balloons; i += 1) {
      const cx = worldX(Phaser.Math.Between(60, 330));
      const cy = sy(Phaser.Math.Between(150, 330));
      const b = this.targets.get(cx, cy, ASSET_KEYS.balloon);
      if (!b) break;
      b.enableBody(true, cx, cy, true, true);
      b._kind = 'balloon'; b._t = Math.random() * Math.PI * 2; b._baseY = cy;
      b._drift = cfg.drift ? Phaser.Math.Between(su(12), su(26)) : 0;
      b.setDepth(5).setDisplaySize(su(54), su(66));
      b.body.setCircle((Math.min(b.width, b.height) / 2) * 0.78, b.width * 0.11, b.height * 0.06);
      placed += 1;
    }
    // ROUND 배너 + 발사 잠금
    const banner = this.scene.add.text(w / 2, SPEC.canvas.height * 0.4, `ROUND ${n}`, {
      fontFamily: 'Arial Black, sans-serif', fontSize: fontPx(42), color: '#ffe066', stroke: '#1b3a2a', strokeThickness: strokePx(8),
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
    arrow._pierce += 1; // 화살은 계속 난다 (관통)
    const n = arrow._pierce;
    const base = target._kind === 'fruit' ? JUNGLE.fruitPoints : JUNGLE.balloonPoints;
    const pts = base * n * JUNGLE.pierceStep;
    const _x = target.x, _y = target.y, kind = target._kind;
    target.disableBody(true, true);
    this.stats.hits += 1;
    this.stats[kind === 'fruit' ? 'fruits' : 'balloons'] += 1;
    this.stats.pierceBest = Math.max(this.stats.pierceBest, n);
    this.scene.score.score += pts;
    if (kind === 'balloon') this.scene.score.coins += 1;
    Juice.burst(this.scene, _x, _y, kind === 'fruit' ? 0xff5d4f : 0x58c7f2, kind === 'fruit' ? ASSET_KEYS.fx.hit : ASSET_KEYS.fx.collect);
    Juice.scorePop(this.scene, _x, _y, n > 1 ? `PIERCE x${n} +${pts}` : `+${pts}`);
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxCollect, Math.min(0.75, 0.45 + n * 0.1));
    this.refreshHud();
    if (this.targets.countActive(true) === 0) this.clearRound();
  }

  onArrowFired() { this.arrowsLeft -= 1; this.refreshHud(); }

  // 화살 소멸(화면 밖) 시 호출 — 관통 0이면 헛샷
  onArrowDone(pierce) {
    if (pierce === 0) AudioManager.playSfx(this.scene, ASSET_KEYS.sfxHit, 0.3);
    this.checkExhausted();
  }

  checkExhausted() {
    if (this.scene.isOver) return;
    if (this.arrowsLeft <= 0 && this.scene.aim.arrows.countActive(true) === 0 && this.targets.countActive(true) > 0) {
      this.lastReason = 'arrows';
      this.scene.onHit();
    }
  }

  clearRound() {
    this.stats.roundsCleared += 1;
    const bonus = JUNGLE.roundClearBonus + Math.max(0, this.arrowsLeft) * JUNGLE.leftoverArrowBonus;
    this.scene.score.score += bonus;
    Juice.scorePop(this.scene, SPEC.canvas.width / 2, SPEC.canvas.height * 0.34, `CLEAR +${bonus}`);
    Juice.flash(this.scene, 0x7bffb0);
    if (this.round >= JUNGLE.maxRound) { this.lastReason = 'allclear'; return this.scene.onHit(); }
    this.scene.time.delayedCall(700, () => { if (!this.scene.isOver) this.startRound(this.round + 1); });
  }

  update() {
    // 과일: 제자리 바운스 / 풍선: 좌우 흔들 + (R4+) 상승 드리프트, 상단 랩
    this.targets.children.each((t) => {
      if (!t.active) return;
      t._t += 0.03;
      if (t._kind === 'fruit') {
        t.y = t._baseY + Math.sin(t._t) * su(8);
      } else {
        t.x += Math.sin(t._t) * su(0.5);
        if (t._drift) {
          t._baseY -= t._drift * (1 / 60);
          if (t._baseY < sy(140)) t._baseY = sy(340); // 위로 빠지면 아래서 재진입
        }
        t.y = t._baseY + Math.sin(t._t * 1.4) * su(5);
      }
    });
    this.checkExhausted();
  }

  refreshHud() {
    this.arrowText.setText(`ARROWS ${Math.max(0, this.arrowsLeft)}`);
    const wnd = this.cfg?.wind || 0;
    const dir = wnd === 0 ? '—' : (wnd > 0 ? '→' : '←');
    this.windText.setText(`WIND ${dir} ${Math.abs(Math.round((wnd / SCALE) / 10)) / 10}`);
    this.roundText.setText(`ROUND ${this.round}/${JUNGLE.maxRound}`);
  }
}
