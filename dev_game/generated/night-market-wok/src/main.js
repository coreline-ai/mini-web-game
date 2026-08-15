import Phaser from 'phaser';
import './styles/mobile.css';
import config from './game/config.js';

window.addEventListener('load', () => {
  const game = new Phaser.Game(config);
  window.__GAME__ = game;
});
