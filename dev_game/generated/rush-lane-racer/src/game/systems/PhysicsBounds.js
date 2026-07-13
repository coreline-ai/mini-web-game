const MIN_SCALE = 0.0001;

export function setBodySizeInDisplayPixels(gameObject, width, height) {
  if (!gameObject?.body) return gameObject;
  const scaleX = Math.max(Math.abs(gameObject.scaleX || 1), MIN_SCALE);
  const scaleY = Math.max(Math.abs(gameObject.scaleY || 1), MIN_SCALE);
  gameObject.body.setSize(width / scaleX, height / scaleY, true);
  gameObject.body.updateFromGameObject?.();
  return gameObject;
}
