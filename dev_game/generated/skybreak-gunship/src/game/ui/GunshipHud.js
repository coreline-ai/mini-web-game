import { SPEC } from '../data/spec.js';
import { ASSET_KEYS } from '../constants/gameKeys.js';

export default class GunshipHud {
  constructor(scene, onPause, onHelp) {
    const { width } = SPEC.canvas;
    this.panel = scene.add.graphics().setDepth(100);
    this.panel.fillStyle(0x03121d, 0.9).fillRoundedRect(8, 8, width - 16, 100, 18);
    this.panel.lineStyle(1.5, 0x47dfff, 0.7).strokeRoundedRect(8, 8, width - 16, 100, 18);
    this.title = scene.add.text(20, 17, 'OP SKYBRIDGE', { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#82ecff' }).setDepth(101);
    this.score = scene.add.text(20, 39, 'SCORE 000000', { fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#ffffff' }).setDepth(101);
    this.combo = scene.add.text(20, 64, 'SUPPORT x1', { fontFamily: 'Arial Black, Arial', fontSize: '12px', color: '#ffcd68' }).setDepth(101);
    this.time = scene.add.text(width - 70, 27, '90', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5).setDepth(101);
    this.timeLabel = scene.add.text(width - 70, 52, 'SEC', { fontFamily: 'Arial Black, Arial', fontSize: '9px', color: '#83a8b8' }).setOrigin(0.5).setDepth(101);
    this.pause = scene.add.image(width - 36, 79, ASSET_KEYS.uiPause).setDisplaySize(48, 48).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
    this.pause.on('pointerdown', onPause);
    this.help = scene.add.text(width - 75, 79, '?', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffffff', backgroundColor: '#163849', padding: { x: 8, y: 5 } }).setOrigin(0.5).setDepth(102).setInteractive({ useHandCursor: true });
    this.help.on('pointerdown', onHelp);
    this.convoyLabel = scene.add.text(124, 56, 'CONVOY', { fontFamily: 'Arial Black, Arial', fontSize: '9px', color: '#b5d7e2' }).setDepth(101);
    this.heatLabel = scene.add.text(124, 81, 'HEAT', { fontFamily: 'Arial Black, Arial', fontSize: '9px', color: '#b5d7e2' }).setDepth(101);
    this.convoyBack = scene.add.rectangle(166, 63, 126, 9, 0x1a3641, 1).setOrigin(0, 0.5).setDepth(101);
    this.convoyBar = scene.add.rectangle(166, 63, 126, 9, 0x42e6b0, 1).setOrigin(0, 0.5).setDepth(102);
    this.heatBack = scene.add.rectangle(166, 88, 126, 9, 0x1a3641, 1).setOrigin(0, 0.5).setDepth(101);
    this.heatBar = scene.add.rectangle(166, 88, 1, 9, 0x52d7ff, 1).setOrigin(0, 0.5).setDepth(102);
  }
  update(state) {
    this.score.setText(`SCORE ${String(state.score).padStart(6, '0')}`);
    this.combo.setText(`SUPPORT x${state.combo}`);
    this.time.setText(String(Math.max(0, Math.ceil(state.remaining))));
    this.convoyBar.width = 126 * Math.max(0, state.convoyHp / state.convoyMax);
    this.convoyBar.fillColor = state.convoyHp < 300 ? 0xff554f : 0x42e6b0;
    this.heatBar.width = Math.max(1, 126 * state.heat / 100);
    this.heatBar.fillColor = state.overheated ? 0xff4b45 : state.heat > 70 ? 0xffb43b : 0x52d7ff;
  }
  layoutEntries() {
    return [
      { id: 'score', obj: this.score }, { id: 'time', obj: this.time },
      { id: 'convoy', obj: this.convoyBack }, { id: 'heat', obj: this.heatBack },
      { id: 'help', obj: this.help }, { id: 'pause', obj: this.pause },
    ];
  }
  setVisible(v) { [this.panel, this.title, this.score, this.combo, this.time, this.timeLabel, this.help, this.pause, this.convoyLabel, this.heatLabel, this.convoyBack, this.convoyBar, this.heatBack, this.heatBar].forEach((o) => o.setVisible(v)); }
}
