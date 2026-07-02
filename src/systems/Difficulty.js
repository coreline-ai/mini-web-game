import { GC } from '../config/gameConfig.js';

// 시간 기반 난이도 상승. 순수 함수적 계산만 담당(부수효과 없음).
export default class Difficulty {
  // elapsedMs: 게임 시작 후 경과 시간(ms)
  getParams(elapsedMs) {
    const t = Math.max(0, elapsedMs) / 1000; // seconds
    const d = GC.DIFF;

    const fallSpeed = Phaser.Math.Clamp(
      d.BASE_SPEED + t * d.SPEED_RAMP,
      d.BASE_SPEED,
      d.MAX_SPEED,
    );

    const spawnInterval = Phaser.Math.Clamp(
      d.BASE_INTERVAL - t * d.INT_RAMP,
      d.MIN_INTERVAL,
      d.BASE_INTERVAL,
    );

    const concurrentMax = Math.min(
      1 + Math.floor(t / d.CONCURRENT_EVERY),
      d.CONCURRENT_MAX_CAP,
    );

    return { fallSpeed, spawnInterval, concurrentMax };
  }
}
