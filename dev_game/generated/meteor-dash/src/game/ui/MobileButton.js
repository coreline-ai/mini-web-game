// opts.once=true: 씬/상태 전이 버튼용 one-shot 가드 — 1회 발화 후 즉시 disable
// (post-production-qa-contract §I: 더블탭 중복 전이 방지)
import { fontPx, strokePx, su } from '../constants/tuning.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';

function selectButtonTexture(scene, width, height) {
  if (Math.abs(width - su(220)) < 0.5 && height <= su(54) && scene.textures.exists(ASSET_KEYS.ui.frameSlim)) return ASSET_KEYS.ui.frameSlim;
  if (width >= su(225) && height <= su(64) && scene.textures.exists(ASSET_KEYS.ui.frameDialog)) return ASSET_KEYS.ui.frameDialog;
  if (scene.textures.exists(ASSET_KEYS.ui.frame)) return ASSET_KEYS.ui.frame;
  return null;
}

export function makeTextButton(scene, x, y, label, onClick, width = 190, height = 58, opts = {}) {
  const textureKey = selectButtonTexture(scene, width, height);
  const _k = 'btnui_' + width + 'x' + height;
  if (!textureKey && !scene.textures.exists(_k)) {
    const g = scene.make.graphics({ add: false });
    const r = Math.min(su(22), height / 2);
    g.fillStyle(0x0a3d1f, 1); g.fillRoundedRect(0, 0, width, height, r);
    g.fillStyle(0x22b357, 1); g.fillRoundedRect(su(2), su(2), width - su(4), height - su(6), r);
    g.fillStyle(0x46e07e, 0.85); g.fillRoundedRect(su(4), su(3), width - su(8), Math.max(su(3), height * 0.42), r);
    g.lineStyle(su(2.5), 0xffffff, 0.9); g.strokeRoundedRect(su(1), su(1), width - su(2), height - su(2), r);
    g.generateTexture(_k, width, height); g.destroy();
  }
  const bg = textureKey ? scene.add.image(x, y, textureKey).setDisplaySize(width, height) : scene.add.image(x, y, _k);
  const txt = scene.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: fontPx(24), color: '#ffffff', stroke: '#000000', strokeThickness: strokePx(4) }).setOrigin(0.5);
  bg.setInteractive({ useHandCursor: true });
  let fired = false;
  bg.on('pointerdown', () => {
    if (opts.once && fired) return;
    bg.setDisplaySize(width * 0.96, height * 0.96); txt.setScale(0.96);
    if (opts.once) { fired = true; bg.disableInteractive(); }
    onClick?.();
  });
  bg.on('pointerup', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  bg.on('pointerout', () => { bg.setDisplaySize(width, height); txt.setScale(1); });
  return { bg, txt, destroy: () => { bg.destroy(); txt.destroy(); } };
}
