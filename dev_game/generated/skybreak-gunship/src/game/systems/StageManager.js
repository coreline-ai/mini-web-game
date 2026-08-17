import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';

// Full-canvas stage background that swaps as the difficulty level rises. Uses textures
// keyed bg_0, bg_1, ... (present when production art exists); falls back to a solid color.
export default class StageManager {
  // 비율 유지 + 중앙 크롭(cover): 어떤 해상도의 배경이 와도 스트레치 왜곡이 없다.
  static coverFit(img) {
    const s = Math.max(SPEC.canvas.width / img.width, SPEC.canvas.height / img.height);
    img.setScale(s);
    return img;
  }
  constructor(scene) {
    this.scene = scene;
    this.keys = [];
    for (let i = 0; i < 8; i += 1) { if (scene.textures.exists('bg_' + i)) this.keys.push('bg_' + i); }
    this.current = -1;
    if (this.keys.length) {
      this.image = StageManager.coverFit(scene.add.image(SPEC.canvas.width / 2, SPEC.canvas.height / 2, this.keys[0]).setDepth(-10));
      this.current = 0;
    } else {
      const c = Phaser.Display.Color.HexStringToColor(SPEC.theme.colors?.background || SPEC.canvas.backgroundColor).color;
      scene.add.rectangle(0, 0, SPEC.canvas.width, SPEC.canvas.height, c).setOrigin(0).setDepth(-10);
    }
  }
  setLevel(level) {
    if (this.keys.length < 2) return;
    const idx = Math.min(this.keys.length - 1, Math.max(0, Math.floor((level - 1) / 3)));
    if (idx === this.current) return;
    this.current = idx;
    const next = StageManager.coverFit(this.scene.add.image(SPEC.canvas.width / 2, SPEC.canvas.height / 2, this.keys[idx]).setDepth(-10).setAlpha(0));
    const prev = this.image;
    this.image = next;
    this.scene.tweens.add({ targets: next, alpha: 1, duration: 500, onComplete: () => { if (prev) prev.destroy(); } });
  }
}
