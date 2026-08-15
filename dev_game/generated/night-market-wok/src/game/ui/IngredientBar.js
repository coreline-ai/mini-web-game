// IngredientBar.js — the five tap targets that are the entire control scheme.
//
// Buttons are one-shot per pointerdown and ignore taps while the scene is finishing, so a
// burst of fast taps cannot double-fire a step or fire into a transition
// (post-production-qa-contract.md class I).

import Phaser from 'phaser';
import { INGREDIENTS } from '../config/recipeConfig.js';
import { U } from '../constants/tuning.js';

export default class IngredientBar {
  constructor(scene, layout, onTap) {
    this.scene = scene;
    this.layout = layout;
    this.onTap = onTap;
    this.enabled = true;
    this.buttons = [];

    INGREDIENTS.forEach((ing, i) => {
      const x = layout.ingredientX(i);
      const y = layout.ingredientY;
      const size = layout.ingredientSize;

      const container = scene.add.container(x, y).setDepth(12);
      const pad = scene.add.rectangle(0, 0, size, size, 0x2b1a24, 0.92)
        .setStrokeStyle(2, 0x7a4a2f, 1);
      pad.setInteractive({ useHandCursor: true });

      const icon = scene.textures.exists(ing.texture)
        ? scene.add.image(0, -4 * U, ing.texture).setDisplaySize(size * 0.62, size * 0.62)
        : scene.add.rectangle(0, -4 * U, size * 0.5, size * 0.5, ing.tint);

      const label = scene.add.text(0, size * 0.32, ing.label, {
        fontFamily: 'system-ui, sans-serif', fontSize: 12 * U + 'px', color: '#ffe9c9',
      }).setOrigin(0.5);

      container.add([pad, icon, label]);

      pad.on('pointerdown', () => this.press(i));
      // Restoring on both up and out is what stops a button from staying visually held
      // when the finger slides off it.
      pad.on('pointerup', () => this.restore(i));
      pad.on('pointerout', () => this.restore(i));

      this.buttons.push({ id: ing.id, container, pad, icon, label, held: false });
    });
  }

  press(index) {
    const btn = this.buttons[index];
    if (!btn || !this.enabled || btn.held) return;
    btn.held = true;
    this.scene.tweens.killTweensOf(btn.container);
    btn.container.setScale(0.93);
    this.onTap(btn.id, btn);
  }

  restore(index) {
    const btn = this.buttons[index];
    if (!btn) return;
    btn.held = false;
    this.scene.tweens.killTweensOf(btn.container);
    this.scene.tweens.add({ targets: btn.container, scale: 1, duration: 110, ease: 'Quad.easeOut' });
  }

  flash(id, colour) {
    const btn = this.buttons.find((b) => b.id === id);
    if (!btn) return;
    const original = 0x2b1a24;
    btn.pad.setFillStyle(colour, 0.95);
    this.scene.time.delayedCall(150, () => {
      if (btn.pad && btn.pad.scene) btn.pad.setFillStyle(original, 0.92);
    });
  }

  setEnabled(value) {
    this.enabled = value;
    for (const btn of this.buttons) {
      if (!value) this.restore(this.buttons.indexOf(btn));
    }
  }

  setVisible(value) {
    for (const btn of this.buttons) btn.container.setVisible(value);
  }

  layoutEntries() {
    return this.buttons.map((b, i) => ({ id: `ingredient-${i}`, obj: b.pad }));
  }

  destroy() {
    for (const btn of this.buttons) {
      this.scene.tweens.killTweensOf(btn.container);
      btn.pad.removeAllListeners();
      btn.container.destroy();
    }
    this.buttons = [];
  }
}
