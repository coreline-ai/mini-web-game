// Ship — 등장 → 대기(인내심 소진) → 항로 진입 / 표류·난파 의 생명주기.
//
// 결함 클래스 A(생명주기 경합) 방지 규칙을 구조로 강제한다:
//  - 상태 전이는 반드시 트윈의 onComplete 안에서만 일어난다. 트윈이 도는 도중에 다음
//    상태가 시작되면 알파/스케일이 뒤섞인 유령 스프라이트가 남는다.
//  - 재사용 시 killTweensOf + 전체 시각/상태 리셋을 강제한다.
//  - retired(퇴장 확정) 배는 판정·점수·충돌에서 완전히 제외된다.

import Phaser from 'phaser';
import { requestOf, codeOf } from '../systems/SignalCodec.js';

export const SHIP_STATE = Object.freeze({
  ARRIVING: 'arriving',
  WAITING: 'waiting',
  ROUTING: 'routing',
  WRECKING: 'wrecking',
  RETIRED: 'retired',
});

export default class Ship {
  constructor(scene, { unit }) {
    this.scene = scene;
    this.u = unit;
    this.sprite = scene.add.image(0, 0, 'ship-cargo').setVisible(false).setActive(false);
    this.glyph = scene.add.text(0, 0, '', {
      fontFamily: 'Arial Black,Arial', fontSize: `${Math.round(34 * unit)}px`, color: '#ffcf6b',
      stroke: '#04101d', strokeThickness: Math.max(3, Math.round(5 * unit)),
    }).setOrigin(0.5).setVisible(false);
    this.patienceBg = scene.add.rectangle(0, 0, 86 * unit, 8 * unit, 0x04101d, 0.85).setVisible(false);
    this.patienceBar = scene.add.rectangle(0, 0, 82 * unit, 5 * unit, 0xffcf6b, 1).setVisible(false);
    this.state = SHIP_STATE.RETIRED;
    this.requestId = null;
    this.patienceMs = 0;
    this.patienceLeft = 0;
  }

  get active() {
    return this.state === SHIP_STATE.WAITING;
  }

  get visibleOnScreen() {
    return this.sprite.visible;
  }

  // 완전 리셋 후 등장. 재사용 전에 이전 트윈을 반드시 죽인다.
  launch({ textureKey, requestId, patienceMs, laneY, fromX, toX }) {
    this.scene.tweens.killTweensOf([this.sprite, this.glyph, this.patienceBg, this.patienceBar]);
    this.requestId = requestId;
    this.patienceMs = patienceMs;
    this.patienceLeft = patienceMs;
    this.state = SHIP_STATE.ARRIVING;
    this.targetX = toX;

    const targetW = 190 * this.u;
    this.sprite.setTexture(textureKey).setVisible(true).setActive(true).setAlpha(0).setAngle(0).setScale(1);
    const scale = targetW / (this.sprite.width || targetW);
    this.sprite.setScale(scale);
    this.baseScale = scale;
    this.sprite.setPosition(fromX, laneY);

    this.glyph.setText(requestOf(requestId)?.glyph || '?').setVisible(true).setAlpha(0).setScale(1);
    this.patienceBg.setVisible(true).setAlpha(0);
    this.patienceBar.setVisible(true).setAlpha(0).setScale(1, 1);
    this.syncDecor();

    this.scene.tweens.add({
      targets: [this.sprite, this.glyph, this.patienceBg, this.patienceBar],
      alpha: 1, duration: 320,
    });
    this.scene.tweens.add({
      targets: this.sprite, x: toX, duration: 900, ease: 'Sine.easeOut',
      onUpdate: () => this.syncDecor(),
      onComplete: () => {
        // 도착 트윈이 끝난 뒤에만 대기 상태로 넘어간다.
        if (this.state === SHIP_STATE.ARRIVING) this.state = SHIP_STATE.WAITING;
      },
    });
  }

  // 도착 연출을 건너뛰고 즉시 대기 상태로 만든다(캡처·테스트 전용).
  // 트윈만 죽이면 배가 화면 밖 시작 위치에 남아, 패널은 주문을 표시하는데 배는 보이지 않는
  // 불가능한 화면이 캡처된다 — 실제로 캡처 검토에서 발견한 결함이다.
  settleNow() {
    this.scene.tweens.killTweensOf([this.sprite, this.glyph, this.patienceBg, this.patienceBar]);
    this.sprite.setAlpha(1).setVisible(true).setActive(true);
    if (typeof this.targetX === 'number') this.sprite.x = this.targetX;
    this.glyph.setAlpha(1).setVisible(true);
    this.patienceBg.setAlpha(1).setVisible(true);
    this.patienceBar.setAlpha(1).setVisible(true);
    this.syncDecor();
    this.state = SHIP_STATE.WAITING;
  }

  syncDecor() {
    const s = this.sprite;
    const top = s.y - (s.displayHeight * 0.5);
    this.glyph.setPosition(s.x, top - 34 * this.u);
    this.patienceBg.setPosition(s.x, top - 12 * this.u);
    this.patienceBar.setPosition(s.x - (this.patienceBg.width - 4 * this.u) / 2, top - 12 * this.u).setOrigin(0, 0.5);
  }

  tick(deltaMs) {
    if (this.state !== SHIP_STATE.WAITING) return false;
    this.patienceLeft = Math.max(0, this.patienceLeft - deltaMs);
    const ratio = this.patienceMs ? this.patienceLeft / this.patienceMs : 0;
    this.patienceBar.setScale(Math.max(0.001, ratio), 1);
    this.patienceBar.fillColor = ratio > 0.5 ? 0xffcf6b : ratio > 0.25 ? 0xff9d4a : 0xff5f5f;
    return this.patienceLeft <= 0;
  }

  damagePatience(ratio) {
    this.patienceLeft = Math.max(0, this.patienceLeft - this.patienceMs * ratio);
  }

  expectedCode() {
    return codeOf(this.requestId);
  }

  patienceRatio() {
    return this.patienceMs ? this.patienceLeft / this.patienceMs : 0;
  }

  // 성공 퇴장 — 항로로 빠져나간다. RETIRED 전이는 onComplete 안에서만.
  routeOut(onDone) {
    if (this.state !== SHIP_STATE.WAITING) return;
    this.state = SHIP_STATE.ROUTING;
    this.scene.tweens.killTweensOf([this.sprite, this.glyph, this.patienceBg, this.patienceBar]);
    this.glyph.setVisible(false);
    this.patienceBg.setVisible(false);
    this.patienceBar.setVisible(false);
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + 260 * this.u, y: this.sprite.y - 70 * this.u, alpha: 0,
      duration: 620, ease: 'Sine.easeIn',
      onComplete: () => { this.retire(); onDone?.(); },
    });
  }

  // 난파 퇴장 — 난파선 텍스처로 바뀌고 기울며 가라앉는다.
  wreck(onDone) {
    if (this.state !== SHIP_STATE.WAITING && this.state !== SHIP_STATE.ARRIVING) return;
    this.state = SHIP_STATE.WRECKING;
    this.scene.tweens.killTweensOf([this.sprite, this.glyph, this.patienceBg, this.patienceBar]);
    this.glyph.setVisible(false);
    this.patienceBg.setVisible(false);
    this.patienceBar.setVisible(false);
    if (this.scene.textures.exists('ship-wreck')) {
      this.sprite.setTexture('ship-wreck');
      this.sprite.setScale((190 * this.u) / (this.sprite.width || 190 * this.u));
    }
    this.scene.tweens.add({
      targets: this.sprite,
      angle: 22, y: this.sprite.y + 54 * this.u, alpha: 0,
      duration: 760, ease: 'Sine.easeIn',
      onComplete: () => { this.retire(); onDone?.(); },
    });
  }

  // 퇴장 확정. 이 시점 이후로는 어떤 판정에도 참여하지 않는다.
  retire() {
    this.state = SHIP_STATE.RETIRED;
    this.requestId = null;
    this.scene.tweens.killTweensOf([this.sprite, this.glyph, this.patienceBg, this.patienceBar]);
    this.sprite.setVisible(false).setActive(false).setAlpha(0).setAngle(0);
    this.glyph.setVisible(false).setAlpha(0);
    this.patienceBg.setVisible(false).setAlpha(0);
    this.patienceBar.setVisible(false).setAlpha(0);
  }

  snapshot() {
    return {
      state: this.state,
      requestId: this.requestId,
      alpha: Number(this.sprite.alpha.toFixed(3)),
      visible: this.sprite.visible,
      active: this.sprite.active,
    };
  }

  destroy() {
    this.scene.tweens.killTweensOf([this.sprite, this.glyph, this.patienceBg, this.patienceBar]);
    this.sprite.destroy();
    this.glyph.destroy();
    this.patienceBg.destroy();
    this.patienceBar.destroy();
  }
}
