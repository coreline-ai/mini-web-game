import { SPEC } from '../data/spec.js';

export function addCoverImage(scene, key, depth = -50, alpha = 1) {
  if (!scene.textures.exists(key)) return null;
  const image = scene.add.image(SPEC.canvas.width / 2, SPEC.canvas.height / 2, key).setDepth(depth).setAlpha(alpha);
  const scale = Math.max(SPEC.canvas.width / image.width, SPEC.canvas.height / image.height);
  image.setScale(scale);
  return image;
}
