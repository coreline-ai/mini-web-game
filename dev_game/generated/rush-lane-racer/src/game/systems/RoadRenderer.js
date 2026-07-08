import Phaser from 'phaser';
import { SPEC } from '../data/spec.js';
import { TUNING } from '../constants/tuning.js';
import { BACKGROUND_KEYS } from '../constants/gameKeys.js';

function rect(scene, x, y, w, h, color, alpha = 1, depth = 0) {
  return scene.add.rectangle(x, y, w, h, color, alpha).setOrigin(0.5).setDepth(depth);
}

function coverImage(image, width, height) {
  const src = image.texture.getSourceImage();
  const scale = Math.max(width / src.width, height / src.height);
  image.setScale(scale);
}

export default class RoadRenderer {
  constructor(scene, interactive = true) {
    this.scene = scene;
    this.interactive = interactive;
    this.stripes = [];
    this.drawBase(interactive);
  }

  drawBase(interactive) {
    const { width, height } = SPEC.canvas;
    this.currentBgIndex = 0;
    if (this.scene.textures.exists(BACKGROUND_KEYS[0])) {
      this.bg = this.scene.add.image(width / 2, height / 2, BACKGROUND_KEYS[0]).setDepth(-70);
      coverImage(this.bg, width, height);
    } else {
      rect(this.scene, width / 2, height / 2, width, height, 0x123047, 1, -70);
    }

    // High-quality AI background stays visible; overlays only add speed/gameplay readability.
    rect(this.scene, width / 2, height / 2, width, height, 0x001425, interactive ? 0.08 : 0.16, -62);
    rect(this.scene, width / 2, height / 2, TUNING.roadWidth + 62, height, 0x00101b, interactive ? 0.08 : 0.12, -42);
    rect(this.scene, TUNING.roadLeft, height / 2, 10, height, 0x2df2ff, 0.42, -38);
    rect(this.scene, TUNING.roadRight, height / 2, 10, height, 0x2df2ff, 0.42, -38);
    rect(this.scene, TUNING.roadLeft - 22, height / 2, 14, height, 0xffffff, 0.16, -39);
    rect(this.scene, TUNING.roadRight + 22, height / 2, 14, height, 0xffffff, 0.16, -39);

    const total = Math.ceil(height / (TUNING.stripeHeight + TUNING.stripeGap)) + 3;
    for (let lane = 1; lane < TUNING.laneCount; lane += 1) {
      const x = TUNING.roadLeft + TUNING.laneWidth * lane;
      for (let i = 0; i < total; i += 1) {
        const y = i * (TUNING.stripeHeight + TUNING.stripeGap) - TUNING.stripeHeight;
        const stripe = rect(this.scene, x, y, Math.max(8, TUNING.stripeWidth * 0.72), TUNING.stripeHeight * 0.82, 0xffffff, 0.38, -36);
        this.stripes.push(stripe);
      }
    }

    if (interactive) {
      this.vignette = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.10).setDepth(90).setBlendMode(Phaser.BlendModes.MULTIPLY);
    }
  }

  setStage(stage = 1) {
    if (!this.bg) return;
    const index = Math.max(0, Math.min(BACKGROUND_KEYS.length - 1, (Math.max(1, stage) - 1) % BACKGROUND_KEYS.length));
    if (index === this.currentBgIndex || !this.scene.textures.exists(BACKGROUND_KEYS[index])) return;
    this.currentBgIndex = index;
    this.bg.setTexture(BACKGROUND_KEYS[index]);
    coverImage(this.bg, SPEC.canvas.width, SPEC.canvas.height);
    this.bg.setAlpha(0.78);
    this.scene.tweens.add({ targets: this.bg, alpha: 1, duration: 360, ease: 'Cubic.easeOut' });
  }

  update(delta, speed, nitroActive = false, warningActive = false, stage = 1) {
    this.setStage(stage);
    const move = (speed * (nitroActive ? 1.22 : 1) * delta) / 1000;
    const wrap = TUNING.stripeHeight + TUNING.stripeGap;
    for (const stripe of this.stripes) {
      stripe.y += move;
      if (stripe.y > SPEC.canvas.height + TUNING.stripeHeight) stripe.y -= wrap * Math.ceil((SPEC.canvas.height + TUNING.stripeHeight * 2) / wrap);
      stripe.setAlpha(warningActive ? 0.78 : nitroActive ? 0.56 : 0.38);
      stripe.setFillStyle(warningActive ? 0xff5934 : nitroActive ? 0x7effff : 0xffffff, warningActive ? 0.78 : 0.38);
    }
  }
}
