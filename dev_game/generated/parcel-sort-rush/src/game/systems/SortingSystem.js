import Phaser from 'phaser';
import Parcel from '../entities/Parcel.js';
import { SPEC } from '../data/spec.js';
import { CONVEYOR, EVENTS, weightedParcelType, difficultyT, stageFromElapsed } from '../config/sortingConfig.js';

function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

export default class SortingSystem {
  constructor(scene, conveyor, score) {
    this.scene = scene;
    this.conveyor = conveyor;
    this.score = score;
    this.parcels = [];
    this.spawnAcc = CONVEYOR.spawnStartMs || 1250;
    this.dragging = null;
    this.lastEvent = null;
  }

  getParams(elapsedSec) {
    const t = difficultyT(elapsedSec);
    const stage = stageFromElapsed(elapsedSec);
    const cycle = elapsedSec % (EVENTS.rushEverySeconds || 35);
    const rushActive = elapsedSec > 8 && cycle < (EVENTS.rushDurationSeconds || 8);
    const spawnInterval = lerp(CONVEYOR.spawnStartMs, CONVEYOR.spawnMinMs, t) * (rushActive ? EVENTS.rushSpawnMultiplier || 0.62 : 1);
    const speed = lerp(CONVEYOR.speedStart, CONVEYOR.speedMax, t) * (rushActive ? EVENTS.rushSpeedMultiplier || 1.22 : 1);
    return { t, stage, rushActive, speed, spawnInterval };
  }

  update(delta, elapsedSec) {
    const params = this.getParams(elapsedSec);
    this.spawnAcc += delta;
    while (this.spawnAcc >= params.spawnInterval && this.parcels.length < 18) {
      this.spawnAcc -= params.spawnInterval;
      this.spawnParcel(params.speed);
    }
    for (const parcel of [...this.parcels]) {
      parcel.speed = params.speed;
      parcel.update(delta);
      if (!parcel.sorted && !parcel.dragging && parcel.y > CONVEYOR.missY) this.miss(parcel);
    }
    this.conveyor.update(delta, params.speed, params.rushActive);
    return params;
  }

  spawnParcel(speed) {
    const type = weightedParcelType();
    const laneJitter = Phaser.Math.Between(-145, 145);
    const x = Phaser.Math.Clamp(CONVEYOR.x + laneJitter, 300, SPEC.canvas.width - 300);
    // Spawn inside the visible conveyor lane. Spawning above topY made parcels appear
    // detached from the belt and partially hidden under the HUD on tall mobile views.
    const y = CONVEYOR.topY + 150 - Phaser.Math.Between(0, 38);
    const parcel = new Parcel(this.scene, x, y, type);
    parcel.speed = speed;
    parcel.spawnedAt = this.scene.time.now;
    this.parcels.push(parcel);
    return parcel;
  }

  pointerDown(pointer) {
    const candidates = [...this.parcels].filter((p) => p.active && !p.sorted && p.containsPoint(pointer.x, pointer.y));
    if (!candidates.length) return false;
    candidates.sort((a, b) => b.y - a.y || b.depth - a.depth);
    this.dragging = candidates[0];
    this.dragging.startDrag();
    return true;
  }

  pointerMove(pointer) {
    if (!this.dragging) return;
    this.dragging.dragTo(pointer.x, pointer.y);
  }

  pointerUp(pointer) {
    if (!this.dragging) return null;
    const parcel = this.dragging;
    parcel.stopDrag();
    this.dragging = null;
    const bin = this.conveyor.binAt(pointer.x, pointer.y);
    if (!bin) return { type: 'drop', parcel };
    if (bin.id === parcel.type.id) return this.correct(parcel, bin);
    return this.wrong(parcel, bin);
  }

  correct(parcel, bin) {
    const value = this.score.correct();
    this.lastEvent = { type: 'correct', value, parcelType: parcel.type.id, bin: bin.id, score: this.score.getScore(), sorted: this.score.sorted };
    this.scene.events.emit('parcel-correct', this.lastEvent);
    this.remove(parcel, true);
    return this.lastEvent;
  }

  wrong(parcel, bin) {
    this.score.fail('wrong');
    this.lastEvent = { type: 'wrong', parcelType: parcel.type.id, bin: bin.id, lives: this.score.lives };
    this.scene.events.emit('parcel-wrong', this.lastEvent);
    this.remove(parcel, false);
    return this.lastEvent;
  }

  miss(parcel) {
    this.score.fail('miss');
    this.lastEvent = { type: 'miss', parcelType: parcel.type.id, lives: this.score.lives };
    this.scene.events.emit('parcel-miss', this.lastEvent);
    this.remove(parcel, false);
  }

  remove(parcel, ok) {
    this.parcels = this.parcels.filter((p) => p !== parcel);
    parcel.removeWithTween(ok);
  }

  getFirstSortableParcel() {
    return this.parcels.find((p) => p.active && !p.sorted) || null;
  }

  getDebugState() {
    const first = this.getFirstSortableParcel();
    return {
      parcelCount: this.parcels.length,
      first: first ? { x: first.x, y: first.y, type: first.type.id, label: first.type.label } : null,
      score: this.score.getScore(),
      sorted: this.score.sorted,
      lives: this.score.lives,
      lastEvent: this.lastEvent,
    };
  }

  destroy() {
    for (const p of this.parcels) p.destroy();
    this.parcels = [];
  }
}
