// CustomerQueue.js — the three counter seats: arrival, patience, departure.
//
// Seats are reused, so every departure has to fully reset its visuals before the next
// customer sits down. Respawn is driven from the leave tween's onComplete rather than a
// parallel timer, which is what stops a seat from showing two customers at once
// (post-production-qa-contract.md class A).

import Phaser from 'phaser';
import { CUSTOMER_TYPES, RULES, patienceMsFor, arrivalMsFor } from '../config/recipeConfig.js';
import { U } from '../constants/tuning.js';

export default class CustomerQueue {
  constructor(scene, orderSystem, layout) {
    this.scene = scene;
    this.orders = orderSystem;
    this.layout = layout;
    this.slots = [];
    this.arrivalTimer = 0;
    this.focusIndex = 0;

    for (let i = 0; i < RULES.slots; i += 1) {
      this.slots.push(this.buildSlot(i));
    }
    // Start with one customer so the first screen is never empty and teaches the loop.
    this.seat(this.slots[0]);
  }

  buildSlot(index) {
    const { scene, layout } = this;
    const x = layout.slotX(index);
    const y = layout.slotY;
    const container = scene.add.container(x, y).setDepth(6);

    const sprite = scene.add.image(0, 0, 'cust_regular').setDisplaySize(layout.slotSize, layout.slotSize);
    const barBack = scene.add.rectangle(0, layout.slotSize * 0.56, layout.slotSize * 0.86, 9 * U, 0x2a1720)
      .setStrokeStyle(1, 0x000000, 0.35);
    const barFill = scene.add.rectangle(0, layout.slotSize * 0.56, layout.slotSize * 0.86, 9 * U, 0x6fdc8c).setOrigin(0.5);
    const dish = scene.add.text(0, -layout.slotSize * 0.62, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: 13 * U + 'px', color: '#fff3e0',
    }).setOrigin(0.5);

    container.add([sprite, barBack, barFill, dish]);
    container.setVisible(false);

    return {
      index, container, sprite, barBack, barFill, dish,
      active: false, leaving: false,
      order: null, type: null,
      patienceMs: 0, patienceMaxMs: 1,
    };
  }

  // Two seats showing the same customer with the same dish read as a rendering bug even
  // though both are legal draws. Prefer something not already on the counter; fall back to a
  // free pick when every option is taken so seating never stalls.
  pickDistinct(options, taken, key) {
    const fresh = options.filter((o) => !taken.includes(key(o)));
    const pool = fresh.length ? fresh : options;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  seat(slot) {
    if (!slot || slot.active || slot.leaving) return;
    const seated = this.slots.filter((s) => s.active && !s.leaving);
    const type = this.pickDistinct(CUSTOMER_TYPES, seated.map((s) => s.type?.id), (t) => t.id);

    let order = this.orders.createOrder();
    const takenRecipes = seated.map((s) => s.order?.recipeId);
    for (let i = 0; i < 4 && takenRecipes.includes(order.recipeId); i += 1) {
      order = this.orders.createOrder();
    }

    slot.active = true;
    slot.leaving = false;
    slot.type = type;
    slot.order = order;
    slot.patienceMaxMs = patienceMsFor(this.orders.servedCount, type);
    slot.patienceMs = slot.patienceMaxMs;

    // Full visual reset — a reused seat must not inherit the previous customer's state.
    this.scene.tweens.killTweensOf(slot.container);
    slot.container.setVisible(true).setAlpha(1).setScale(1);
    slot.container.x = this.layout.slotX(slot.index);
    slot.container.y = this.layout.slotY;
    slot.sprite.setTexture(this.scene.textures.exists(type.texture) ? type.texture : 'cust_regular');
    slot.sprite.setDisplaySize(this.layout.slotSize, this.layout.slotSize);
    slot.sprite.setAlpha(1).clearTint();
    slot.dish.setText(order.name);
    this.updateBar(slot);

    this.scene.tweens.add({
      targets: slot.container, y: this.layout.slotY, from: this.layout.slotY - 18 * U,
      duration: 220, ease: 'Back.easeOut',
    });
  }

  updateBar(slot) {
    const ratio = Phaser.Math.Clamp(slot.patienceMs / slot.patienceMaxMs, 0, 1);
    const full = this.layout.slotSize * 0.86;
    slot.barFill.width = Math.max(1, full * ratio);
    const colour = ratio > 0.5 ? 0x6fdc8c : ratio > 0.25 ? 0xf2c14a : 0xe4574f;
    slot.barFill.setFillStyle(colour);
  }

  focused() {
    const slot = this.slots[this.focusIndex];
    return slot && slot.active && !slot.leaving ? slot : this.firstActive();
  }

  firstActive() {
    return this.slots.find((s) => s.active && !s.leaving) || null;
  }

  focusSlot(index) {
    const slot = this.slots[index];
    if (!slot || !slot.active || slot.leaving) return false;
    this.focusIndex = index;
    return true;
  }

  // Served happily: fly the seat out, then let it take a new customer on completion.
  release(slot, mood) {
    if (!slot || !slot.active || slot.leaving) return;
    slot.leaving = true;
    slot.active = false;
    slot.order = null;

    const dy = mood === 'served' ? -26 * U : 26 * U;
    this.scene.tweens.killTweensOf(slot.container);
    this.scene.tweens.add({
      targets: slot.container,
      alpha: 0,
      y: this.layout.slotY + dy,
      duration: 260,
      ease: 'Sine.easeIn',
      onComplete: () => {
        slot.leaving = false;
        slot.container.setVisible(false).setAlpha(1);
        slot.container.y = this.layout.slotY;
      },
    });
  }

  update(delta, elapsedSec, onTimeout) {
    for (const slot of this.slots) {
      if (!slot.active || slot.leaving) continue;
      slot.patienceMs -= delta;
      if (slot.patienceMs <= 0) {
        slot.patienceMs = 0;
        this.updateBar(slot);
        this.release(slot, 'left');
        onTimeout(slot);
        continue;
      }
      this.updateBar(slot);
    }

    if (this.focused() === null) {
      const next = this.firstActive();
      if (next) this.focusIndex = next.index;
    }

    this.arrivalTimer -= delta;
    if (this.arrivalTimer <= 0) {
      const free = this.slots.find((s) => !s.active && !s.leaving);
      if (free) this.seat(free);
      this.arrivalTimer = arrivalMsFor(elapsedSec);
    }
  }

  layoutEntries() {
    return this.slots
      .filter((s) => s.active && !s.leaving)
      .map((s) => ({ id: `customer-${s.index}`, obj: s.sprite }));
  }

  destroy() {
    for (const slot of this.slots) {
      this.scene.tweens.killTweensOf(slot.container);
      slot.container.destroy();
    }
    this.slots = [];
  }
}
