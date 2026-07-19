import { SPEC } from '../data/spec.js';

const SETTINGS_KEY = SPEC.game.id + '_settings';
const BEST_KEY = SPEC.scoring.highScoreLocalStorageKey || SPEC.game.id + '_best';
const PROGRESSION_KEY = SPEC.game.id + '_progression_v1';

const defaults = () => ({
  cores: 0,
  totalKills: 0,
  totalRuns: 0,
  upgrades: { gatling: 0, scatter: 0, arc: 0, rocket: 0, rail: 0 },
  awardedRuns: [],
});

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
  getProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem(PROGRESSION_KEY) || '{}');
      return { ...defaults(), ...raw, upgrades: { ...defaults().upgrades, ...(raw.upgrades || {}) } };
    } catch { return defaults(); }
  },
  setProgress(next) {
    try { localStorage.setItem(PROGRESSION_KEY, JSON.stringify(next)); } catch {}
  },
  weaponLevel(id) { return Math.max(0, Number(this.getProgress().upgrades[id] || 0)); },
  upgradeCost(id) {
    const level = this.weaponLevel(id);
    return Math.round(38 * Math.pow(level + 1, 1.46));
  },
  buyUpgrade(id) {
    const data = this.getProgress();
    const cost = Math.round(38 * Math.pow((data.upgrades[id] || 0) + 1, 1.46));
    if (data.cores < cost) return { ok: false, cost, data };
    data.cores -= cost;
    data.upgrades[id] = (data.upgrades[id] || 0) + 1;
    this.setProgress(data);
    return { ok: true, cost, data };
  },
  awardRun(runId, reward, kills = 0) {
    const data = this.getProgress();
    if (data.awardedRuns.includes(runId)) return data;
    data.cores += Math.max(0, Math.floor(reward));
    data.totalKills += Math.max(0, Math.floor(kills));
    data.totalRuns += 1;
    data.awardedRuns = [...data.awardedRuns.slice(-19), runId];
    this.setProgress(data);
    return data;
  },
  resetForQa() { this.setProgress(defaults()); },
};
