export const TEXT_RESOLUTION = Math.min(Math.max(Number(globalThis.devicePixelRatio) || 1, 1), 2);

export function sharpenText(text) {
  if (text && typeof text.setResolution === 'function') text.setResolution(TEXT_RESOLUTION);
  return text;
}
