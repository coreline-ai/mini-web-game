import { SPEC } from '../data/spec.js';
export const CUSTOM_GAME_CONFIG = Object.freeze({ implementationStatus: SPEC.implementationStatus, rules: Object.freeze({
  "durationSeconds": 300,
  "goal": "guide-every-ship-safely-until-dawn",
  "progressMetric": "ships-guided",
  "requiredObjectives": [
    "clear-stage-quota",
    "reach-dawn"
  ],
  "failConditions": [
    "three-wrecks"
  ],
  "commands": [
    {
      "id": "short-pulse",
      "label": "Short Pulse",
      "input": "tap the lamp (under 260 ms)",
      "costs": {}
    },
    {
      "id": "long-pulse",
      "label": "Long Pulse",
      "input": "hold the lamp (260 ms or longer)",
      "costs": {}
    },
    {
      "id": "clear-signal",
      "label": "Clear Signal",
      "input": "tap the clear button to discard a half-typed code",
      "costs": {}
    }
  ]
}) });
