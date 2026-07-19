const GROUND_KEYS = ['terrain-ground-center-a', 'terrain-ground-center-b', 'terrain-ground-heavy'];
const VISUAL_OVERLAP_PX = 4;
const GROUND_FASCIA_Y = 606;
// The collision baseline stays at y=588, but the HD terrain texture must also
// surround that baseline. Previously the first foreground terrain pixel began
// at y=606, producing an 18px air gap under every grounded actor.
const GROUND_DECK_BACK_Y = 570;
const GROUND_DECK_FRONT_Y = GROUND_FASCIA_Y;
const GROUND_DECK_SOURCE_Y = 8;
const GROUND_DECK_SOURCE_HEIGHT = 42;

// Authored platform textures contain a real slab rather than a single top
// pixel. Align the actor baseline with the slab centre so feet read as planted
// inside the deck instead of floating on its upper edge.
const CATWALK_DECK_SOURCE_OFFSET_PX = 17.034; // legacy top-edge contract
const CATWALK_DECK_CENTER_SOURCE_Y = 65;
const SUPPORT_DECK_CENTER_SOURCE_Y = 25;

/**
 * Owns visible production terrain and its static collision bodies. All pieces
 * use approved image textures; no generated rectangle/rivet strip is created.
 */
export class TerrainArtSystem {
  constructor(scene, { worldWidth, groundY }) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.groundY = groundY;
    // Ground and elevated geometry intentionally do not share a physics group.
    // A full-height static platform body in the ground group creates an
    // invisible side wall for actors whose jump cannot reach the platform top.
    this.groundGroup = scene.physics.add.staticGroup();
    this.elevatedPlatformGroup = scene.physics.add.staticGroup();
    this.group = this.groundGroup; // Backwards-compatible getGroup()/group API.
    this.group.terrainLayers = {
      ground: this.groundGroup,
      elevated: this.elevatedPlatformGroup,
      elevatedProcess: TerrainArtSystem.canLandOnElevatedPlatform,
      elevatedProjectileProcess: TerrainArtSystem.canProjectileHitElevatedPlatform,
    };
    this.pieces = [];
    this.groundPieces = [];
    this.groundDeckPieces = [];
    this.groundColliders = [];
    this.platformColliders = [];
    this.platformPieces = [];
    this.platformDefinitions = [];
  }

  /**
   * Arcade Physics process callback for a one-way platform.
   * Collision is accepted only while a gravity-driven actor crosses the top
   * surface from above. Sides and the underside always remain pass-through.
   */
  static canLandOnElevatedPlatform(actor, platform) {
    const actorBody = actor?.body;
    const platformBody = platform?.body;
    if (!actorBody?.enable || !platformBody?.enable || actorBody.allowGravity === false) return false;
    if (actorBody.velocity.y < -1) return false;

    const previousBottom = (actorBody.prev?.y ?? actorBody.y) + actorBody.height;
    const platformTop = platformBody.top;
    const frameTravel = Math.max(0, actorBody.bottom - previousBottom);
    const approachTolerance = Math.max(4, frameTravel + 2);
    return previousBottom <= platformTop + approachTolerance
      && actorBody.bottom >= platformTop - 2;
  }

  /**
   * Horizontal fire must pass through one-way catwalk sides. Only a projectile
   * that is moving down and actually crosses the authored top surface may hit
   * the platform (for example a grenade or a downward shot from above).
   */
  static canProjectileHitElevatedPlatform(projectile, platform) {
    const body = projectile?.body;
    const platformBody = platform?.body;
    if (!body?.enable || !platformBody?.enable || body.velocity.y <= 1) return false;
    const previousBottom = (body.prev?.y ?? body.y) + body.height;
    const platformTop = platformBody.top;
    const frameTravel = Math.max(0, body.bottom - previousBottom);
    const approachTolerance = Math.max(4, frameTravel + 2);
    return previousBottom <= platformTop + approachTolerance
      && body.bottom >= platformTop - 2;
  }

  createGround() {
    const tileWidth = 128;
    for (let index = 0, x = tileWidth / 2; x < this.worldWidth; index += 1, x += tileWidth) {
      const key = index === 0 ? 'terrain-ground-left'
        : x + tileWidth >= this.worldWidth ? 'terrain-ground-right'
          : GROUND_KEYS[index % GROUND_KEYS.length];
      const tileHeight = index % 7 === 0 ? 72 : 64;
      const frame = this.scene.textures.getFrame(key);
      const sourceWidth = frame?.cutWidth ?? frame?.width ?? 1;
      const sourceHeight = frame?.cutHeight ?? frame?.height ?? 1;
      const deckSourceY = Math.min(GROUND_DECK_SOURCE_Y, Math.max(0, sourceHeight - 1));
      const deckSourceHeight = Math.min(GROUND_DECK_SOURCE_HEIGHT, sourceHeight - deckSourceY);
      const deckHeight = GROUND_DECK_FRONT_Y - GROUND_DECK_BACK_Y;

      // Texture-backed road cap: the shoe baseline is now the exact centre of
      // visible deck art (570..606), while physics remains at the stable y=588.
      const deck = this.scene.add.image(x, GROUND_DECK_BACK_Y, key)
        .setOrigin(0.5, 0)
        .setCrop(0, deckSourceY, sourceWidth, deckSourceHeight)
        .setScale(
          (tileWidth + VISUAL_OVERLAP_PX) / sourceWidth,
          deckHeight / deckSourceHeight,
        )
        .setDepth(19)
        .setData('terrainKind', 'ground-walk-deck')
        .setData('walkSurfaceY', this.groundY)
        .setData('deckBackY', GROUND_DECK_BACK_Y)
        .setData('deckFrontY', GROUND_DECK_FRONT_Y)
        .setData('deckCenterY', (GROUND_DECK_BACK_Y + GROUND_DECK_FRONT_Y) / 2)
        .setData('textureBacked', true)
        .setData('visualOverlapPx', VISUAL_OVERLAP_PX);

      // Keep the full-resolution fascia below the cap. This preserves the
      // hazard strip and machinery silhouette without stretching the asset.
      const art = this.scene.add.image(x, GROUND_FASCIA_Y, key)
        .setOrigin(0.5, 0)
        .setDisplaySize(tileWidth + VISUAL_OVERLAP_PX, tileHeight)
        .setDepth(20)
        .setData('terrainKind', 'ground-fascia')
        .setData('walkSurfaceY', this.groundY)
        .setData('fasciaY', GROUND_FASCIA_Y)
        .setData('visualOverlapPx', VISUAL_OVERLAP_PX);
      // Collision is deliberately independent of the fascia art. This makes
      // the shoe baseline y=588 while leaving 18px of visible road/front lip.
      // Never derive collision geometry from an art frame. The HD terrain
      // textures have different native dimensions; centring a 132px body in
      // those frames previously moved individual tile tops 50–68px upward.
      const collider = this.scene.add.zone(x, this.groundY, tileWidth, 132)
        .setOrigin(0.5, 0)
        .setVisible(false);
      this.scene.physics.add.existing(collider, true);
      this.groundGroup.add(collider);
      collider.body.setSize(tileWidth, 132, false).updateFromGameObject();
      collider.setData('terrainKind', 'ground-walk-surface');
      collider.setData('surfaceY', this.groundY);
      art.body = collider.body; // read-only visual/contact QA compatibility
      art.setData('collisionProxy', collider);
      this.pieces.push(deck, art);
      this.groundDeckPieces.push(deck);
      this.groundPieces.push(art);
      this.groundColliders.push(collider);
    }
    return this;
  }

  createPlatforms(definitions) {
    const tileWidth = 128;
    definitions.forEach((authored, platformIndex) => {
      const legacy = Array.isArray(authored);
      const centerX = legacy ? authored[0] : authored.centerX;
      const surfaceY = legacy ? authored[1] - 18 : authored.surfaceY;
      const width = legacy ? authored[2] : authored.width;
      const platformId = legacy ? `p${platformIndex + 1}` : (authored.id ?? `p${platformIndex + 1}`);
      const texture = legacy ? (platformIndex % 3 === 2 ? 'terrain-platform-support' : 'terrain-platform-catwalk')
        : (authored.texture ?? 'terrain-platform-catwalk');
      const tileHeight = texture === 'terrain-platform-support' ? 84 : 54;
      const textureFrame = this.scene.textures.getFrame(texture);
      const textureHeight = textureFrame?.cutHeight ?? textureFrame?.height ?? 1;
      const deckCenterSourceY = texture === 'terrain-platform-catwalk'
        ? CATWALK_DECK_CENTER_SOURCE_Y
        : SUPPORT_DECK_CENTER_SOURCE_Y;
      const visualTopOffset = deckCenterSourceY * (tileHeight / textureHeight);
      const visualDeckHalfDepth = texture === 'terrain-platform-catwalk' ? 7 : 9;
      this.platformDefinitions.push({
        id: platformId, centerX, surfaceY, visualDeckSurfaceY: surfaceY,
        visualDeckCenterY: surfaceY,
        visualDeckBackY: surfaceY - visualDeckHalfDepth,
        visualDeckFrontY: surfaceY + visualDeckHalfDepth,
        actorPlanePlacement: 'deck-center',
        visualTopY: surfaceY - visualTopOffset, visualTopOffset,
        width, left: centerX - width / 2, right: centerX + width / 2,
        routeId: legacy ? null : (authored.routeId ?? null), step: legacy ? platformIndex + 1 : (authored.step ?? null),
        ascent: legacy ? null : (authored.ascent ?? null), purpose: legacy ? null : (authored.purpose ?? null), texture,
      });
      const count = Math.max(1, Math.ceil(width / tileWidth));
      const pieceWidth = width / count;
      for (let index = 0; index < count; index += 1) {
        const x = centerX - width / 2 + pieceWidth / 2 + index * pieceWidth;
        const art = this.scene.add.image(x, surfaceY - visualTopOffset, texture)
          .setOrigin(0.5, 0)
          .setDisplaySize(pieceWidth + VISUAL_OVERLAP_PX, tileHeight)
          .setDepth(16)
          .setData('terrainKind', 'elevated-visible-art')
          .setData('platformId', platformId)
          .setData('visualDeckSurfaceY', surfaceY)
          .setData('visualDeckCenterY', surfaceY)
          .setData('visualDeckBackY', surfaceY - visualDeckHalfDepth)
          .setData('visualDeckFrontY', surfaceY + visualDeckHalfDepth)
          .setData('actorPlanePlacement', 'deck-center')
          .setData('visualTopOffset', visualTopOffset)
          .setData('visualOverlapPx', VISUAL_OVERLAP_PX);
        // A texture-independent zone keeps every one-way platform top at
        // its authored surfaceY, regardless of source atlas dimensions.
        const collider = this.scene.add.zone(x, surfaceY, pieceWidth, tileHeight)
          .setOrigin(0.5, 0)
          .setVisible(false);
        this.scene.physics.add.existing(collider, true);
        this.elevatedPlatformGroup.add(collider);
        collider.body.setSize(pieceWidth, tileHeight, false).updateFromGameObject();
        collider.body.checkCollision.up = true; collider.body.checkCollision.down = false;
        collider.body.checkCollision.left = false; collider.body.checkCollision.right = false;
        collider.setData('terrainKind', 'elevated-top-only');
        collider.setData('platformId', platformId);
        collider.setData('routeId', legacy ? null : (authored.routeId ?? null));
        collider.setData('routeStep', legacy ? null : (authored.step ?? null));
        collider.setData('routePurpose', legacy ? null : (authored.purpose ?? null));
        art.body = collider.body; // read-only visual/contact QA compatibility
        art.setData('collisionProxy', collider);
        this.pieces.push(art); this.platformPieces.push(art); this.platformColliders.push(collider);
      }
    });
    return this;
  }

  getGroup() { return this.group; }
  getCollisionLayers() { return this.group.terrainLayers; }
  snapshot() {
    return {
      pieceCount: this.pieces.length,
      groundPieceCount: this.groundPieces.length,
      groundDeckPieceCount: this.groundDeckPieces.length,
      elevatedPieceCount: this.platformPieces.length,
      visualOverlapPx: VISUAL_OVERLAP_PX,
      walkSurfaceY: this.groundY,
      groundFasciaY: GROUND_FASCIA_Y,
      groundDeckBackY: GROUND_DECK_BACK_Y,
      groundDeckFrontY: GROUND_DECK_FRONT_Y,
      groundDeckCenterY: (GROUND_DECK_BACK_Y + GROUND_DECK_FRONT_Y) / 2,
      actorPlanePlacement: 'deck-center',
      frontLipPx: GROUND_FASCIA_Y - this.groundY,
      catwalkDeckSourceOffsetPx: CATWALK_DECK_SOURCE_OFFSET_PX,
      collisionMode: 'ground-solid+elevated-top-only+horizontal-projectile-pass-through',
      platforms: this.platformDefinitions.map((definition) => ({ ...definition })),
      textureKeys: [...new Set(this.pieces.map((piece) => piece.texture.key))],
    };
  }
}

export default TerrainArtSystem;
