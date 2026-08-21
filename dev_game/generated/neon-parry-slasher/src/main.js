import Phaser from 'phaser';
import './style.css';
import config from './game/config.js';
import{AudioManager}from'./game/systems/AudioManager.js';
const game = new Phaser.Game(config);
if (typeof window !== 'undefined'){window.__GAME__=game;window.__GAME_QA__={getState:()=>window.__GAME_LAYOUT_BOUNDS__||null,audioState:()=>AudioManager.snapshot()};}
