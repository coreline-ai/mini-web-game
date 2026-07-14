import { SPEC } from '../data/spec.js';

const SETTINGS_KEY = SPEC.game.id + '_settings';
const BEST_KEY = SPEC.game.id + '_best';
const STARS_KEY = SPEC.game.id + '_stars';

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
  getBestStars() {
    try { return Math.max(0, Math.min(3, Number(localStorage.getItem(STARS_KEY) || '0') || 0)); } catch { return 0; }
  },
  setBestStars(stars) {
    try { localStorage.setItem(STARS_KEY, String(Math.max(this.getBestStars(), Math.min(3, Math.floor(stars))))); } catch {}
  },
  hasSeenTutorial() { return !!this.getSettings().tutorialSeen; },
  setTutorialSeen(value = true) { this.setSettings({ tutorialSeen: !!value, clarityCoachVersion: value ? 1 : 0 }); },
  hasSeenClarityCoach() { return Number(this.getSettings().clarityCoachVersion || 0) >= 1; },
  setClarityCoachSeen() { this.setSettings({ clarityCoachVersion: 1 }); },
  getSettings() {
    try { return { mute: false, reduceEffects: false, tutorialSeen: false, clarityCoachVersion: 0, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')) }; } catch { return { mute: false, reduceEffects: false, tutorialSeen: false, clarityCoachVersion: 0 }; }
  },
  setSettings(next) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...this.getSettings(), ...next })); } catch {}
  },
};
