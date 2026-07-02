import { GC, SCENES } from '../config/gameConfig.js';
import { Save } from '../systems/SaveData.js';
import { textButton, iconButton } from '../ui/UiKit.js';

// GameScene 위 오버레이. 이어하기(하트/코인) 또는 종료.
export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super(SCENES.GAMEOVER);
  }

  create(data) {
    this.gameKey = data?.gameKey ?? SCENES.GAME;
    const game = this.scene.get(this.gameKey);
    const score = game.score.getScore();
    const runCoins = game.coins.runCoins;
    const isNewBest = score > Save.best;

    this.add.rectangle(0, 0, GC.WIDTH, GC.HEIGHT, 0x000000, 0.7).setOrigin(0, 0);

    if (this.textures.exists('msg_gameover')) {
      this.add.image(GC.WIDTH / 2, GC.HEIGHT * 0.24, 'msg_gameover').setScale(1.1);
    } else {
      this.add.text(GC.WIDTH / 2, GC.HEIGHT * 0.24, 'GAME OVER', { fontFamily: 'Arial Black, Arial', fontSize: '110px', color: '#ff5a5a' }).setOrigin(0.5);
    }

    this.add.text(GC.WIDTH / 2, GC.HEIGHT * 0.37, `SCORE  ${score}`, { fontFamily: 'Arial Black, Arial', fontSize: '78px', color: '#fff', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5);
    this.add.text(GC.WIDTH / 2, GC.HEIGHT * 0.44, `BEST  ${Math.max(Save.best, score)}`, { fontFamily: 'Arial', fontSize: '54px', color: '#ffd54a' }).setOrigin(0.5);

    // 획득 코인
    this.add.image(GC.WIDTH / 2 - 60, GC.HEIGHT * 0.5, 'coin_01').setDisplaySize(56, 56);
    this.add.text(GC.WIDTH / 2 - 20, GC.HEIGHT * 0.5, `+${runCoins}`, { fontFamily: 'Arial Black, Arial', fontSize: '50px', color: '#ffd54a' }).setOrigin(0, 0.5);

    if (isNewBest) {
      const nb = this.add.text(GC.WIDTH / 2, GC.HEIGHT * 0.56, '🎉 NEW BEST! 🎉', { fontFamily: 'Arial Black, Arial', fontSize: '58px', color: '#00e676' }).setOrigin(0.5);
      this.tweens.add({ targets: nb, scale: 1.12, duration: 500, yoyo: true, repeat: -1 });
    }

    // 이어하기 (무료 하트 or 코인)
    let btnY = GC.HEIGHT * 0.66;
    if (game.canContinue()) {
      const free = !game.freeContinueUsed;
      const label = free ? '이어하기 (무료)' : `이어하기 (🪙${GC.HEART.costCoins})`;
      if (this.anims.exists('heart_pulse')) {
        this.add.sprite(GC.WIDTH / 2 - 300, btnY, 'heart_01').setDisplaySize(84, 84).play('heart_pulse');
      }
      textButton(this, GC.WIDTH / 2 + 20, btnY, label, () => this.continueRun(), { fontSize: '56px', color: '#7CFC98' });
      btnY += GC.HEIGHT * 0.1;
    }

    textButton(this, GC.WIDTH / 2, btnY, '↻  다시하기', () => this.exitTo(SCENES.GAME));

    iconButton(this, GC.WIDTH / 2 - 110, GC.HEIGHT * 0.88, 'btn_home', () => this.exitTo(SCENES.HOME));
    iconButton(this, GC.WIDTH / 2 + 110, GC.HEIGHT * 0.88, 'btn_shop', () => this.exitTo(SCENES.SHOP));
  }

  continueRun() {
    const game = this.scene.get(this.gameKey);
    game.revive();
    this.scene.resume(this.gameKey);
    this.scene.stop();
  }

  exitTo(sceneKey) {
    const game = this.scene.get(this.gameKey);
    if (game && game.bankRun) game.bankRun();
    this.scene.stop(this.gameKey);
    this.scene.start(sceneKey);
    this.scene.stop();
  }
}
