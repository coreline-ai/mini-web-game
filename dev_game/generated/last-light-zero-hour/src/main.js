import Phaser from 'phaser';
import './styles/mobile.css';
import config from './game/config.js';

function bootGame() {
  if (window.__GAME__) return;
  const game = new Phaser.Game(config);
  window.__GAME__ = game;
}

// Cloudflare Quick Tunnel can keep Vite's HMR connection open, which delays
// window.load. The game itself only needs the document root, so start as soon
// as DOM parsing is complete instead of waiting for every network connection.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootGame, { once: true });
else bootGame();
