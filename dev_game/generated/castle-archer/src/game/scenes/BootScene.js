import Phaser from 'phaser';
import { SCENES } from '../data/spec.js';
import { SaveData } from '../systems/SaveData.js';
import { applyLogicalCamera } from '../constants/renderScale.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super(SCENES.BOOT); }
  create() {
    applyLogicalCamera(this);
    SaveData.getSettings();
    this.scene.start(SCENES.LOADING);
  }
}
