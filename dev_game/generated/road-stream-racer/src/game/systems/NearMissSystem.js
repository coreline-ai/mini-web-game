import { SPEC } from '../data/spec.js';

export default class NearMissSystem {
  constructor(scene, player, score) {
    this.scene = scene;
    this.player = player;
    this.score = score;
    this.distance = SPEC.racing.nearMissDistance;
  }

  update(trafficGroup) {
    for (const car of trafficGroup.getChildren()) {
      if (!car.active || car.nearMissAwarded) continue;
      const passedPlayer = car.y > this.player.y + 70;
      const nearX = Math.abs(car.x - this.player.x) < this.distance;
      if (passedPlayer && nearX) {
        car.nearMissAwarded = true;
        this.score.addNearMiss();
        this.scene.events.emit('near-miss', car.x, this.player.y - 90);
      }
    }
  }
}
