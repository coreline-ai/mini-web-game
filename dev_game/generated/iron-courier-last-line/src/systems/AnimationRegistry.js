/**
 * Single source of truth for production animation coverage.
 * Every key in this contract must be registered in Phaser and declared in
 * assets/asset-manifest.json before the production asset gate can pass.
 */
export const ANIMATION_CONTRACT = Object.freeze({
  player: Object.freeze(['idle', 'run', 'jump', 'fall', 'crouch', 'shoot-forward', 'shoot-diagonal', 'shoot-up', 'grenade', 'melee', 'hurt', 'death']),
  'enemy-rifle': Object.freeze(['idle', 'run', 'aim', 'fire', 'recoil', 'hurt', 'death']),
  'enemy-shield': Object.freeze(['idle', 'march', 'guard', 'bash', 'stagger', 'shield-break', 'death']),
  'enemy-grenadier': Object.freeze(['idle', 'run', 'windup', 'throw', 'recover', 'hurt', 'death']),
  'enemy-drone': Object.freeze(['hover', 'bank-left', 'bank-right', 'charge', 'fire', 'hit', 'explode']),
  'rescue-technician': Object.freeze(['bound-idle', 'struggle', 'freed', 'ability', 'exit']),
  'rescue-medic': Object.freeze(['bound-idle', 'signal', 'freed', 'ability', 'exit']),
  'rescue-artillery': Object.freeze(['bound-idle', 'radio', 'freed', 'ability', 'exit']),
  transport: Object.freeze(['idle', 'drive', 'hit', 'damaged', 'critical', 'repair', 'destroyed']),
  'boss-crane': Object.freeze(['idle', 'burst', 'hook-launch', 'hook-return', 'stagger', 'damaged', 'death']),
  'boss-iron-mole': Object.freeze(['phase-1', 'phase-2', 'phase-3', 'armor-break', 'core-exposed', 'hit', 'destroyed']),
});

export const ANIMATION_EVENT_CONTRACT = Object.freeze([
  { family: 'player', state: 'shoot-forward', event: 'weaponSystem:fired', frame: 0, maxDeltaFrames: 1 },
  { family: 'player', state: 'shoot-diagonal', event: 'weaponSystem:fired', frame: 0, maxDeltaFrames: 1 },
  { family: 'player', state: 'shoot-up', event: 'weaponSystem:fired', frame: 0, maxDeltaFrames: 1 },
  { family: 'player', state: 'grenade', event: 'weaponSystem:grenadeThrown', frame: 0, maxDeltaFrames: 1 },
  { family: 'player', state: 'melee', event: 'melee:hit', frame: 0, maxDeltaFrames: 1 },
  { family: 'enemy-rifle', state: 'fire', event: 'projectile:fired', frame: 0, maxDeltaFrames: 1 },
  { family: 'enemy-shield', state: 'bash', event: 'melee:hit', frame: 0, maxDeltaFrames: 1 },
  { family: 'enemy-grenadier', state: 'throw', event: 'projectile:fired', frame: 0, maxDeltaFrames: 1 },
  { family: 'enemy-drone', state: 'fire', event: 'projectile:fired', frame: 0, maxDeltaFrames: 1 },
  { family: 'boss-crane', state: 'burst', event: 'projectile:fired', frame: 0, maxDeltaFrames: 1 },
  { family: 'boss-crane', state: 'hook-launch', event: 'projectile:fired', frame: 0, maxDeltaFrames: 1 },
  { family: 'boss-iron-mole', state: 'phase-1', event: 'projectile:fired', frame: 0, maxDeltaFrames: 1 },
  { family: 'boss-iron-mole', state: 'phase-2', event: 'phase:attack', frame: 0, maxDeltaFrames: 1 },
  { family: 'boss-iron-mole', state: 'phase-3', event: 'phase:attack', frame: 0, maxDeltaFrames: 1 },
]);

export const animationKey = (family, state) => `${family}:${state}`;

export function requiredAnimationKeys() {
  return Object.entries(ANIMATION_CONTRACT).flatMap(([family, states]) => states.map((state) => animationKey(family, state)));
}

export function requiredAnimationEventKeys() {
  return ANIMATION_EVENT_CONTRACT.map(({ family, state, event }) => `${family}:${state}:${event}`);
}

export function animationCoverage(scene) {
  const required = requiredAnimationKeys();
  const present = required.filter((key) => scene.anims.exists(key));
  return { required, present, missing: required.filter((key) => !scene.anims.exists(key)) };
}

export default ANIMATION_CONTRACT;
