import Phaser from 'phaser';
import { SCENES } from '../data/spec.js';
import { SaveData } from '../systems/SaveData.js';
import { configureLogicalScene } from '../systems/LogicalViewport.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super(SCENES.BOOT); }
  create() {
    configureLogicalScene(this);
    SaveData.getSettings();
    this.scene.start(SCENES.LOADING);
  }
}
