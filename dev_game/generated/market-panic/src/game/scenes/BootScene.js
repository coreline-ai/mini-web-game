import Phaser from 'phaser';
import { SCENES } from '../data/spec.js';
import { BOOT_IMAGE_PATHS } from '../constants/gameKeys.js';
import { SaveData } from '../systems/SaveData.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super(SCENES.BOOT); }
  preload() {
    Object.entries(BOOT_IMAGE_PATHS).forEach(([key, path]) => this.load.image(key, path));
  }
  create() {
    SaveData.getSettings();
    this.scene.start(SCENES.LOADING);
  }
}
