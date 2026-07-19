const PROP_SIZES = Object.freeze({
  'prop-shipping-crate': [92, 88],
  'prop-barricade': [138, 88],
  'prop-chain-fence': [164, 174],
  'prop-flood-lamp': [68, 154],
  'prop-pipe-cluster': [136, 166],
  'prop-warning-plate': [72, 72],
  'prop-cable-hook': [122, 96],
  'prop-debris': [142, 92],
});

const ZONE_SETS = Object.freeze([
  ['prop-flood-lamp', 'prop-cable-hook', 'prop-chain-fence', 'prop-warning-plate'],
  ['prop-chain-fence', 'prop-flood-lamp', 'prop-warning-plate', 'prop-cable-hook'],
  ['prop-chain-fence', 'prop-warning-plate', 'prop-flood-lamp', 'prop-cable-hook'],
]);

const INTERACTIVE_ROLES = Object.freeze({
  'prop-warning-plate': Object.freeze({ kind: 'volatile-warning-relay', roleLabel: '폭발 경고 릴레이', health: 2, blastRadius: 92, blastDamage: 3, chainDelay: 75, blocksMovement: false }),
  'prop-chain-fence': Object.freeze({ kind: 'breakable-fence-cover', roleLabel: '파괴 가능 철망 방벽', health: 3, blastRadius: 76, blastDamage: 2, chainDelay: 95, blocksMovement: false }),
  'prop-cable-hook': Object.freeze({ kind: 'mooring-cable-cache', roleLabel: '파괴 가능 계류 장치', health: 3, blastRadius: 104, blastDamage: 3, chainDelay: 110, blocksMovement: false }),
});

/**
 * Deterministic harbor set dressing and interactive-prop authoring pass.
 * Solid lane silhouettes (barricades, crates, debris and pipe piles) are not
 * valid decoration: players read them as collision geometry. They remain in
 * the asset library for future explicit obstacle scenes, but are not placed in
 * this pass-through combat lane.
 */
export class EnvironmentPropSystem {
  constructor(scene, { worldWidth, groundY, exclusionZones = [] }) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.groundY = groundY;
    this.exclusionZones = exclusionZones.map((zone) => typeof zone === 'number' ? { x: zone, radius: 110 } : zone);
    this.skippedOverlapCount = 0;
    this.props = [];
    this.interactiveTargets = [];
  }

  overlapsInteractiveProp(x, width) {
    return this.exclusionZones.some((zone) => Math.abs(x - zone.x) < (zone.radius ?? 110) + width / 2);
  }

  create() {
    const spacing = 620;
    for (let index = 0, x = 520; x < this.worldWidth - 280; index += 1, x += spacing + (index % 3) * 70) {
      const zone = x < 5900 ? 0 : x < 11000 ? 1 : 2;
      const key = ZONE_SETS[zone][index % ZONE_SETS[zone].length];
      const [width, height] = PROP_SIZES[key];
      // Background cable reels, hooks and signs must never sit directly behind
      // a shootable prop. The overlap made unrelated assets look like parts of
      // the barrel/lock and obscured their combat silhouette.
      if (this.overlapsInteractiveProp(x, width)) {
        this.skippedOverlapCount += 1;
        continue;
      }
      const role = INTERACTIVE_ROLES[key];
      if (role) {
        this.interactiveTargets.push({
          id: `environment-role-${index}`,
          texture: key,
          x,
          y: this.groundY - height / 2,
          width,
          height,
          ...role,
        });
        continue;
      }
      const prop = this.scene.add.image(x, this.groundY + 4, key)
        .setOrigin(0.5, 1)
        .setDisplaySize(width, height)
        .setDepth(index % 5 === 0 ? 19 : 14)
        .setAlpha(index % 4 === 0 ? 0.82 : 0.96)
        .setFlipX(index % 2 === 1);
      this.props.push(prop);
    }
    return this;
  }

  getInteractiveTargets() { return this.interactiveTargets.map((target) => ({ ...target })); }

  snapshot() {
    return {
      count: this.props.length,
      textureKeys: [...new Set(this.props.map((prop) => prop.texture.key))],
      deterministic: true,
      exclusionZoneCount: this.exclusionZones.length,
      skippedOverlapCount: this.skippedOverlapCount,
      interactiveOverlapCount: this.props.filter((prop) => this.overlapsInteractiveProp(prop.x, prop.displayWidth)).length,
      interactiveTargetCount: this.interactiveTargets.length,
      interactiveTargetKinds: [...new Set(this.interactiveTargets.map((target) => target.kind))],
      interactionMode: 'flood-lamps-background-warning-fence-cable-promoted-to-destructible-roles',
    };
  }
}

export default EnvironmentPropSystem;
