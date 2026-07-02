import { GC } from '../config/gameConfig.js';

// 코인 드롭 / 자석 흡수 / 수집. 코인은 coin_spin 애니 재생.
export default class CoinManager {
  constructor(scene) {
    this.scene = scene;
    this.runCoins = 0;
    this.group = scene.physics.add.group({ maxSize: 60, allowGravity: false });
  }

  spawn(x, y) {
    const coin = this.group.get(x, y, 'coin_01');
    if (!coin) return;
    coin.enableBody(true, x, y, true, true);
    coin.setDepth(6).setDisplaySize(GC.COIN.size, GC.COIN.size);
    coin.body.setCircle(coin.width / 2);
    coin.body.setAllowGravity(false);
    coin.setVelocity(Phaser.Math.Between(-60, 60), 180);
    if (this.scene.anims.exists('coin_spin')) coin.play('coin_spin');
  }

  // 자석 활성 시 플레이어로 끌어당김 + 화면 밖 회수
  update(player, magnetActive) {
    this.group.children.each((coin) => {
      if (!coin.active) return;
      if (magnetActive) {
        const d = Phaser.Math.Distance.Between(coin.x, coin.y, player.x, player.y);
        if (d < GC.COIN.magnetRadius) {
          const ang = Phaser.Math.Angle.Between(coin.x, coin.y, player.x, player.y);
          coin.setVelocity(Math.cos(ang) * GC.COIN.magnetSpeed, Math.sin(ang) * GC.COIN.magnetSpeed);
        }
      }
      if (coin.y > GC.POOP.DESPAWN_Y) coin.disableBody(true, true);
    });
  }

  collect(coin) {
    if (!coin.active) return;
    coin.disableBody(true, true);
    this.runCoins += 1;
  }

  reset() {
    this.runCoins = 0;
    this.group.children.each((c) => c.disableBody(true, true));
  }
}
