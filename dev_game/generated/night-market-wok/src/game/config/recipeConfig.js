// recipeConfig.js — the data behind Night Market Wok's cooking loop.
//
// Everything the difficulty curve reads is monotonic in elapsed time or in how many bowls
// have been served. Nothing here is driven by a player-replenishable resource such as
// remaining patience or current score, which is what keeps the game from getting easier the
// better you play (post-production-qa-contract.md class D).

export const INGREDIENTS = [
  { id: 'noodle', label: '면', texture: 'ing_noodle', tint: 0xf2d08a },
  { id: 'broth', label: '육수', texture: 'ing_broth', tint: 0xc8752b },
  { id: 'scallion', label: '파', texture: 'ing_scallion', tint: 0x5fbf5f },
  { id: 'pork', label: '고기', texture: 'ing_pork', tint: 0xc4553f },
  { id: 'egg', label: '계란', texture: 'ing_egg', tint: 0xf0c04a },
];

export const INGREDIENT_IDS = INGREDIENTS.map((i) => i.id);

// Named dishes exist so an order reads as food rather than as a random colour sequence.
// Every recipe starts with noodle+broth: the base is muscle memory, the tail is the puzzle.
export const RECIPES = [
  { id: 'plain', name: '기본 국수', steps: ['noodle', 'broth'] },
  { id: 'scallion', name: '파 국수', steps: ['noodle', 'broth', 'scallion'] },
  { id: 'pork', name: '고기 국수', steps: ['noodle', 'broth', 'pork'] },
  { id: 'egg', name: '계란 국수', steps: ['noodle', 'broth', 'egg'] },
  { id: 'special', name: '특 국수', steps: ['noodle', 'broth', 'pork', 'egg'] },
  { id: 'deluxe', name: '야시장 정식', steps: ['noodle', 'broth', 'pork', 'scallion', 'egg'] },
];

export const CUSTOMER_TYPES = [
  { id: 'regular', texture: 'cust_regular', patienceScale: 1.0, label: '단골' },
  { id: 'hurried', texture: 'cust_hurried', patienceScale: 0.72, label: '급한 학생' },
  { id: 'grumpy', texture: 'cust_grumpy', patienceScale: 0.86, label: '까다로운 상인' },
];

export const RULES = {
  slots: 3,
  strikesAllowed: 3,

  // Patience, in ms, before difficulty scaling.
  basePatienceMs: 14000,
  // Every served bowl shortens patience a little; floor keeps it playable forever.
  patiencePerServe: 260,
  minPatienceMs: 5200,

  // Arrival cadence, also monotonic in elapsed seconds.
  baseArrivalMs: 2600,
  arrivalPerSecond: 18,
  minArrivalMs: 900,

  // Recipe difficulty unlocks by served count, so it never rolls back.
  // The opening tier is 3 steps, not 2: at 2 steps only one recipe exists, so every seat
  // showed the same dish and the counter read like a rendering bug rather than a queue.
  unlockBySteps: [
    { servedAtLeast: 0, maxSteps: 3 },
    { servedAtLeast: 6, maxSteps: 4 },
    { servedAtLeast: 14, maxSteps: 5 },
  ],

  scorePerStep: 12,
  scorePerServe: 120,
  comboBonusPerStack: 35,
  maxComboMultiplier: 5,

  // A wrong tap costs progress and patience but never ends the run outright — the run ends
  // only when three customers actually walk out, which the player can always see coming.
  wrongTapPatiencePenaltyMs: 2200,
};

export function maxStepsFor(servedCount) {
  let steps = RULES.unlockBySteps[0].maxSteps;
  for (const tier of RULES.unlockBySteps) {
    if (servedCount >= tier.servedAtLeast) steps = tier.maxSteps;
  }
  return steps;
}

export function patienceMsFor(servedCount, customerType) {
  const scaled = RULES.basePatienceMs - servedCount * RULES.patiencePerServe;
  const clamped = Math.max(RULES.minPatienceMs, scaled);
  return clamped * (customerType?.patienceScale ?? 1);
}

export function arrivalMsFor(elapsedSec) {
  return Math.max(RULES.minArrivalMs, RULES.baseArrivalMs - elapsedSec * RULES.arrivalPerSecond);
}

export function ingredientById(id) {
  return INGREDIENTS.find((i) => i.id === id) || null;
}
