import { GC } from '../config/gameConfig.js';

// localStorage 기반 영구 저장(코인/보유스킨/선택/최고점/랭킹/음소거).
const DEFAULT = {
  coins: 0,
  ownedChars: ['boy'],
  ownedBgs: ['bg_city'],
  selChar: 'boy',
  selBg: 'bg_city',
  best: 0,
  mute: false,
  runs: [], // 상위 점수 목록(내림차순)
};

class SaveDataStore {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = window.localStorage.getItem(GC.SCORE.SAVE_KEY);
      if (!raw) return { ...DEFAULT };
      const parsed = JSON.parse(raw);
      const d = { ...DEFAULT, ...parsed };
      // 방어적 정규화
      if (!Array.isArray(d.ownedChars) || !d.ownedChars.includes('boy')) d.ownedChars = ['boy', ...(d.ownedChars || [])];
      if (!Array.isArray(d.ownedBgs) || !d.ownedBgs.includes('bg_city')) d.ownedBgs = ['bg_city', ...(d.ownedBgs || [])];
      if (!Array.isArray(d.runs)) d.runs = [];
      d.coins = Number.isFinite(d.coins) ? Math.max(0, Math.floor(d.coins)) : 0;
      d.best = Number.isFinite(d.best) ? Math.max(0, Math.floor(d.best)) : 0;
      return d;
    } catch {
      return { ...DEFAULT };
    }
  }

  save() {
    try {
      window.localStorage.setItem(GC.SCORE.SAVE_KEY, JSON.stringify(this.data));
    } catch {
      /* 무시 */
    }
  }

  get coins() { return this.data.coins; }
  addCoins(n) { this.data.coins += n; this.save(); }
  spendCoins(n) {
    if (this.data.coins < n) return false;
    this.data.coins -= n; this.save(); return true;
  }

  ownsChar(id) { return this.data.ownedChars.includes(id); }
  ownsBg(key) { return this.data.ownedBgs.includes(key); }
  buyChar(id, price) {
    if (this.ownsChar(id)) return true;
    if (!this.spendCoins(price)) return false;
    this.data.ownedChars.push(id); this.save(); return true;
  }
  buyBg(key, price) {
    if (this.ownsBg(key)) return true;
    if (!this.spendCoins(price)) return false;
    this.data.ownedBgs.push(key); this.save(); return true;
  }

  get selChar() { return this.data.selChar; }
  get selBg() { return this.data.selBg; }
  selectChar(id) { if (this.ownsChar(id)) { this.data.selChar = id; this.save(); } }
  selectBg(key) { if (this.ownsBg(key)) { this.data.selBg = key; this.save(); } }

  get best() { return this.data.best; }
  get mute() { return this.data.mute; }
  setMute(v) { this.data.mute = !!v; this.save(); }

  // 판 종료 시 결과 기록. 신기록 여부 반환.
  recordRun(score) {
    const isBest = score > this.data.best;
    if (isBest) this.data.best = score;
    this.data.runs.push(score);
    this.data.runs.sort((a, b) => b - a);
    this.data.runs = this.data.runs.slice(0, 10);
    this.save();
    return isBest;
  }
}

export const Save = new SaveDataStore();
