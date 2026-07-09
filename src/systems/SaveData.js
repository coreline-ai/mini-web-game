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

function freshDefault() {
  return {
    ...DEFAULT,
    ownedChars: [...DEFAULT.ownedChars],
    ownedBgs: [...DEFAULT.ownedBgs],
    runs: [...DEFAULT.runs],
  };
}

class SaveDataStore {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = window.localStorage.getItem(GC.SCORE.SAVE_KEY);
      if (!raw) return freshDefault();
      const parsed = JSON.parse(raw);
      const d = { ...freshDefault(), ...parsed };
      // 방어적 정규화
      if (!Array.isArray(d.ownedChars)) d.ownedChars = ['boy'];
      if (!Array.isArray(d.ownedBgs)) d.ownedBgs = ['bg_city'];
      d.ownedChars = Array.from(new Set(['boy', ...d.ownedChars]));
      d.ownedBgs = Array.from(new Set(['bg_city', ...d.ownedBgs]));
      if (!Array.isArray(d.runs)) d.runs = [];
      d.coins = Number.isFinite(d.coins) ? Math.max(0, Math.floor(d.coins)) : 0;
      d.best = Number.isFinite(d.best) ? Math.max(0, Math.floor(d.best)) : 0;
      // 선택값이 보유 목록에 없으면(제거/미보유 스킨) 기본값으로 되돌려 렌더 크래시 방지
      if (!d.ownedChars.includes(d.selChar)) d.selChar = 'boy';
      if (!d.ownedBgs.includes(d.selBg)) d.selBg = 'bg_city';
      return d;
    } catch {
      return freshDefault();
    }
  }

  save() {
    try {
      window.localStorage.setItem(GC.SCORE.SAVE_KEY, JSON.stringify(this.data));
    } catch {
      /* 무시 */
    }
  }

  reset() {
    this.data = freshDefault();
    this.save();
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

  // GameOver 진입 즉시 최고점 후보만 보존한다. 랭킹 기록은 정식 종료 시 recordRun에서만 수행한다.
  recordBestCandidate(score) {
    const normalized = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
    if (normalized <= this.data.best) return false;
    this.data.best = normalized;
    this.save();
    return true;
  }

  // 판 종료 시 결과 기록. 신기록 여부 반환.
  recordRun(score) {
    const normalized = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
    const isBest = this.recordBestCandidate(normalized);
    this.data.runs.push(normalized);
    this.data.runs.sort((a, b) => b - a);
    this.data.runs = this.data.runs.slice(0, 10);
    this.save();
    return isBest;
  }
}

export const Save = new SaveDataStore();
