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
    // 채우기 알파는 1로 둔다. 여기에 0.35를 주면 setAlpha()와 곱해져 실효 불투명도가
    // 4~15%까지 떨어진다 — 지면 접점을 읽기에는 너무 옅다. 불투명도는 ballVisuals가
    // 단독으로 소유해야 값 하나만 보고 세기를 판단할 수 있다.
    // (프레임 고정 실측: 접지 +85/255, 최고점 +21/255 — 높이에 따라 옅어지되 남는다.)
    this.shadow = scene.add.ellipse(0, 0, 52 * unit, 20 * unit, 0x000000, 1)
      .setDepth(11).setVisible(false);
    this.sprite = scene.add.image(0, 0, 'match-ball')
      .setDepth(14).setVisible(false).setActive(false);
    this.baseSize = 46 * unit;
    this.state = BALL_STATE.IDLE;
    this.reboundCount = 0;
    this.liveMs = 0;
  }

  get alive() { return this.state === BALL_STATE.FLIGHT || this.state === BALL_STATE.LIVE; }

  launch({ type, fromX, fromY, toX, goalY, crossbarLiftPx }) {
    this.type = type;
    this.x = fromX;
    this.y = fromY;
    this.startY = fromY;
    this.goalY = goalY;
    // height=1이 도착 시 크로스바에 오도록 하는 화면 리프트(px). 씬이 실측으로 준다.
    this.crossbarLiftPx = crossbarLiftPx;
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
    this.shadow.setVisible(true);
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
    // 리바운드 중에도 원근은 지면 위치가 결정한다. progress를 갱신하지 않으면 튕겨 나간 공이
    // 마지막 비행 크기 그대로 굳는다.
    this.progress = Math.max(0, Math.min(1, (this.y - this.startY) / Math.max(1, this.goalY - this.startY)));
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

  // this.y는 **지면 위 발자국**이다. 공은 높이만큼 그 위로 들어 올려 그리고, 그림자는
  // 발자국에 그대로 둔다. 이전 구현은 반대로 그림자를 공보다 아래로 밀어내서, 높은 공일수록
  // 그림자가 앞으로 나가 공이 지면보다 낮게 읽혔다.
  sync() {
    const v = ballVisuals(this, this.u);
    const size = this.baseSize * v.scale;
    this.sprite.setPosition(this.x, this.y - v.lift).setDisplaySize(size, size);
    this.sprite.angle += this.vx * 0.02;
    this.shadow.setPosition(this.x, this.y)
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
