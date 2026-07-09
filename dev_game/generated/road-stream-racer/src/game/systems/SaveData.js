import { SPEC } from '../data/spec.js';

const SETTINGS_KEY = SPEC.game.id + '_settings';
const BEST_KEY = SPEC.scoring.highScoreLocalStorageKey || SPEC.game.id + '_best';

export const SaveData = {
  getBest() {
    try { return Number(localStorage.getItem(BEST_KEY) || '0') || 0; } catch { return 0; }
  },
  setBest(score) {
    try { localStorage.setItem(BEST_KEY, String(Math.max(0, Math.floor(score)))); } catch {}
  },
  record(score) {
    const best = this.getBest();
    if (score > best) { this.setBest(score); return true; }
    return false;
  },
  getSettings() {
    try { return { mute: false, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')) }; } catch { return { mute: false }; }
  },
  setSettings(next) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...this.getSettings(), ...next })); } catch {}
  },
};
