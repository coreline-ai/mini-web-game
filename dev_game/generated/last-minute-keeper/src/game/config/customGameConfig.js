import { SPEC } from '../data/spec.js';
export const CUSTOM_GAME_CONFIG = Object.freeze({ implementationStatus: SPEC.implementationStatus, rules: Object.freeze({
  "durationSeconds": 300,
  "goal": "keep-the-goal-until-stoppage-time-ends",
  "progressMetric": "saves-made",
  "requiredObjectives": [
    "survive-each-stage",
    "reach-full-time"
  ],
  "failConditions": [
    "five-goals-conceded"
  ],
  "commands": [
    {
      "id": "slide-keeper",
      "label": "Slide Keeper",
      "input": "drag along the goal line (below the flick speed threshold)",
      "costs": {}
    },
    {
      "id": "dive",
      "label": "Dive",
      "input": "flick left or right above the speed threshold",
      "costs": {
        "recoveryMs": 620
      }
    },
    {
      "id": "punch-clear",
      "label": "Punch Clear",
      "input": "tap while the ball is inside punch range to push the rebound wide",
      "costs": {}
    }
  ]
}) });
