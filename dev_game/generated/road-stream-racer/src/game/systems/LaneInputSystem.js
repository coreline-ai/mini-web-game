import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';

export default class LaneInputSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.enabled = true;
    this.laneCount = SPEC.racing.lanes;
    this.roadLeft = SPEC.racing.road.left;
    this.roadRight = SPEC.racing.road.right;
    this.laneWidth = (this.roadRight - this.roadLeft) / this.laneCount;
    this.lane = Math.floor(this.laneCount / 2);
    this.targetLane = this.lane;
    this.targetX = this.centerForLane(this.lane);
    this.velocityX = 0;
    this.moveStartX = this.targetX;
    this.moveStartTime = 0;
    this.moveDurationMs = 260;
    this.moveProgress = 1;
    this.lastInput = 'spawn';
    this.lastLaneChangeAt = -Infinity;
    this.activePointerId = null;
    this.pointerAnchorX = 0;
    this.pointerStartX = 0;
    this.pointerStartY = 0;
    this.pointerStartLane = this.lane;
    this.dragThreshold = Math.max(48, this.laneWidth * 0.22);
    this.tapDeadzone = Math.max(58, this.laneWidth * 0.26);
    this.inputCooldownMs = 58;
    this.controlTopY = SPEC.canvas.height * 0.15;
    this.cursors = scene.input.keyboard?.createCursorKeys();
    this.keys = scene.input.keyboard?.addKeys('A,D,LEFT,RIGHT');
    this.lastKeyAt = 0;
    this.onPointerDown = (pointer) => this.startPointer(pointer);
    this.onPointerMove = (pointer) => this.dragPointer(pointer);
    this.onPointerUp = (pointer) => this.releasePointer(pointer);
    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointermove', this.onPointerMove);
    scene.input.on('pointerup', this.onPointerUp);
    scene.input.on('pointerupoutside', this.onPointerUp);
  }

  centerForLane(lane) {
    return this.roadLeft + this.laneWidth * (lane + 0.5);
  }

  pointerKey(pointer) {
    return pointer.id ?? pointer.pointerId ?? 1;
  }

  worldPointer(pointer) {
    const camera = this.scene.cameras?.main;
    const world = typeof pointer.positionToCamera === 'function' && camera
      ? pointer.positionToCamera(camera)
      : null;
    let x = world?.x ?? pointer.worldX ?? pointer.x;
    let y = world?.y ?? pointer.worldY ?? pointer.y;
    const bounds = this.scene.scale?.canvasBounds || this.scene.sys.game.canvas?.getBoundingClientRect?.();
    const event = pointer.event;
    if (bounds?.width && bounds?.height && event && bounds.width < SPEC.canvas.width * 0.75) {
      const localX = event.clientX - bounds.left;
      const localY = event.clientY - bounds.top;
      if (Number.isFinite(localX) && Math.abs(x - localX) < 4) x *= SPEC.canvas.width / bounds.width;
      if (Number.isFinite(localY) && Math.abs(y - localY) < 4) y *= SPEC.canvas.height / bounds.height;
    }
    return {
      id: this.pointerKey(pointer),
      x,
      y,
    };
  }

  requestLane(lane, reason = 'direct', time = this.scene.time.now, force = false) {
    if (!this.enabled) return;
    if (!force && time - this.lastLaneChangeAt < this.inputCooldownMs) return;
    const nextLane = Phaser.Math.Clamp(Math.round(lane), 0, this.laneCount - 1);
    if (nextLane === this.targetLane) return;
    const laneDistance = Math.max(1, Math.abs(nextLane - this.targetLane));
    this.moveStartX = this.player.x;
    this.moveStartTime = time;
    this.moveDurationMs = 260 + (laneDistance - 1) * 90;
    this.moveProgress = 0;
    this.targetLane = nextLane;
    this.lane = nextLane;
    this.targetX = this.centerForLane(nextLane);
    this.lastLaneChangeAt = time;
    this.lastInput = reason;
  }

  setLaneFromX(x) {
    if (!this.enabled) return;
    const lane = Math.floor((Phaser.Math.Clamp(x, this.roadLeft, this.roadRight - 1) - this.roadLeft) / this.laneWidth);
    this.requestLane(lane, 'tap', this.scene.time.now, true);
  }

  stepLane(direction, reason, time = this.scene.time.now) {
    if (!direction) return;
    this.requestLane(this.targetLane + Math.sign(direction), reason, time);
  }

  startPointer(pointer) {
    const p = this.worldPointer(pointer);
    if (!this.enabled || p.y < this.controlTopY || this.activePointerId !== null) return;
    this.activePointerId = p.id;
    this.pointerStartX = p.x;
    this.pointerStartY = p.y;
    this.pointerAnchorX = p.x;
    this.pointerStartLane = this.targetLane;
  }

  dragPointer(pointer) {
    const p = this.worldPointer(pointer);
    if (!this.enabled || p.id !== this.activePointerId) return;
    const dx = p.x - this.pointerAnchorX;
    if (Math.abs(dx) < this.dragThreshold) return;
    const lane = Math.floor((Phaser.Math.Clamp(p.x, this.roadLeft, this.roadRight - 1) - this.roadLeft) / this.laneWidth);
    this.requestLane(lane, 'drag', this.scene.time.now, true);
    this.pointerAnchorX = p.x;
  }

  releasePointer(pointer) {
    const p = this.worldPointer(pointer);
    if (p.id !== this.activePointerId) return;
    const dx = p.x - this.pointerStartX;
    const dy = p.y - this.pointerStartY;
    const moved = Math.hypot(dx, dy);
    if (this.enabled && moved < this.tapDeadzone && p.y >= this.controlTopY) {
      const tappedLane = Math.floor((Phaser.Math.Clamp(p.x, this.roadLeft, this.roadRight - 1) - this.roadLeft) / this.laneWidth);
      this.requestLane(tappedLane, 'tap', this.scene.time.now, true);
    }
    this.activePointerId = null;
  }

  update(time, delta) {
    if (!this.enabled) return;
    const leftDown = this.cursors?.left?.isDown || this.keys?.A?.isDown || this.keys?.LEFT?.isDown;
    const rightDown = this.cursors?.right?.isDown || this.keys?.D?.isDown || this.keys?.RIGHT?.isDown;
    if (time - this.lastKeyAt > 88) {
      if (leftDown) {
        this.stepLane(-1, 'keyboard', time);
        this.lastKeyAt = time;
      } else if (rightDown) {
        this.stepLane(1, 'keyboard', time);
        this.lastKeyAt = time;
      }
    }

    const dt = Math.min(delta / 1000, 0.05);
    const previousX = this.player.x;
    const distance = this.targetX - this.moveStartX;
    if (Math.abs(distance) > 0.5 && this.moveProgress < 1) {
      const rawT = Phaser.Math.Clamp((time - this.moveStartTime) / this.moveDurationMs, 0, 1);
      const easedT = Phaser.Math.Easing.Sine.InOut(rawT);
      this.moveProgress = rawT;
      this.player.x = Phaser.Math.Linear(this.moveStartX, this.targetX, easedT);
      if (rawT >= 1) {
        this.player.x = this.targetX;
        this.moveProgress = 1;
      }
    } else if (Math.abs(this.targetX - this.player.x) < 0.75) {
      this.player.x = this.targetX;
      this.moveProgress = 1;
    }
    this.velocityX = (this.player.x - previousX) / Math.max(dt, 0.001);
    if (this.moveProgress >= 1) this.velocityX = 0;
    const targetAngle = Phaser.Math.Clamp(this.velocityX / 210, -10, 10);
    this.player.angle = Phaser.Math.Linear(this.player.angle, targetAngle, 1 - Math.exp(-16 * dt));
  }

  snapshot() {
    return {
      lane: this.lane,
      targetLane: this.targetLane,
      targetX: Math.round(this.targetX),
      velocityX: Math.round(this.velocityX),
      moveProgress: Number(this.moveProgress.toFixed(2)),
      moveDurationMs: this.moveDurationMs,
      changingLane: Math.abs(this.targetX - this.player.x) > 1.2,
      activePointer: this.activePointerId !== null,
      lastInput: this.lastInput,
    };
  }

  destroy() {
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointermove', this.onPointerMove);
    this.scene.input.off('pointerup', this.onPointerUp);
    this.scene.input.off('pointerupoutside', this.onPointerUp);
  }
}
