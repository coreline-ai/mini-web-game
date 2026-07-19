const weapon = (config) => Object.freeze(config);

export const WEAPON_CONFIG = Object.freeze({
  rifle: weapon({
    id: 'rifle', displayName: 'ARC-7 라이플', slot: 'primary', infiniteAmmo: true,
    startingAmmo: Infinity, maxAmmo: Infinity, damage: 12, fireRateMs: 105,
    projectileSpeed: 1020, projectileLifeMs: 2200, pellets: 1, spreadDeg: 1.5,
    pierce: 0, splashRadius: 0, poolSize: 56, hitStopMs: 32,
    cameraShake: { intensity: 0.002, durationMs: 34 }, sfx: ['rifle-01', 'rifle-02', 'rifle-03'],
  }),
  shotgun: weapon({
    id: 'shotgun', displayName: '브리처 산탄총', slot: 'special', infiniteAmmo: false,
    startingAmmo: 24, maxAmmo: 36, ammoPerShot: 1, damage: 10, fireRateMs: 520,
    projectileSpeed: 820, projectileLifeMs: 2200, pellets: 7, spreadDeg: 22,
    pierce: 0, splashRadius: 0, poolSize: 42, hitStopMs: 54,
    cameraShake: { intensity: 0.009, durationMs: 90 }, sfx: ['shotgun'],
  }),
  rocket: weapon({
    id: 'rocket', displayName: 'MANTA 로켓', slot: 'special', infiniteAmmo: false,
    startingAmmo: 8, maxAmmo: 12, ammoPerShot: 1, damage: 58, fireRateMs: 760,
    projectileSpeed: 610, projectileLifeMs: 2800, pellets: 1, spreadDeg: 0,
    pierce: 0, splashRadius: 148, splashFalloff: 0.55, poolSize: 12, hitStopMs: 78,
    cameraShake: { intensity: 0.016, durationMs: 145 }, sfx: ['rocket-launch'],
  }),
  grenade: weapon({
    id: 'grenade', displayName: '자기점착 수류탄', slot: 'grenade', infiniteAmmo: false,
    startingAmmo: 5, maxAmmo: 8, ammoPerShot: 1, damage: 72, cooldownMs: 640,
    // A medium forward arc gives the player useful screen coverage instead of
    // dropping the grenade at their feet. It bounces once/rolls, then the fuse
    // owns detonation; direct hits still explode immediately.
    throwVelocityX: 480, throwVelocityY: -420, gravityY: 1100, fuseMs: 1300,
    bounceX: 0.28, bounceY: 0.24, dragX: 300, detonateOnTerrain: false,
    minTravelDistance: 340, maxTravelDistance: 460, maxFuseExtensionMs: 700,
    splashRadius: 175, splashFalloff: 0.5, poolSize: 10, hitStopMs: 80,
    cameraShake: { intensity: 0.018, durationMs: 150 }, sfx: ['grenade-throw', 'explosion-large'],
  }),
});

export const SPECIAL_WEAPON_IDS = Object.freeze(['shotgun', 'rocket']);

export function getWeaponConfig(id) {
  return WEAPON_CONFIG[id] ?? WEAPON_CONFIG.rifle;
}

export default WEAPON_CONFIG;
