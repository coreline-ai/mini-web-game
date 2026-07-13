import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { SHOOTING } from '../config/shootingConfig.js';
import { su, sx } from '../constants/tuning.js';
import MovingTarget from '../entities/MovingTarget.js';

export default class TargetSystem {
  constructor(scene, textureKey) {
    this.scene = scene;
    this.target = new MovingTarget(scene, textureKey);
    this.streak = 0;
    this.spawnIndex = 0;
    this.spawn(1);
  }

  spawn(level = 1, stageIndex = 0) {
    const t = Phaser.Math.Clamp((level - 1) / Math.max(1, SPEC.difficulty.maxLevel || 14), 0, 1);
    const size = Phaser.Math.Linear(SHOOTING.targetSizeStart, SHOOTING.targetSizeMin, t);
    const speed = Phaser.Math.Linear(SHOOTING.targetSpeedStart, SHOOTING.targetSpeedMax, t) + stageIndex * sx(28);
    const row = SHOOTING.targetRows[this.spawnIndex % SHOOTING.targetRows.length];
    const y = Math.round(SPEC.canvas.height * row);
    const fromLeft = this.spawnIndex % 2 === 0;
    const edgeMargin = Math.max(SHOOTING.targetEdgeMargin, SHOOTING.hitBurstPeakRadius, size * 0.5 + su(24));
    const x = fromLeft ? edgeMargin : SPEC.canvas.width - edgeMargin;
    this.spawnIndex += 1;
    this.target.reset({ x, y, size, speed, direction: fromLeft ? 1 : -1, edgeMargin });
  }

  update(delta) {
    this.target.update(delta);
  }

  evaluateShot(x, y) {
    if (!this.target.alive || this.target.sprite.alpha < 0.5) return { result: 'miss', distance: Infinity, score: -SHOOTING.missScorePenalty };
    const distance = this.target.distanceTo(x, y);
    const perfectRadius = this.target.radius * SHOOTING.perfectRadiusRatio;
    const hitRadius = this.target.radius;
    if (distance <= perfectRadius) return { result: 'perfect', distance, score: SHOOTING.perfectScore };
    if (distance <= hitRadius) return { result: 'hit', distance, score: SHOOTING.hitScore };
    return { result: 'miss', distance, score: -SHOOTING.missScorePenalty };
  }

  consumeHit(level, stageIndex = 0, shouldRespawn = true) {
    this.target.hideWithHit(() => {
      if (shouldRespawn) this.spawn(level, stageIndex);
    });
  }
}
