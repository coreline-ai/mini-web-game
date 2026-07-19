import { H, W } from '../constants.js';

const smoothstep = (value) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

/**
 * Camera-sized tile layers whose texture coordinates move continuously.
 * Zone art blends spatially over a wide world interval instead of swapping a
 * full-screen image at a single x coordinate.
 */
export class BackgroundLayerSystem {
  constructor(scene, options) {
    this.scene = scene;
    this.blendWidth = options.blendWidth ?? 1280;
    this.boundaries = options.boundaries ?? [5900, 11000];
    this.farKeys = options.farKeys;
    this.midKeys = [];
    this.nearKeys = [];
    this.ambienceKeys = [];
    this.compositionMode = 'sharp-far-only';

    this.far = this.farKeys.map((key, index) => {
      // Full-resolution 4K plates are Images, never TileSprites. Tiling a
      // structural scene repeated cranes, pipes and buildings at the screen
      // edge and made the result look like a blurred double exposure.
      const layer = scene.add.image(W / 2, H / 2, key)
        .setDepth(-40 - index)
        .setScrollFactor(0)
        .setAlpha(index === 0 ? 1 : 0);
      layer.setData('zoneIndex', index);
      layer.setData('roadPlaneOffsetY', index === 2 ? 104 : 0);
      return layer;
    });
    this.mid = [];
    this.near = [];
    this.ambience = [];
    this.lastSnapshot = { zone: 0, blend: [1, 0, 0], cameraX: 0, compositionMode: this.compositionMode };
  }

  zoneWeights(worldX) {
    const [first, second] = this.boundaries;
    const half = this.blendWidth / 2;
    const blendOne = smoothstep((worldX - (first - half)) / this.blendWidth);
    const blendTwo = smoothstep((worldX - (second - half)) / this.blendWidth);
    return [1 - blendOne, blendOne * (1 - blendTwo), blendTwo];
  }

  update(camera, worldX) {
    const visibleWidth = camera.width;
    const visibleHeight = camera.height;
    const fixedX = visibleWidth / 2;
    const fixedY = visibleHeight / 2;
    const weights = this.zoneWeights(worldX);
    const zoneCenters = [this.boundaries[0] * 0.5, (this.boundaries[0] + this.boundaries[1]) * 0.5, this.boundaries[1] + 2900];

    this.far.forEach((layer, index) => {
      const source = this.scene.textures.get(layer.texture.key).getSourceImage();
      const scale = Math.max(visibleWidth / source.width, visibleHeight / source.height) * 1.06;
      layer.setScale(scale).setAlpha(weights[index]);
      const overflowX = Math.max(0, layer.displayWidth - visibleWidth);
      const localPan = Math.max(-1, Math.min(1, (worldX - zoneCenters[index]) / 3000));
      layer.setPosition(fixedX - localPan * overflowX * 0.36, fixedY);
      layer.setData('panX', -localPan * overflowX * 0.36);
    });

    const zone = weights.indexOf(Math.max(...weights));
    this.lastSnapshot = {
      zone,
      blend: weights.map((value) => Number(value.toFixed(4))),
      cameraX: Number(camera.scrollX.toFixed(2)),
      compositionMode: this.compositionMode,
      structuralTileSprites: 0,
      farPanX: this.far.map((layer) => Number((layer.getData('panX') || 0).toFixed(2))),
      roadPlaneOffsetY: this.far.map((layer) => layer.getData('roadPlaneOffsetY') || 0),
    };
  }

  snapshot() { return { ...this.lastSnapshot }; }

  destroy() { [...this.far, ...this.mid, ...this.near, ...this.ambience].forEach((layer) => layer?.destroy()); }
}

export default BackgroundLayerSystem;
