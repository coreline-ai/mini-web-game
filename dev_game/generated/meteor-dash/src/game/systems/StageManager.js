import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';

// Full-canvas stage background that swaps as the difficulty level rises. Uses textures
// from ASSET_KEYS.backgrounds (present when production art exists); falls back to a solid color.
export default class StageManager {
  constructor(scene) {
    this.scene = scene;
    this.keys = Object.values(ASSET_KEYS.backgrounds).filter((key) => scene.textures.exists(key));
    this.current = -1;
    if (this.keys.length) {
      this.image = scene.add.image(0, 0, this.keys[0]).setOrigin(0).setDisplaySize(SPEC.canvas.width, SPEC.canvas.height).setDepth(-10);
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
    const next = this.scene.add.image(0, 0, this.keys[idx]).setOrigin(0).setDisplaySize(SPEC.canvas.width, SPEC.canvas.height).setDepth(-10).setAlpha(0);
    const prev = this.image;
    this.image = next;
    this.scene.tweens.add({ targets: next, alpha: 1, duration: 500, onComplete: () => { if (prev) prev.destroy(); } });
  }
}
