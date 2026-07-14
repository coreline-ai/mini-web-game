import { SPEC } from '../data/spec.js';
import { makeTextButton } from './MobileButton.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { FIREBREAK_CONFIG } from '../config/firebreakConfig.js';
import { GAME_RULES } from '../config/gameRules.js';

const OBJECTIVE_LABELS = { village: '마을', substation: '전력', refuge: '야생' };
const WIND_LABELS = { N: '북', NE: '북동', E: '동', SE: '남동', S: '남', SW: '남서', W: '서', NW: '북서' };

export default class HudUI {
  constructor(scene, onPause, onHelp) {
    const { width } = SPEC.canvas;
    this.panel = scene.add.rectangle(width / 2, 58, width - 16, 100, 0x061a15, 0.94).setStrokeStyle(2, 0x66c9a6, 0.7).setDepth(40);
    this.titleText = scene.add.text(18, 13, '파인 리지 산불 대응', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '13px', color: '#90e3c4' }).setDepth(41);
    this.timeText = scene.add.text(18, 34, `남은 시간 ${GAME_RULES.durationSeconds}`, { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '17px', color: '#ffffff' }).setDepth(41);
    this.scoreText = scene.add.text(150, 34, '점수 0', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '15px', color: '#ffd578' }).setDepth(41);
    this.windText = scene.add.text(205, 14, '바람 동 1', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '13px', color: '#f4b265' }).setDepth(41);
    this.windIcon = scene.textures.exists(ASSET_KEYS.uiWind) ? scene.add.image(304, 24, ASSET_KEYS.uiWind).setDisplaySize(24, 24).setDepth(42) : null;
    this.resourceText = scene.add.text(18, 62, `물 ${FIREBREAK_CONFIG.resources.water}   연료 ${FIREBREAK_CONFIG.resources.fuel}`, { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '14px', color: '#bdeaff' }).setDepth(41);
    this.objectiveText = scene.add.text(18, 84, '불꽃 0  |  마을 100  전력 100  야생 100', { fontFamily: 'Arial Black, Apple SD Gothic Neo, Arial, sans-serif', fontSize: '11px', color: '#d8eadc' }).setDepth(41);
    this.help = makeTextButton(scene, width - 34, 94, '?', onHelp, 40, 28);
    this.help.bg.setDepth(42); this.help.txt.setDepth(43).setFontSize(18);
    if (scene.textures.exists(ASSET_KEYS.uiPause)) {
      const image = scene.add.image(width - 34, 50, ASSET_KEYS.uiPause).setDisplaySize(48, 48).setInteractive({ useHandCursor: true });
      let fired = false;
      image.on('pointerdown', (_pointer, _lx, _ly, event) => { event?.stopPropagation(); if (!fired) image.setDisplaySize(44, 44); });
      image.on('pointerup', (_pointer, _lx, _ly, event) => { event?.stopPropagation(); if (fired) return; fired = true; image.disableInteractive(); image.setDisplaySize(48, 48); onPause?.(); });
      image.on('pointerout', () => image.setDisplaySize(48, 48));
      this.pause = { bg: image, txt: image, setEnabled(value) { fired = !value; if (value) image.setInteractive({ useHandCursor: true }); else image.disableInteractive(); image.setDisplaySize(48, 48); }, destroy: () => image.destroy() };
    } else {
      this.pause = makeTextButton(scene, width - 34, 50, 'Ⅱ', onPause, 48, 48, { oneShot: true, fireOn: 'pointerup' });
    }
    this.pause.bg.setDepth(42); this.pause.txt.setDepth(43);
  }

  update({ score, remainingSeconds, wind, resources, objectives, activeFire }) {
    this.timeText.setText(`남은 시간 ${remainingSeconds}`);
    this.scoreText.setText(`점수 ${score}`);
    this.windText.setText(`바람 ${WIND_LABELS[wind.direction] || wind.direction} ${wind.speed}`);
    if (this.windIcon) {
      const angles = { E: 0, SE: 45, S: 90, SW: 135, W: 180, NW: 225, N: 270, NE: 315 };
      this.windIcon.setAngle(angles[wind.direction] || 0);
    }
    this.resourceText.setText(`물 ${Math.floor(resources.water)}   연료 ${Math.floor(resources.fuel)}`);
    const objectiveStatus = objectives.map((objective) => `${OBJECTIVE_LABELS[objective.id]} ${Math.max(0, Math.ceil(objective.integrity))}`).join('  ');
    this.objectiveText.setText(`불꽃 ${activeFire}  |  ${objectiveStatus}`);
  }

  setVisible(value) {
    [this.panel, this.titleText, this.timeText, this.scoreText, this.windText, this.windIcon, this.resourceText, this.objectiveText, this.pause.bg, this.pause.txt, this.help.bg, this.help.txt].filter(Boolean).forEach((object) => object.setVisible(value));
    if (value) this.pause.setEnabled?.(true);
  }

  getLayoutEntries() {
    return [
      { id: 'hud-panel', obj: this.panel, allowOverlap: true }, { id: 'time', obj: this.timeText }, { id: 'score', obj: this.scoreText },
      { id: 'wind', obj: this.windText }, ...(this.windIcon ? [{ id: 'wind-icon', obj: this.windIcon }] : []), { id: 'resources', obj: this.resourceText }, { id: 'objectives', obj: this.objectiveText }, { id: 'pause', obj: this.pause.bg }, { id: 'help', obj: this.help.bg },
    ];
  }
}
