// OrderTicket.js — the ticket the cook is reading right now.
//
// Steps already added are dimmed and ticked rather than removed, so the player can always see
// where they are in the sequence instead of inferring it from what disappeared.

import { ingredientById } from '../config/recipeConfig.js';
import { U } from '../constants/tuning.js';

export default class OrderTicket {
  constructor(scene, layout) {
    this.scene = scene;
    this.layout = layout;
    this.stepIcons = [];

    const { x, y, width, height } = layout.ticket;
    this.container = scene.add.container(x, y).setDepth(9);

    this.panel = scene.textures.exists('ui_order_ticket')
      ? scene.add.image(0, 0, 'ui_order_ticket').setDisplaySize(width, height)
      : scene.add.rectangle(0, 0, width, height, 0xf6e7cd, 0.96).setStrokeStyle(2, 0xc0472f);

    this.title = scene.add.text(0, -height * 0.28, '주문 대기 중', {
      fontFamily: 'system-ui, sans-serif', fontSize: 15 * U + 'px', color: '#4a2318', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.hint = scene.add.text(0, height * 0.34, '재료를 순서대로 탭하세요', {
      fontFamily: 'system-ui, sans-serif', fontSize: 11 * U + 'px', color: '#7a5443',
    }).setOrigin(0.5);

    this.container.add([this.panel, this.title, this.hint]);
  }

  render(order) {
    for (const icon of this.stepIcons) icon.destroy();
    this.stepIcons = [];

    if (!order) {
      this.title.setText('주문 대기 중');
      this.hint.setText('손님이 앉으면 주문이 표시됩니다');
      return;
    }

    this.title.setText(order.name);
    this.hint.setText(`${order.progress} / ${order.steps.length} 단계`);

    const { height } = this.layout.ticket;
    const gap = 44 * U;
    const startX = -((order.steps.length - 1) * gap) / 2;

    order.steps.forEach((stepId, i) => {
      const ing = ingredientById(stepId);
      const done = i < order.progress;
      const x = startX + i * gap;
      const y = height * 0.02;

      const icon = this.scene.textures.exists(ing.texture)
        ? this.scene.add.image(x, y, ing.texture).setDisplaySize(32 * U, 32 * U)
        : this.scene.add.rectangle(x, y, 26 * U, 26 * U, ing.tint);

      icon.setAlpha(done ? 0.35 : 1);
      this.container.add(icon);
      this.stepIcons.push(icon);

      if (done) {
        const tick = this.scene.add.text(x + 10 * U, y - 12 * U, '✓', {
          fontFamily: 'system-ui, sans-serif', fontSize: 13 * U + 'px', color: '#2e7d32', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.container.add(tick);
        this.stepIcons.push(tick);
      } else if (i === order.progress) {
        // Only the next required step gets the pulse — the game never shows two "do this now".
        const ring = this.scene.add.circle(x, y, 22 * U).setStrokeStyle(2, 0xc0472f, 0.9);
        this.container.add(ring);
        this.stepIcons.push(ring);
        this.scene.tweens.add({
          targets: ring, scale: { from: 0.86, to: 1.06 }, alpha: { from: 0.9, to: 0.45 },
          duration: 520, yoyo: true, repeat: -1,
        });
      }
    });
  }

  setVisible(value) {
    this.container.setVisible(value);
  }

  layoutEntries() {
    // The title is printed ON the ticket by design, so the overlap is declared rather than
    // being reported as a layout defect.
    return [
      { id: 'order-panel', obj: this.panel, allowOverlapWith: ['order-title'] },
      { id: 'order-title', obj: this.title, allowOverlapWith: ['order-panel'] },
    ];
  }

  destroy() {
    for (const icon of this.stepIcons) {
      this.scene.tweens.killTweensOf(icon);
      icon.destroy();
    }
    this.stepIcons = [];
    this.container.destroy();
  }
}
