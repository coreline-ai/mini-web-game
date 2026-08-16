// Ball — 비행 → 세이브/실점 → 리바운드 → 퇴장.
//
// 리바운드가 살아 있는 것이 이 게임이 정적이지 않은 핵심 장치다. 다만 무한 핑퐁을 막기 위해
// 연쇄 횟수와 생존 시간에 상한을 둔다(config 소유).
//
// 상태 전이는 트윈이 아니라 물리 적분으로 일어나므로, 대신 **퇴장 확정 플래그**로 판정에서
// 제외한다. 퇴장한 공이 계속 판정에 참여하면 유령 실점이 생긴다(결함 클래스 A).

import { stepBall, ballVisuals, reflectWalls } from '../systems/BallPhysics.js';

export const BALL_STATE = Object.freeze({
  IDLE: 'idle',
  FLIGHT: 'flight',
  LIVE: 'live',       // 리바운드로 살아 있는 상태
  DEAD: 'dead',
});

export default class Ball {
  constructor(scene, { unit }) {
    this.scene = scene;
    this.u = unit;
    this.shadow = scene.add.ellipse(0, 0, 46 * unit, 18 * unit, 0x000000, 0.35)
      .setDepth(11).setVisible(false);
    this.sprite = scene.add.image(0, 0, 'match-ball')
      .setDepth(14).setVisible(false).setActive(false);
    this.baseSize = 46 * unit;
    this.state = BALL_STATE.IDLE;
    this.reboundCount = 0;
    this.liveMs = 0;
  }

  get alive() { return this.state === BALL_STATE.FLIGHT || this.state === BALL_STATE.LIVE; }

  launch({ type, fromX, fromY, toX, goalY }) {
    this.type = type;
    this.x = fromX;
    this.y = fromY;
    this.startY = fromY;
    this.goalY = goalY;
    this.speed = type.speed;
    this.vy = type.speed;
    // 도착점을 맞추도록 초기 가로 속도를 역산한다. 커브가 있으면 그만큼 미리 어긋나게 쏜다.
    const flightSec = (goalY - fromY) / type.speed;
    this.curve = type.curve;
    this.vx = (toX - fromX) / flightSec - 0.5 * type.curve * flightSec;
    this.targetHeight = type.height;
    this.arcPeak = type.height > 0.5 ? type.height * 0.55 : type.height * 0.25;
    this.height = 0;
    this.progress = 0;
    this.deflected = false;
    this.reboundCount = 0;
    this.liveMs = 0;
    this.state = BALL_STATE.FLIGHT;

    this.sprite.setTexture('match-ball').setVisible(true).setActive(true).setAlpha(1).setAngle(0);
    this.shadow.setVisible(true).setAlpha(0.35);
    this.sync();
  }

  // 세이브로 튕겨나간 공. 죽이지 않고 살려 두는 것이 설계 의도다.
  rebound(vec, rebound) {
    this.reboundCount += 1;
    if (this.reboundCount > rebound.maxChain) { this.retire(); return false; }
    this.state = BALL_STATE.LIVE;
    this.vx = vec.vx;
    this.vy = vec.vy;
    this.curve = 0;
    this.liveMs = 0;
    this.speed = Math.hypot(vec.vx, vec.vy);
    return true;
  }

  update(deltaMs, bounds, rebound) {
    if (!this.alive) return null;
    const dt = deltaMs / 1000;

    if (this.state === BALL_STATE.FLIGHT) {
      stepBall(this, dt);
      this.speed = Math.hypot(this.vx, this.vy);
      this.sync();
      if (this.y >= this.goalY) return 'goal-line';
      return null;
    }

    // 리바운드 상태: 중력으로 지면에 붙고 마찰로 느려진다.
    this.liveMs += deltaMs;
    this.vy += 1400 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.height = Math.max(0, this.height - dt * 1.4);
    this.vx *= 0.985;
    reflectWalls(this, bounds.minX, bounds.maxX);
    this.sync();

    if (this.liveMs >= rebound.liveMs || this.y > bounds.maxY || this.y < bounds.minY) {
      this.retire();
      return 'expired';
    }
    if (this.y >= this.goalY && this.vy > 0) return 'goal-line';
    return null;
  }

  sync() {
    const v = ballVisuals(this, this.u);
    const size = this.baseSize * v.scale;
    this.sprite.setPosition(this.x, this.y).setDisplaySize(size, size);
    this.sprite.angle += this.vx * 0.02;
    this.shadow.setPosition(this.x, this.y + v.shadowOffset)
      .setAlpha(v.shadowAlpha)
      .setScale(v.shadowScale, v.shadowScale * 0.55);
  }

  retire() {
    this.state = BALL_STATE.DEAD;
    this.sprite.setVisible(false).setActive(false);
    this.shadow.setVisible(false);
  }

  reset() { this.retire(); this.state = BALL_STATE.IDLE; }

  snapshot() {
    return {
      state: this.state,
      type: this.type?.id || null,
      x: Math.round(this.x || 0),
      height: Number((this.height || 0).toFixed(2)),
      rebounds: this.reboundCount,
      deflected: !!this.deflected,
      visible: this.sprite.visible,
      active: this.sprite.active,
      alpha: Number(this.sprite.alpha.toFixed(2)),
    };
  }

  destroy() { this.sprite.destroy(); this.shadow.destroy(); }
}
