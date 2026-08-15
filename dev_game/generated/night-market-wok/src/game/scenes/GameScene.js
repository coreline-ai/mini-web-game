import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { AudioManager } from '../systems/AudioManager.js';
import OrderSystem from '../systems/OrderSystem.js';
import CustomerQueue from '../systems/CustomerQueue.js';
import ComboSystem from '../systems/ComboSystem.js';
import IngredientBar from '../ui/IngredientBar.js';
import OrderTicket from '../ui/OrderTicket.js';
import HudUI from '../ui/HudUI.js';
import { publishLayout, clearLayout } from '../systems/LayoutRegistry.js';
import StageManager from '../systems/StageManager.js';
import { Juice } from '../systems/Juice.js';
import { RULES } from '../config/recipeConfig.js';
import { U } from '../constants/tuning.js';

// Night Market Wok — read the order, tap the ingredients in sequence, serve before patience runs out.
// The arcade Foundation's falling-hazard loop is intentionally not used: there is no player
// movement and nothing falls. What survives from the shell is the scene flow, audio, save data,
// layout publication, and stage backgrounds.
export default class GameScene extends Phaser.Scene {
  constructor() { super(SCENES.GAME); }

  buildLayout() {
    const { width, height } = SPEC.canvas;
    // 레이아웃은 390x844 디자인 단위로 기술하고 U로 환산한다 — 논리 캔버스를 키운 것은
    // 화면 구성을 바꾸기 위해서가 아니라 DPR backing store를 채우기 위해서다.
    const barWidth = 330 * U;
    const btn = 58 * U;
    const gap = (barWidth - btn * 5) / 4;
    return {
      slotSize: 92 * U,
      slotY: height * 0.27,
      slotX: (i) => width / 2 + (i - 1) * 112 * U,
      ticket: { x: width / 2, y: height * 0.475, width: 330 * U, height: 128 * U },
      wok: { x: width / 2, y: height * 0.635 },
      ingredientY: height * 0.845,
      ingredientSize: btn,
      ingredientX: (i) => (width - barWidth) / 2 + btn / 2 + i * (btn + gap),
    };
  }

  create() {
    this.isOver = false;
    this.layout = this.buildLayout();
    this.elapsedMs = 0;
    this.score = 0;
    this.strikes = 0;

    this.orders = new OrderSystem();
    this.combo = new ComboSystem();
    this.stage = new StageManager(this);

    this.ticket = new OrderTicket(this, this.layout);
    this.queue = new CustomerQueue(this, this.orders, this.layout);
    this.bar = new IngredientBar(this, this.layout, (id) => this.onIngredientTap(id));

    this.buildWokStation();

    this.hud = new HudUI(this, () => this.openPause());
    this.comboText = this.add.text(SPEC.canvas.width / 2, 22 * U, '', {
      fontFamily: 'Arial Black, Arial', fontSize: 16 * U + 'px', color: '#ffd54a', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(20);
    this.strikeText = this.add.text(18 * U, 44 * U, '', {
      fontFamily: 'Arial Black, Arial', fontSize: 14 * U + 'px', color: '#ff9b8a', stroke: '#000000', strokeThickness: 3,
    }).setDepth(20);
    this.hud.levelText.setVisible(false);

    // Seat selection: tapping a waiting customer moves the ticket to their order.
    this.queue.slots.forEach((slot) => {
      slot.sprite.setInteractive({ useHandCursor: true });
      slot.sprite.on('pointerdown', () => {
        if (this.isOver) return;
        if (this.queue.focusSlot(slot.index)) this.refreshTicket();
      });
    });

    this.visibilityHandler = () => { if (document.hidden && !this.isOver) this.openPause(); };
    if (SPEC.performance.pauseWhenHidden) document.addEventListener('visibilitychange', this.visibilityHandler);
    AudioManager.playGameplayMusic(this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResume, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.exposeQaHook();
    this.refreshTicket();
  }

  buildWokStation() {
    const { wok } = this.layout;
    this.chef = this.add.image(wok.x, wok.y, ASSET_KEYS.player).setDepth(8);
    const aspect = (this.chef.width / this.chef.height) || 1;
    this.chef.setDisplaySize(112 * U * aspect, 112 * U);
    this.chefBaseScale = this.chef.scale;
    this.wokGlow = this.add.ellipse(wok.x, wok.y + 46 * U, 132 * U, 26 * U, 0xff8a3d, 0.22).setDepth(7);
  }

  // The cook is a single sprite, not a walk cycle — he stands at the wok. The "cooking" beat
  // is a stir reaction driven by tweens so every correct tap reads as an action on screen.
  cookReaction() {
    this.tweens.killTweensOf(this.chef);
    this.chef.setScale(this.chefBaseScale);
    this.chef.angle = 0;
    this.tweens.add({
      targets: this.chef,
      scale: this.chefBaseScale * 1.07,
      angle: -5,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => { this.chef.setScale(this.chefBaseScale); this.chef.angle = 0; },
    });
    this.tweens.add({ targets: this.wokGlow, scaleX: 1.14, scaleY: 1.2, duration: 90, yoyo: true });
  }

  refreshTicket() {
    const slot = this.queue.focused();
    this.ticket.render(slot ? slot.order : null);
    for (const s of this.queue.slots) {
      const isFocus = slot && s.index === slot.index;
      s.sprite.setAlpha(!s.active || s.leaving ? 1 : isFocus ? 1 : 0.62);
    }
  }

  onIngredientTap(ingredientId) {
    if (this.isOver) return;
    const slot = this.queue.focused();
    if (!slot) return;

    const verdict = this.orders.judgeTap(slot.order, ingredientId);

    if (verdict === 'wrong') {
      this.combo.onMistake();
      slot.patienceMs = Math.max(0, slot.patienceMs - RULES.wrongTapPatiencePenaltyMs);
      this.queue.updateBar(slot);
      this.bar.flash(ingredientId, 0x8c2f2a);
      Juice.shake(this, 0.008, 160);
      if (this.textures.exists(ASSET_KEYS.hazard)) {
        Juice.burst(this, this.layout.wok.x, this.layout.wok.y, 0xff5555, ASSET_KEYS.hazard);
      }
      AudioManager.playSfx(this, ASSET_KEYS.sfxHit, 0.5);
      this.refreshTicket();
      return;
    }

    this.score += RULES.scorePerStep;
    this.bar.flash(ingredientId, 0x2f6f43);
    this.cookReaction();

    if (verdict === 'complete') {
      this.serve(slot);
    } else {
      AudioManager.playSfx(this, ASSET_KEYS.sfxCollect, 0.3);
      this.refreshTicket();
    }
  }

  serve(slot) {
    const gained = this.combo.serveScore();
    this.score += gained;
    this.orders.markServed();
    this.combo.onServe();

    const bowl = this.add.image(this.layout.wok.x, this.layout.wok.y - 12 * U, ASSET_KEYS.collectible).setDepth(14);
    bowl.setDisplaySize(56 * U, 56 * U);
    this.tweens.add({
      targets: bowl,
      x: slot.container.x,
      y: slot.container.y,
      scale: 0.7,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        Juice.burst(this, slot.container.x, slot.container.y, 0xffe066, this.textures.exists('fx_combo') ? 'fx_combo' : 'fx_collect');
        Juice.scorePop(this, slot.container.x, slot.container.y, '+' + gained);
        bowl.destroy();
        this.queue.release(slot, 'served');
        this.refreshTicket();
      },
    });

    AudioManager.playSfx(this, ASSET_KEYS.sfxCollect, 0.6);
  }

  onCustomerTimeout() {
    this.combo.onMistake();
    this.strikes += 1;
    Juice.flash(this, 0xff5555, 120);
    AudioManager.playSfx(this, ASSET_KEYS.sfxHit, 0.55);
    this.refreshTicket();
    if (this.strikes >= RULES.strikesAllowed) this.finish();
  }

  update(time, delta) {
    if (this.isOver) return;
    this.elapsedMs += delta;
    const elapsedSec = this.elapsedMs / 1000;

    this.queue.update(delta, elapsedSec, () => this.onCustomerTimeout());
    this.stage.setLevel(1 + Math.min(11, Math.floor(this.orders.servedCount / 3)));

    this.hud.update(this.score, 1);
    this.comboText.setText(this.combo.stack > 1 ? `COMBO x${this.combo.multiplier}` : '');
    this.strikeText.setText('LEFT ' + '●'.repeat(Math.max(0, RULES.strikesAllowed - this.strikes)));

    const entries = [
      { id: 'score', obj: this.hud.scoreText },
      { id: 'strikes', obj: this.strikeText },
      { id: 'pause', obj: this.hud.pause.bg },
      ...this.ticket.layoutEntries(),
      ...this.bar.layoutEntries(),
      ...this.queue.layoutEntries(),
    ];
    publishLayout(this, entries, {
      requiredIds: ['score', 'strikes', 'pause', 'order-panel', 'order-title', 'ingredient-0', 'ingredient-4'],
    });
  }

  finish() {
    if (this.isOver) return;
    this.isOver = true;
    this.bar.setEnabled(false);
    Juice.shake(this);
    AudioManager.playSfx(this, ASSET_KEYS.sfxGameOver, 0.55);
    AudioManager.stopMusic();
    this.scene.start(SCENES.GAMEOVER, { score: this.score, coins: this.orders.servedCount });
  }

  openPause() {
    if (this.isOver || this.scene.isPaused()) return;
    AudioManager.pauseMusic();
    this.hud.setVisible(false);
    this.hud.levelText.setVisible(false);
    this.comboText.setVisible(false);
    this.strikeText.setVisible(false);
    this.bar.setEnabled(false);
    this.scene.launch(SCENES.PAUSE);
    this.scene.pause();
  }

  onResume() {
    if (this.isOver) return;
    this.hud.setVisible(true);
    this.hud.levelText.setVisible(false);
    this.comboText.setVisible(true);
    this.strikeText.setVisible(true);
    this.bar.setEnabled(true);
  }

  // Machine-readable state for captured-state QA and browser smoke.
  exposeQaHook() {
    if (typeof window === 'undefined') return;
    window.__GAME_QA__ = {
      getState: () => ({
        scene: SCENES.GAME,
        score: this.score,
        served: this.orders.servedCount,
        mistakes: this.orders.mistakeCount,
        strikes: this.strikes,
        comboStack: this.combo.stack,
        comboMultiplier: this.combo.multiplier,
        activeCustomers: this.queue ? this.queue.slots.filter((s) => s.active && !s.leaving).length : 0,
        // Seats mid-departure are still drawn while they fade, so they are counted separately.
        // Comparing raw visibility against active count would flag every normal exit as a
        // duplicate; what actually matters is the invariant below.
        visibleCustomers: this.queue ? this.queue.slots.filter((s) => s.container.visible && !s.leaving).length : 0,
        leavingCustomers: this.queue ? this.queue.slots.filter((s) => s.leaving).length : 0,
        // A seat can never be occupied and departing at once — that is the class A failure
        // (a new customer seated on top of one still animating out).
        seatConflicts: this.queue ? this.queue.slots.filter((s) => s.active && s.leaving).length : 0,
        focusedOrder: (() => {
          const slot = this.queue && this.queue.focused();
          return slot && slot.order ? { name: slot.order.name, progress: slot.order.progress, steps: slot.order.steps.length } : null;
        })(),
        isOver: this.isOver,
      }),
      tapIngredient: (id) => this.onIngredientTap(id),
      tapCorrect: () => {
        const slot = this.queue && this.queue.focused();
        if (!slot || !slot.order) return null;
        const next = slot.order.steps[slot.order.progress];
        this.onIngredientTap(next);
        return next;
      },
      tapWrong: () => {
        const slot = this.queue && this.queue.focused();
        if (!slot || !slot.order) return null;
        const next = slot.order.steps[slot.order.progress];
        const wrong = ['noodle', 'broth', 'scallion', 'pork', 'egg'].find((i) => i !== next);
        this.onIngredientTap(wrong);
        return wrong;
      },
      forceTimeout: () => {
        const slot = this.queue && this.queue.focused();
        if (slot) slot.patienceMs = 1;
      },
    };
  }

  cleanup() {
    this.events.off(Phaser.Scenes.Events.RESUME, this.onResume, this);
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.bar) this.bar.destroy();
    if (this.ticket) this.ticket.destroy();
    if (this.queue) this.queue.destroy();
    if (typeof window !== 'undefined') delete window.__GAME_QA__;
    clearLayout();
  }
}
