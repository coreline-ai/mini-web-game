import Phaser from 'phaser';
import { GROUND_Y } from '../constants.js';

export const CONTACT_SHADOW_PROFILES = Object.freeze({
  player: Object.freeze({ texture: 'fx-contact-shadow-player', width: 34, height: 8, alpha: 0.27, fadeHeight: 150, depth: 29 }),
  enemy: Object.freeze({ texture: 'fx-contact-shadow-enemy', width: 36, height: 8, alpha: 0.25, fadeHeight: 130, depth: 29 }),
  atlas: Object.freeze({ texture: 'fx-contact-shadow-atlas', width: 320, height: 18, alpha: 0.31, fadeHeight: 80, depth: 27 }),
  crane: Object.freeze({ texture: 'fx-contact-shadow-crane', width: 226, height: 17, alpha: 0.30, fadeHeight: 70, depth: 28 }),
  ironMole: Object.freeze({ texture: 'fx-contact-shadow-iron-mole', width: 370, height: 20, alpha: 0.32, fadeHeight: 70, depth: 28 }),
});

function surfaceBelow(actor) {
  const bottom = actor.body?.bottom ?? actor.y + actor.displayHeight / 2;
  let best = actor.scene?.terrainArt?.groundY ?? GROUND_Y;
  const definitions = actor.scene?.terrainArt?.platformDefinitions ?? [];
  for (const platform of definitions) {
    if (actor.x < platform.left - 4 || actor.x > platform.right + 4) continue;
    if (platform.surfaceY + 5 < bottom) continue;
    if (platform.surfaceY < best) best = platform.surfaceY;
  }
  return best;
}

/** Attach a texture-backed AO/contact patch. No Graphics primitives are used. */
export function attachContactShadow(actor, profile = 'player', overrides = {}) {
  if (!actor?.scene || actor.contactShadow) return actor?.contactShadow ?? null;
  const base = typeof profile === 'string' ? CONTACT_SHADOW_PROFILES[profile] : profile;
  const cfg = { ...base, ...overrides };
  const shadow = actor.scene.add.image(actor.x, surfaceBelow(actor) + (cfg.surfaceOffsetY ?? 1), cfg.texture)
    .setDisplaySize(cfg.width, cfg.height)
    .setDepth(cfg.depth)
    .setAlpha(cfg.alpha)
    .setData('contactShadow', true)
    .setData('ownerType', profile)
    .setData('assetBacked', true);
  actor.contactShadow = shadow;
  actor.contactShadowProfile = cfg;
  actor.setData('contactShadowContract', {
    texture: cfg.texture, width: cfg.width, height: cfg.height, groundedAlpha: cfg.alpha,
    fadeHeight: cfg.fadeHeight, followsActor: true, textureBacked: true,
  });
  updateContactShadow(actor);
  return shadow;
}

export function updateContactShadow(actor) {
  const shadow = actor?.contactShadow;
  const cfg = actor?.contactShadowProfile;
  if (!shadow || !cfg) return;
  if (!actor.active || !actor.visible) { shadow.setVisible(false); return; }
  const surfaceY = surfaceBelow(actor);
  const bottom = actor.body?.bottom ?? actor.y + actor.displayHeight / 2;
  const grounded = actor.body?.allowGravity === false || actor.body?.blocked?.down || actor.body?.touching?.down || Math.abs(surfaceY - bottom) <= 2.5;
  const altitude = grounded ? 0 : Math.max(0, surfaceY - bottom);
  const fade = 1 - Phaser.Math.Clamp(altitude / Math.max(1, cfg.fadeHeight), 0, 1);
  const widthScale = 0.66 + fade * 0.34;
  shadow.setVisible(fade > 0.025)
    .setPosition(actor.x + (cfg.offsetX ?? 0), surfaceY + (cfg.surfaceOffsetY ?? 1))
    .setDisplaySize(cfg.width * widthScale, cfg.height * (0.78 + fade * 0.22))
    .setAlpha(cfg.alpha * fade * fade);
  shadow.setData('groundSample', { surfaceY, bodyBottom: bottom, altitude, fade, centerErrorPx: Math.abs(shadow.x - actor.x) });
}

export function destroyContactShadow(actor) {
  actor?.contactShadow?.destroy?.();
  if (actor) { actor.contactShadow = null; actor.contactShadowProfile = null; }
}

export default { CONTACT_SHADOW_PROFILES, attachContactShadow, updateContactShadow, destroyContactShadow };
