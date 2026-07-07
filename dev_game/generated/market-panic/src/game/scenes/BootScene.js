import Phaser from 'phaser';
import { SCENES } from '../data/spec.js';
import { SaveData } from '../systems/SaveData.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super(SCENES.BOOT); }
  preload() {
    this.load.image('loading_shell', 'backgrounds/stage-1.webp');
  }
  create() {
    SaveData.getSettings();
    this.scene.start(SCENES.LOADING);
  }
}
