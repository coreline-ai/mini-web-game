import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import { iconButton } from '../ui/UiKit.js';

export default class RankingScene extends Phaser.Scene {
  constructor() {
    super(SCENES.RANKING);
  }

  create() {
    this.sound.mute = Save.mute;
    this.add.image(GC.WIDTH / 2, GC.HEIGHT / 2, Save.selBg).setDepth(0);
    this.add.rectangle(0, 0, GC.WIDTH, GC.HEIGHT, 0x0b0d1a, 0.75).setOrigin(0, 0).setDepth(1);

    this.add.image(GC.WIDTH / 2, 150, 'btn_trophy').setDisplaySize(150, 150).setDepth(3);
    this.add.text(GC.WIDTH / 2, 280, '랭킹', { fontFamily: 'Arial Black, Arial', fontSize: '80px', color: '#fff', stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setDepth(3);

    this.add.text(GC.WIDTH / 2, 380, `BEST  ${Save.best}`, { fontFamily: 'Arial Black, Arial', fontSize: '68px', color: '#ffd54a', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(3);

    const runs = Save.data.runs.slice(0, 8);
    if (runs.length === 0) {
      this.add.text(GC.WIDTH / 2, 620, '아직 기록이 없어요.\n플레이해서 점수를 남겨보세요!', { fontFamily: 'Arial', fontSize: '44px', color: '#ffffffcc', align: 'center' }).setOrigin(0.5).setDepth(3);
    } else {
      runs.forEach((score, i) => {
        const y = 500 + i * 120;
        const medal = ['🥇', '🥈', '🥉'][i] || `${i + 1}.`;
        this.add.text(GC.WIDTH * 0.28, y, medal, { fontFamily: 'Arial', fontSize: '56px', color: '#fff' }).setOrigin(0.5).setDepth(3);
        this.add.text(GC.WIDTH * 0.62, y, `${score}`, { fontFamily: 'Arial Black, Arial', fontSize: '56px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(3);
      });
    }

    iconButton(this, 90, GC.HEIGHT - 100, 'btn_home', () => this.scene.start(SCENES.HOME)).setDepth(3);
  }
}
