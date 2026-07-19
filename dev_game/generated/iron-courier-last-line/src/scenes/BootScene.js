import Phaser from 'phaser';
import { SCENES } from '../constants.js';
export default class BootScene extends Phaser.Scene {
  constructor() { super(SCENES.BOOT); }
  preload() { this.load.image('ui-loading-frame', '/assets/runtime/ui/hud-frame.png'); }
  create() { this.scene.start(SCENES.LOADING); }
}
