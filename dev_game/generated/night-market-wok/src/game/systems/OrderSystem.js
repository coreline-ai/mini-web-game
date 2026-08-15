// OrderSystem.js — owns what each customer wants and how far the cook has got.
//
// An order is a fixed sequence, not a set: tapping the right ingredients in the wrong order
// is a mistake. That sequencing is the whole game, so the judge lives here rather than being
// scattered through the scene.

import { RECIPES, maxStepsFor } from '../config/recipeConfig.js';

let nextOrderId = 1;

export default class OrderSystem {
  constructor() {
    this.reset();
  }

  reset() {
    nextOrderId = 1;
    this.servedCount = 0;
    this.mistakeCount = 0;
  }

  // Pick a recipe whose length is unlocked by how many bowls have already gone out.
  createOrder() {
    const cap = maxStepsFor(this.servedCount);
    const pool = RECIPES.filter((r) => r.steps.length <= cap);
    const recipe = pool[Math.floor(Math.random() * pool.length)] || RECIPES[0];
    return {
      id: nextOrderId++,
      recipeId: recipe.id,
      name: recipe.name,
      steps: [...recipe.steps],
      progress: 0,
    };
  }

  // Returns 'correct' | 'complete' | 'wrong'. 'complete' also counts as correct.
  judgeTap(order, ingredientId) {
    if (!order || order.progress >= order.steps.length) return 'wrong';
    const expected = order.steps[order.progress];
    if (expected !== ingredientId) {
      this.mistakeCount += 1;
      order.progress = 0; // burnt wok: the bowl restarts, the order does not change
      return 'wrong';
    }
    order.progress += 1;
    return order.progress >= order.steps.length ? 'complete' : 'correct';
  }

  markServed() {
    this.servedCount += 1;
  }

  remainingSteps(order) {
    if (!order) return [];
    return order.steps.slice(order.progress);
  }
}
