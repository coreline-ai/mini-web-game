const enemy = (config) => Object.freeze(config);

export const ENEMY_CONFIG = Object.freeze({
  basicSoldier: enemy({
    id: 'basicSoldier', displayName: '조류 약탈병', role: 'rifle-infantry',
    maxHp: 42, touchDamage: 12, projectileDamage: 9, moveSpeed: 112,
    attackRange: 520, preferredRange: 390, attackCooldownMs: 1180,
    telegraphMs: 480, burstCount: 3, burstGapMs: 120, score: 100,
    dropChance: 0.12, body: { width: 52, height: 108 }, maxConcurrent: 8,
  }),
  shieldSoldier: enemy({
    id: 'shieldSoldier', displayName: '방벽 집행병', role: 'armored-advance',
    maxHp: 115, shieldHp: 90, touchDamage: 18, meleeDamage: 22, moveSpeed: 68,
    attackRange: 115, preferredRange: 80, attackCooldownMs: 1450,
    telegraphMs: 540, frontalDamageMultiplier: 0.15, rearDamageMultiplier: 1.25,
    staggerExplosionDamage: 45, score: 180, dropChance: 0.16,
    body: { width: 78, height: 122 }, maxConcurrent: 4,
  }),
  grenadier: enemy({
    id: 'grenadier', displayName: '곡사 폭파병', role: 'area-denial',
    maxHp: 58, touchDamage: 10, grenadeDamage: 24, moveSpeed: 78,
    attackRange: 720, minAttackRange: 260, preferredRange: 560,
    attackCooldownMs: 2350, telegraphMs: 650, grenadeFuseMs: 1050,
    grenadeRadius: 105, score: 220, dropChance: 0.2,
    body: { width: 58, height: 106 }, maxConcurrent: 3,
  }),
  sentryDrone: enemy({
    id: 'sentryDrone', displayName: '해리어 감시 드론', role: 'flying-flanker',
    maxHp: 50, touchDamage: 14, projectileDamage: 11, moveSpeed: 145,
    attackRange: 610, preferredRange: 430, hoverAmplitude: 34,
    attackCooldownMs: 1650, telegraphMs: 500, burstCount: 2,
    score: 260, dropChance: 0.24, body: { width: 74, height: 48 }, maxConcurrent: 4,
  }),
});

export const ENEMY_TYPES = Object.freeze(Object.keys(ENEMY_CONFIG));

export const DIFFICULTY_SCALING = Object.freeze({
  startSeconds: 60,
  endSeconds: 480,
  maxHpMultiplier: 1.22,
  maxCooldownMultiplier: 0.78,
  maxProjectileSpeedMultiplier: 1.18,
  maxConcurrentMultiplier: 1.35,
});

export function getEnemyConfig(id) {
  return ENEMY_CONFIG[id];
}

export default ENEMY_CONFIG;
