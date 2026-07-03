import { GC } from '../config/gameConfig.js';

function assetUrl(path) {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.endsWith('/') ? base : `${base}/`}${path}`;
}

export function setViewportBackdrop(bgKey) {
  if (typeof document === 'undefined') return;
  const bg = GC.ASSETS.backgrounds.find((item) => item.key === bgKey);
  const path = bg?.path || `backgrounds/${bgKey}.svg`;
  document.body.style.setProperty('--game-stage-bg', `url("${assetUrl(path)}")`);
}
