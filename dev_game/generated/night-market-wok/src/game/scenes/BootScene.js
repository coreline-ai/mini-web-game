import Phaser from 'phaser';
import { SCENES } from '../data/spec.js';
import { SaveData } from '../systems/SaveData.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super(SCENES.BOOT); }
  create() {
    SaveData.getSettings();
    this.scene.start(SCENES.LOADING);
  }
}
