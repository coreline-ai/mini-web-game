export const WEAPON_ORDER = ['gatling', 'scatter', 'arc', 'rocket', 'rail'];

export const WEAPONS = {
  gatling: {
    id: 'gatling', name: 'M-09 기관포', short: '기관포', frame: 0,
    damage: 15, fireMs: 92, heatPerShot: 4.6, coolPerSecond: 25, unlockLevel: 0,
    description: '총열 가속 · 과열/냉각', color: 0xe5b966,
  },
  scatter: {
    id: 'scatter', name: '스캐터 캐논', short: '산탄', frame: 1,
    damage: 25, pellets: 7, spread: 0.34, fireMs: 520, energyCost: 34,
    chargePerSecond: 8.2, chargePerKill: 3.1, unlockLevel: 0,
    description: '전장 끝까지 퍼지는 부채꼴 넉백', color: 0xffa657,
  },
  arc: {
    id: 'arc', name: '아크 코일', short: '연쇄전격', frame: 2,
    damage: 34, chains: 5, range: 1500, chainRange: 480, fireMs: 620, energyCost: 42,
    chargePerSecond: 6.4, chargePerKill: 4.7, unlockLevel: 0,
    description: '첫 표적에서 주변 5개체로 번지는 번개', color: 0x71e7ff,
  },
  rocket: {
    id: 'rocket', name: '헬파이어 로켓', short: '로켓', frame: 3,
    damage: 116, radius: 360, fireMs: 1050, energyCost: 62,
    chargePerSecond: 4.5, chargePerKill: 7.4, unlockLevel: 0,
    description: '대형 감염체 범위 폭발', color: 0xff7c54,
  },
  rail: {
    id: 'rail', name: '레일 랜스', short: '레일', frame: 4,
    damage: 220, pierce: 99, fireMs: 1450, energyCost: 100,
    chargePerSecond: 2.8, chargePerKill: 9.5, unlockLevel: 0,
    description: '전장 직선 관통 필살기', color: 0xaaf8ff,
  },
};

export function upgradedWeapon(id, level = 0) {
  const base = WEAPONS[id];
  const damageScale = 1 + level * 0.12;
  const chargeScale = 1 + level * 0.055;
  const heatScale = Math.max(0.65, 1 - level * 0.035);
  return {
    ...base,
    level,
    damage: base.damage * damageScale,
    chargePerSecond: (base.chargePerSecond || 0) * chargeScale,
    chargePerKill: (base.chargePerKill || 0) * chargeScale,
    heatPerShot: (base.heatPerShot || 0) * heatScale,
  };
}
