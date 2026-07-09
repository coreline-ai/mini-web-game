import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';

export default class RoadSegmentSystem {
  constructor(scene) {
    this.scene = scene;
    this.segmentHeight = SPEC.canvas.height;
    this.segmentKeys = [ASSET_KEYS.roadFlatLoop];
    this.recycleCount = 0;
    this.segments = [];
    this.createSegments();
  }

  createSegments() {
    const { width, height } = SPEC.canvas;
    const count = Math.ceil(height / this.segmentHeight) + 1;
    for (let i = 0; i < count; i += 1) {
      const key = this.segmentKeys[i % this.segmentKeys.length];
      const y = i * this.segmentHeight - this.segmentHeight / 2;
      const segment = this.scene.add.image(width / 2, y, key)
        .setOrigin(0.5)
        .setDepth(1)
        .setDisplaySize(width, this.segmentHeight);
      segment.segmentKey = key;
      this.segments.push(segment);
    }
  }

  update(delta, speed) {
    const dt = delta / 1000;
    const { width, height } = SPEC.canvas;
    for (const segment of this.segments) segment.y += speed * dt;

    let topY = Math.min(...this.segments.map((segment) => segment.y));
    for (const segment of this.segments) {
      if (segment.y - this.segmentHeight / 2 > height) {
        this.recycleCount += 1;
        topY -= this.segmentHeight;
        const key = this.segmentKeys[this.recycleCount % this.segmentKeys.length];
        segment.setTexture(key);
        segment.segmentKey = key;
        segment.setDisplaySize(width, this.segmentHeight);
        segment.y = topY;
      }
    }
  }

  snapshot() {
    return {
      segmentHeight: this.segmentHeight,
      recycleCount: this.recycleCount,
      segments: this.segments.map((segment) => ({
        key: segment.segmentKey,
        y: Math.round(segment.y),
      })),
    };
  }
}
