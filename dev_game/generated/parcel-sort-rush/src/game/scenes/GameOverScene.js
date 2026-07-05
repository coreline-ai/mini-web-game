import Phaser from 'phaser';
import { SCENES, SPEC } from '../data/spec.js';
import { SaveData } from '../systems/SaveData.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';
import { makeImageTextButton } from '../ui/MobileButton.js';
import { publishLayoutBounds } from '../systems/LayoutBounds.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super(SCENES.GAMEOVER); }
  create(data = {}) {
    AudioManager.stopMusic();
    const { width, height } = SPEC.canvas;
    const score = data.score || 0;
    const isBest = SaveData.record(score);
    this.add.image(width / 2, height / 2, ASSET_KEYS.backgrounds.night).setDisplaySize(width, height).setDepth(-50);
    this.add.rectangle(0, 0, width, height, 0x000000, 0.52).setOrigin(0).setDepth(-10);
    const panelW = width * 0.82;
    const panelH = height * 0.58;
    const panelX = width / 2;
    const panelY = height * 0.55;
    const panelTop = panelY - panelH / 2;
    const panelG = this.add.graphics().setDepth(0);
    panelG.fillStyle(0x061421, 0.88);
    panelG.fillRoundedRect(panelX - panelW / 2, panelTop, panelW, panelH, 46);
    panelG.lineStyle(7, 0x74e9ff, 0.56);
    panelG.strokeRoundedRect(panelX - panelW / 2 + 4, panelTop + 4, panelW - 8, panelH - 8, 42);
    panelG.lineStyle(3, 0xffffff, 0.16);
    panelG.strokeRoundedRect(panelX - panelW / 2 + 22, panelTop + 22, panelW - 44, panelH - 44, 31);
    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0xffffff, 0.001).setDepth(1);

    const title = this.add.text(width / 2, height * 0.215, 'SORT END', { fontFamily: 'Arial Black, Arial', fontSize: '92px', color: '#ff6172', stroke: '#000', strokeThickness: 14 }).setOrigin(0.5).setDepth(2);
    const stamp = this.add.image(width / 2, height * 0.315, ASSET_KEYS.stampWrong).setDisplaySize(150, 150).setAlpha(0.95).setDepth(2);
    const scoreText = this.add.text(width / 2, height * 0.405, 'SCORE ' + score, { fontFamily: 'Arial Black, Arial', fontSize: '58px', color: '#fff', stroke: '#000', strokeThickness: 9 }).setOrigin(0.5).setDepth(2);
    const bestText = this.add.text(width / 2, height * 0.475, 'BEST ' + SaveData.getBest(), { fontFamily: 'Arial Black, Arial', fontSize: '42px', color: '#ffd35a', stroke: '#000', strokeThickness: 7 }).setOrigin(0.5).setDepth(2);
    const statText = this.add.text(width / 2, height * 0.545, `SORT ${data.sorted || 0}   WRONG ${data.wrong || 0}   MISS ${data.missed || 0}`, { fontFamily: 'Arial Black, Arial', fontSize: '32px', color: '#aeefff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(2);
    const newBest = isBest ? this.add.text(width / 2, height * 0.602, 'NEW BEST!', { fontFamily: 'Arial Black, Arial', fontSize: '44px', color: '#38e88b', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(2) : null;
    const retry = makeImageTextButton(this, width / 2, height * 0.668, 'RETRY', ASSET_KEYS.ui.buttonPlay, () => this.scene.start(SCENES.GAME), 500, 112, '52px');
    const home = makeImageTextButton(this, width / 2, height * 0.748, 'HOME', ASSET_KEYS.ui.buttonHome, () => this.scene.start(SCENES.HOME), 492, 110, '50px');
    retry.bg.parentContainer?.setDepth(3);
    home.bg.parentContainer?.setDepth(3);
    publishLayoutBounds(this, [
      { id: 'gameover-panel', object: panel, allowOverlap: true },
      { id: 'gameover-title', object: title },
      { id: 'gameover-stamp', object: stamp, mustBeInside: 'gameover-panel', innerPadding: 4 },
      { id: 'gameover-score', object: scoreText, mustBeInside: 'gameover-panel', innerPadding: 5 },
      { id: 'gameover-best', object: bestText, mustBeInside: 'gameover-panel', innerPadding: 5 },
      { id: 'gameover-stats', object: statText, mustBeInside: 'gameover-panel', innerPadding: 5 },
      ...(newBest ? [{ id: 'gameover-new-best', object: newBest, mustBeInside: 'gameover-panel', innerPadding: 5 }] : []),
      { id: 'gameover-retry-button', object: retry.bg, mustBeInside: 'gameover-panel', innerPadding: 5 },
      { id: 'gameover-home-button', object: home.bg, mustBeInside: 'gameover-panel', innerPadding: 5 },
    ], {
      requiredIds: [
        'gameover-panel',
        'gameover-title',
        'gameover-stamp',
        'gameover-score',
        'gameover-best',
        'gameover-stats',
        'gameover-retry-button',
        'gameover-home-button',
      ],
    });
  }
}
