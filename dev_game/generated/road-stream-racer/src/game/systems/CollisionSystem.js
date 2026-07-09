export function setArcadeBox(sprite, width, height, offsetX = 0, offsetY = 0) {
  if (!sprite?.body) return;
  sprite.body.setSize(width, height);
  const x = (sprite.displayWidth - width) / 2 + offsetX;
  const y = (sprite.displayHeight - height) / 2 + offsetY;
  sprite.body.setOffset(x, y);
}

export function resetSpriteBody(sprite) {
  if (!sprite?.body) return;
  sprite.body.enable = true;
  sprite.body.setVelocity(0, 0);
}
