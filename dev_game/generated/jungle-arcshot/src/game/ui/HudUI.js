import { SPEC } from '../data/spec.js';
import { fontPx, strokePx, su, worldX } from '../constants/tuning.js';
import { makeTextButton } from './MobileButton.js';

export default class HudUI {
  constructor(scene, onPause) {
    this.scoreText = scene.add.text(worldX(18), su(18), 'SCORE 0', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(18), color: '#ffffff', stroke: '#000000', strokeThickness: strokePx(4) }).setDepth(20);
    this.levelText = scene.add.text(worldX(18), su(44), 'LV 1', { fontFamily: 'Arial Black, Arial', fontSize: fontPx(14), color: '#b9d7ff', stroke: '#000000', strokeThickness: strokePx(3) }).setDepth(20);
    if (scene.textures.exists('ui_pause')) {
      const normalSize = su(56);
      const pressedSize = su(52);
      const img = scene.add.image(worldX(344), su(42), 'ui_pause').setDisplaySize(normalSize, normalSize).setInteractive({ useHandCursor: true });
      let locked = false;
      const restore = () => img.setDisplaySize(normalSize, normalSize);
      img.on('pointerdown', (_pointer, _localX, _localY, event) => {
        event?.stopPropagation();
        if (locked) return;
        locked = true;
        img.disableInteractive();
        img.setDisplaySize(pressedSize, pressedSize);
        scene.time.delayedCall(50, () => {
          restore();
          locked = false;
          if (img.active) img.setInteractive({ useHandCursor: true });
          onPause && onPause();
        });
      });
      img.on('pointerup', (_pointer, _localX, _localY, event) => { event?.stopPropagation(); restore(); });
      img.on('pointerout', (_pointer, event) => { event?.stopPropagation(); restore(); });
      this.pause = { bg: img, txt: img, destroy: () => img.destroy() };
    } else {
      this.pause = makeTextButton(scene, worldX(336), su(38), 'II', onPause, su(58), su(48));
    }
    this.pause.bg.setDepth(20); this.pause.txt.setDepth(21);
  }
  update(score, level) {
    this.scoreText.setText('SCORE ' + score);
    this.levelText.setText('LV ' + level);
  }
  setVisible(v) {
    this.scoreText.setVisible(v); this.levelText.setVisible(v); this.pause.bg.setVisible(v); this.pause.txt.setVisible(v);
  }
}
