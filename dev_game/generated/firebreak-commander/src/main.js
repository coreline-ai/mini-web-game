import Phaser from 'phaser';
import './styles/mobile.css';
import config from './game/config.js';
import { AudioManager } from './game/systems/AudioManager.js';

function setBootStatus(message) {
  const status = document.getElementById('boot-status');
  if (status) status.textContent = message;
}

function bootGame() {
  if (window.__GAME__) return;
  try {
    const game = new Phaser.Game(config);
    window.__GAME__ = game;
    window.__RENDERER_MODE__ = 'canvas-forced';
    window.__AUDIO_DEBUG__ = () => AudioManager.snapshot();
    window.__GAME_QA__ = {
      getState: () => window.__FIREBREAK_DEBUG__?.get?.() || null,
      audioState: () => AudioManager.snapshot(),
    };
    requestAnimationFrame(() => document.getElementById('boot-status')?.remove());
  } catch (error) {
    console.error(error);
    setBootStatus(`게임 초기화 실패\n${error?.message || error}`);
  }
}

window.addEventListener('error', (event) => {
  if (!window.__GAME__) setBootStatus(`스크립트 실행 오류\n${event.message || '알 수 없는 오류'}`);
});

// Some embedded WebViews evaluate a deferred module after window.load has
// already fired. Starting immediately avoids a permanently blank page.
bootGame();
