import Phaser from 'phaser';
import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import { FONT_BODY, FONT_HEAVY, fitTextWidth, formatCount, iconButton, panel } from '../ui/UiKit.js';
import { setViewportBackdrop } from '../ui/ViewportBackdrop.js';

export default class RankingScene extends Phaser.Scene {
  constructor() {
    super(SCENES.RANKING);
  }

  create() {
    this.sound.mute = Save.mute;
    setViewportBackdrop(Save.selBg);
    this.add.image(GC.WIDTH / 2, GC.HEIGHT / 2, Save.selBg).setDepth(0);
    this.add.rectangle(0, 0, GC.WIDTH, GC.HEIGHT, 0x0b0d1a, 0.8).setOrigin(0, 0).setDepth(1);

    const runs = Save.data.runs.slice(0, 8);
    const visibleRows = runs.length || 3;
    const boardTop = 560;
    const boardH = Phaser.Math.Clamp(160 + visibleRows * 108, 450, 980);
    const boardY = boardTop + boardH / 2;
    panel(this, GC.WIDTH / 2, boardY, 760, boardH, { alpha: 0.78, strokeAlpha: 0.34, radius: 34, depth: 2 });

    this.add.image(GC.WIDTH / 2, 150, 'btn_trophy').setDisplaySize(150, 150).setDepth(3);
    this.add.text(GC.WIDTH / 2, 280, '랭킹', { fontFamily: FONT_HEAVY, fontSize: '80px', color: '#fff', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(3);

    fitTextWidth(
      this.add.text(GC.WIDTH / 2, 380, `BEST  ${formatCount(Save.best)}`, { fontFamily: FONT_HEAVY, fontSize: '68px', color: '#ffd54a', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(3),
      650,
    );

    if (runs.length === 0) {
      this.add.text(GC.WIDTH / 2, boardY, '아직 기록이 없어요.\n플레이해서 점수를 남겨보세요!', { fontFamily: FONT_BODY, fontSize: '44px', color: '#ffffffcc', align: 'center', lineSpacing: 10 }).setOrigin(0.5).setDepth(3);
    } else {
      runs.forEach((score, i) => {
        const y = boardTop + 80 + i * 108;
        const rank = `${i + 1}위`;
        const row = this.add.rectangle(GC.WIDTH / 2, y, 610, 78, 0x07162b, i === 0 ? 0.72 : 0.46).setDepth(3);
        row.setStrokeStyle(2, i === 0 ? 0xffd54a : 0xffffff, i === 0 ? 0.42 : 0.18);
        this.add.text(GC.WIDTH * 0.34, y, rank, { fontFamily: FONT_HEAVY, fontSize: '48px', color: i < 3 ? '#ffd54a' : '#ffffffcc', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(4);
        fitTextWidth(
          this.add.text(GC.WIDTH * 0.66, y, formatCount(score), { fontFamily: FONT_HEAVY, fontSize: '52px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(4),
          320,
        );
      });
    }

    iconButton(this, 90, GC.HEIGHT - 100, 'btn_home', () => this.scene.start(SCENES.HOME)).setDepth(3);
  }
}
