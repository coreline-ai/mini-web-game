// KeeperController — 조작의 두 층. 이 게임의 정체성이 여기 있다.
//
//   느린 드래그 = 따라간다 (대가 없음, 대신 관성과 최고 속도가 있어 순간이동 불가)
//   빠른 플릭   = 몸을 던진다 (도달 범위 2배, 대신 회복 시간 동안 아무것도 못 한다)
//
// 대가가 실질적이어야 선택이 성립하므로, 회복 중에는 드래그 입력을 **완전히 무시**한다.
// 무시하지 않으면 다이브가 공짜가 되고 게임이 "계속 던지기"로 무너진다.

export const KEEPER_STATE = Object.freeze({
  READY: 'ready',
  DIVING: 'diving',
  RECOVERING: 'recovering',
  CATCHING: 'catching',
});

export default class KeeperController {
  constructor(scene, { unit, control, minX, maxX, homeX }) {
    this.scene = scene;
    this.u = unit;
    this.c = control;
    this.minX = minX;
    this.maxX = maxX;
    this.x = homeX;
    this.vx = 0;
    this.targetX = homeX;
    this.state = KEEPER_STATE.READY;
    this.diveDir = 0;
    this.stateUntil = 0;
    this.activePointerId = null;
    this.lastPointerX = 0;
    this.lastPointerAt = 0;
  }

  get diving() { return this.state === KEEPER_STATE.DIVING; }
  get locked() { return this.state === KEEPER_STATE.DIVING || this.state === KEEPER_STATE.RECOVERING; }

  // 도달 범위 — 다이브 중에는 뻗은 팔만큼 늘어난다. 판정 body가 이 값을 그대로 쓴다(클래스 M).
  reachHalfWidth(baseHalf) {
    return this.diving ? baseHalf * this.c.diveReachMultiplier : baseHalf;
  }

  beginPointer(pointer) {
    if (this.activePointerId !== null) return false; // 멀티터치 차단
    this.activePointerId = pointer.id ?? 0;
    this.lastPointerX = pointer.worldX ?? pointer.x;
    this.lastPointerAt = this.scene.time.now;
    return true;
  }

  // 포인터 이동 속도로 드래그와 플릭을 가른다. 임계는 config가 소유한다.
  movePointer(pointer) {
    if (this.activePointerId === null) return null;
    if ((pointer.id ?? 0) !== this.activePointerId) return null;
    const now = this.scene.time.now;
    const px = pointer.worldX ?? pointer.x;
    const dt = Math.max(1, now - this.lastPointerAt) / 1000;
    const speed = (px - this.lastPointerX) / dt;
    this.lastPointerX = px;
    this.lastPointerAt = now;

    if (Math.abs(speed) >= this.c.diveFlickSpeed && !this.locked) {
      this.startDive(Math.sign(speed));
      return 'dive';
    }
    if (!this.locked) {
      this.targetX = Math.max(this.minX, Math.min(this.maxX, px));
      return 'drag';
    }
    return null; // 회복 중 — 입력을 버린다
  }

  endPointer(pointer) {
    if (this.activePointerId === null) return;
    if (pointer && (pointer.id ?? 0) !== this.activePointerId) return;
    this.activePointerId = null;
  }

  startDive(dir) {
    if (this.locked || dir === 0) return false;
    this.state = KEEPER_STATE.DIVING;
    this.diveDir = dir;
    this.stateUntil = this.scene.time.now + this.c.diveDurationMs;
    this.targetX = Math.max(this.minX, Math.min(this.maxX, this.x + dir * this.c.diveTravel));
    return true;
  }

  // 캐치 연출은 잠깐 자세만 바꾼다 — 이동을 막지는 않는다(세이브가 벌이 되면 안 된다).
  playCatch(durationMs = 260) {
    if (this.locked) return;
    this.state = KEEPER_STATE.CATCHING;
    this.stateUntil = this.scene.time.now + durationMs;
  }

  update(deltaMs) {
    const now = this.scene.time.now;
    if (this.state === KEEPER_STATE.DIVING && now >= this.stateUntil) {
      this.state = KEEPER_STATE.RECOVERING;
      this.stateUntil = now + this.c.diveRecoveryMs;
    } else if (this.state === KEEPER_STATE.RECOVERING && now >= this.stateUntil) {
      this.state = KEEPER_STATE.READY;
      this.diveDir = 0;
      this.targetX = this.x;
    } else if (this.state === KEEPER_STATE.CATCHING && now >= this.stateUntil) {
      this.state = KEEPER_STATE.READY;
    }

    // 관성 이동 — 목표로 가속하되 최고 속도를 넘지 않는다. 순간이동을 막는 장치.
    const dt = deltaMs / 1000;
    const dx = this.targetX - this.x;
    const desired = Math.max(-this.c.dragMaxSpeed, Math.min(this.c.dragMaxSpeed, dx / Math.max(0.016, dt)));
    const dv = Math.max(-this.c.dragAccel * dt, Math.min(this.c.dragAccel * dt, desired - this.vx));
    this.vx += dv;
    this.x = Math.max(this.minX, Math.min(this.maxX, this.x + this.vx * dt));
    if (Math.abs(dx) < 2 && !this.diving) this.vx *= 0.6;
    return this.x;
  }

  reset(homeX) {
    this.x = homeX;
    this.targetX = homeX;
    this.vx = 0;
    this.state = KEEPER_STATE.READY;
    this.diveDir = 0;
    this.activePointerId = null;
  }

  snapshot() {
    return {
      state: this.state,
      x: Math.round(this.x),
      vx: Math.round(this.vx),
      diving: this.diving,
      locked: this.locked,
      pointerActive: this.activePointerId !== null,
    };
  }
}
