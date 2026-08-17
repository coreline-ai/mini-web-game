import Phaser from 'phaser';
import { GAME_RULES } from '../config/gameRules.js';
import { pointerToLogical } from './LogicalViewport.js';

export default class AimSystem {
  constructor(scene) {
    this.scene = scene;
    this.x = 195;
    this.y = 430;
    this.pointerId = null;
    this.view = scene.add.graphics().setDepth(85);
    this.view.lineStyle(2, 0x5eeaff, 0.95);
    this.view.strokeLineShape(new Phaser.Geom.Line(-24, -16, -10, -16));
    this.view.strokeLineShape(new Phaser.Geom.Line(-24, -16, -24, -4));
    this.view.strokeLineShape(new Phaser.Geom.Line(24, -16, 10, -16));
    this.view.strokeLineShape(new Phaser.Geom.Line(24, -16, 24, -4));
    this.view.strokeLineShape(new Phaser.Geom.Line(-24, 16, -10, 16));
    this.view.strokeLineShape(new Phaser.Geom.Line(-24, 16, -24, 4));
    this.view.strokeLineShape(new Phaser.Geom.Line(24, 16, 10, 16));
    this.view.strokeLineShape(new Phaser.Geom.Line(24, 16, 24, 4));
    this.view.fillStyle(0xffffff, 1).fillCircle(0, 0, 2);
    this.view.setPosition(this.x, this.y);
    this.down = (pointer) => {
      const world = pointerToLogical(scene, pointer);
      if (world.y < GAME_RULES.playfield.top || world.y > GAME_RULES.playfield.bottom) return;
      if (this.pointerId !== null) return;
      this.pointerId = pointer.id;
      this.move(pointer);
    };
    this.movePointer = (pointer) => { if (pointer.id === this.pointerId && pointer.isDown) this.move(pointer); };
    this.up = (pointer) => { if (pointer.id === this.pointerId) this.pointerId = null; };
    scene.input.on('pointerdown', this.down);
    scene.input.on('pointermove', this.movePointer);
    scene.input.on('pointerup', this.up);
    scene.input.on('pointerupoutside', this.up);
  }
  move(pointer) {
    const world = pointerToLogical(this.scene, pointer);
    this.x = Phaser.Math.Clamp(world.x, 24, 366);
    this.y = Phaser.Math.Clamp(world.y - GAME_RULES.playfield.aimOffsetY, GAME_RULES.playfield.top + 18, GAME_RULES.playfield.bottom - 18);
    this.view.setPosition(this.x, this.y);
  }
  pulse(color = 0xffffff) {
    this.view.setTint(color);
    this.scene.time.delayedCall(55, () => this.view?.clearTint());
  }
  destroy(destroyView = true) {
    this.scene.input.off('pointerdown', this.down);
    this.scene.input.off('pointermove', this.movePointer);
    this.scene.input.off('pointerup', this.up);
    this.scene.input.off('pointerupoutside', this.up);
    if (destroyView) this.view.destroy();
  }
}
