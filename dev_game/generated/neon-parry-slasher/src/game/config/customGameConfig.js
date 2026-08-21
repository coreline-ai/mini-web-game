import { SPEC } from '../data/spec.js';
export const CUSTOM_GAME_CONFIG = Object.freeze({ implementationStatus: SPEC.implementationStatus, rules: Object.freeze({
  "durationSeconds": 180,
  "goal": "survive-and-chain-parry-combos",
  "progressMetric": "score-and-combo",
  "requiredObjectives": [
    "deflect-projectiles",
    "maintain-combo",
    "trigger-overdrive"
  ],
  "failConditions": [
    "shield-depleted"
  ],
  "commands": [
    {
      "id": "slash-parry",
      "label": "Slash / Parry",
      "input": "swipe-or-tap",
      "costs": {}
    }
  ]
}) });
