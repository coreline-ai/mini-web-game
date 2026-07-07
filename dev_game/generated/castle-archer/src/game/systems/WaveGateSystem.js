import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { TUNING } from '../constants/tuning.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { Juice } from '../systems/Juice.js';

// Castle Archer 고유 시스템 ②: 성문 HP + 웨이브 + 다양한 적 HP + 정밀 사격 판정.
// - 성문 HP 3: 몬스터가 성벽 라인에 도달하면 -1 (원힛 사망 대신 방어전 규칙)
// - 방패병/브루트는 2~3발 필요
// - 화살이 중심선에 가까우면 정밀 사격 2배
// - 웨이브 = 난이도 레벨. 웨이브 상승 시 배너 + 보너스
export const GATE = {
  maxHp: 3,
  killPoints: 30,
  headshotMult: 2,
  shieldBreakPoints: 10,
  headshotBand: 0.30,
  waveBonus: 100,
};

export default class WaveGateSystem {
  constructor(scene) {
    this.scene = scene;
    this.hp = GATE.maxHp;
    this.wave = 1;
    this.spawnCount = 0;
    this.stats = { kills: 0, headshots: 0, shieldBreaks: 0, breaches: 0, heals: 0 };

    // 성문 HP 하트 (상단 중앙) — ui_heart 텍스처 없으면 그래픽 폴백
    if (!scene.textures.exists('ui_heart')) {
      const g = scene.add.graphics();
      g.fillStyle(0xff5b6e, 1);
      g.fillCircle(9, 9, 9); g.fillCircle(23, 9, 9);
      g.fillTriangle(1, 13, 31, 13, 16, 32);
      g.generateTexture('ui_heart', 32, 32);
      g.destroy();
    }
    this.hearts = [];
    const cx = SPEC.canvas.width / 2;
    for (let i = 0; i < GATE.maxHp; i += 1) {
      const h = scene.add.image(cx + (i - (GATE.maxHp - 1) / 2) * 40, 44, 'ui_heart').setDepth(20).setDisplaySize(30, 30);
      this.hearts.push(h);
    }

    this.waveText = scene.add.text(cx, 44, 'WAVE 1', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '16px', color: '#ffffff', stroke: '#1b2a4a', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20).setY(74);
  }

  // 새로 스폰된 몬스터 구성. 새 Spawner는 타입을 직접 넣지만,
  // 구형 풀 오브젝트/QA 강제 스폰 대비 최소 기본값을 보정한다.
  configureNewMonsters() {
    this.scene.spawner.hazards.children.each((m) => {
      if (!m.active || m._cfg) return;
      m._cfg = true;
      this.spawnCount += 1;
      m.setAngularVelocity(0).setAngle(0);
      m._enemyType = m._enemyType || 'basic';
      m._hp = m._hp || 1;
      m._maxHp = m._maxHp || m._hp;
      m._points = m._points || GATE.killPoints;
      m.clearTint();
    });
  }

  onArrowHitMonster(arrow, monster) {
    if (!arrow.active || !monster.active) return;
    arrow.disableBody(true, true);
    // 크리티컬 = 정조준(수평 중심 ±16% 이내 관통). 화살은 항상 아래에서 맞으므로
    // "상단 명중"은 물리적으로 거의 불가능 → 수평 정밀도 기준으로 판정한다.
    const isHead = Math.abs(arrow.x - monster.x) < monster.displayWidth * 0.16;
    monster._hp = (monster._hp || 1) - 1;
    if (monster._hp > 0) {
      const shieldBreak = monster._enemyType === 'shield' && monster._hp === 1;
      if (shieldBreak) {
        this.stats.shieldBreaks += 1;
        this.scene.score.score += GATE.shieldBreakPoints;
        monster.setTexture(ASSET_KEYS.enemyBasic, 0);
        const animKey = `${ASSET_KEYS.enemyBasic}_walk`;
        if (this.scene.anims.exists(animKey)) monster.play(animKey, true);
      }
      monster.clearTint();
      monster.setTintFill(monster._enemyType === 'brute' ? 0xff8b54 : 0x9fd7ff);
      this.scene.time.delayedCall(80, () => { if (monster.active) monster.clearTint(); });
      Juice.burst(this.scene, monster.x, monster.y, 0x9fd7ff, 'fx_hit');
      Juice.scorePop(this.scene, monster.x, monster.y, shieldBreak ? 'SHIELD!' : `HP ${monster._hp}`);
      AudioManager.playSfx(this.scene, ASSET_KEYS.sfxHit, 0.4);
      return;
    }
    const pts = (monster._points || GATE.killPoints) * (isHead ? GATE.headshotMult : 1);
    this.scene.score.score += pts;
    this.stats.kills += 1;
    if (isHead) this.stats.headshots += 1;
    const _x = monster.x, _y = monster.y;
    monster._cfg = false; // 풀 재사용 대비 상태 리셋
    monster.disableBody(true, true);
    Juice.burst(this.scene, _x, _y, isHead ? 0xffe066 : 0x7bc44e, isHead ? 'fx_sparkle' : 'fx_hit');
    Juice.scorePop(this.scene, _x, _y, isHead ? 'CRITICAL +' + pts : '+' + pts);
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxCollect, 0.5);
  }

  onPotionShot(arrow, potion) {
    if (!arrow.active || !potion.active) return;
    arrow.disableBody(true, true);
    this.collectPotion(potion);
  }

  collectPotion(potion) {
    if (!potion.active) return;
    const _x = potion.x, _y = potion.y;
    potion.disableBody(true, true);
    this.scene.score.addCollectible();
    if (this.hp < GATE.maxHp) {
      this.hp += 1;
      this.stats.heals += 1;
      this.renderHearts();
      Juice.scorePop(this.scene, _x, _y, '+1 GATE');
    } else {
      Juice.scorePop(this.scene, _x, _y, '+' + (SPEC.collectibles?.scoreValue || 50));
    }
    Juice.burst(this.scene, _x, _y, 0xff6b81, 'fx_collect');
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxCollect, 0.55);
  }

  // 몬스터가 성벽 라인 돌파 → 성문 피해
  damageGate(monster) {
    if (!monster.active || this.scene.isOver) return;
    const _x = monster.x, _y = monster.y;
    monster._cfg = false; // 풀 재사용 대비 상태 리셋
    monster.disableBody(true, true);
    this.hp -= 1;
    this.stats.breaches += 1;
    this.renderHearts();
    Juice.shake(this.scene);
    Juice.flash(this.scene, 0xff5555);
    Juice.burst(this.scene, _x, Math.min(_y, TUNING.playerY), 0xff5555, 'fx_hit');
    AudioManager.playSfx(this.scene, ASSET_KEYS.sfxHit, 0.65);
    if (this.hp <= 0) this.scene.onHit();
  }

  renderHearts() {
    this.hearts.forEach((h, i) => h.setAlpha(i < this.hp ? 1 : 0.22));
  }

  setVisible(visible) {
    this.hearts.forEach((h) => h.setVisible(visible));
    this.waveText.setVisible(visible);
  }

  update() {
    this.configureNewMonsters();
    // 성벽 돌파 판정
    const landY = TUNING.playerY - Math.max(68, TUNING.hazardSize * 0.78);
    this.scene.spawner.hazards.children.each((m) => {
      if (m.active && m.y > landY) this.damageGate(m);
    });
    // 웨이브 표시 (스포너 레벨과 동기화)
    const level = this.scene.currentLevel || 1;
    if (level !== this.wave) {
      this.wave = level;
      this.scene.score.score += GATE.waveBonus * (this.wave - 1);
      this.waveText.setText('WAVE ' + this.wave);
      const banner = this.scene.add.text(SPEC.canvas.width / 2, SPEC.canvas.height * 0.4, 'WAVE ' + this.wave, {
        fontFamily: 'Arial Black, sans-serif', fontSize: '42px', color: '#ffe066', stroke: '#1b2a4a', strokeThickness: 8,
      }).setOrigin(0.5).setDepth(30).setAlpha(0);
      this.scene.tweens.add({
        targets: banner, alpha: 1, scale: { from: 0.6, to: 1 }, duration: 260, yoyo: true, hold: 620,
        onComplete: () => banner.destroy(),
      });
      AudioManager.playSfx(this.scene, ASSET_KEYS.sfxStart, 0.4);
    }
  }
}
