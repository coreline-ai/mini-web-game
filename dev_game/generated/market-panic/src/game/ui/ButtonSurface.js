export function makeSolidButtonTexture(scene, key, width, height, fillColor, borderColor = 0xffffff) {
  if (scene.textures.exists(key)) return key;
  const radius = 8;
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0x07111f, 1);
  g.fillRoundedRect(0, 0, width, height, radius);
  g.fillStyle(fillColor, 1);
  g.fillRoundedRect(3, 3, width - 6, height - 6, radius - 2);
  g.lineStyle(3, borderColor, 1);
  g.strokeRoundedRect(1.5, 1.5, width - 3, height - 3, radius - 1);
  g.lineStyle(1, 0x020617, 1);
  g.strokeRoundedRect(5.5, 5.5, width - 11, height - 11, Math.max(3, radius - 4));
  g.generateTexture(key, width, height);
  g.destroy();
  return key;
}
