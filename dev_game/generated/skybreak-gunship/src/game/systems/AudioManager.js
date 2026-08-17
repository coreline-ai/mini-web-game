import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from './SaveData.js';

const handles = { music: null, rotor: null, boss: null, gun: null };
const lastPlayed = new Map();

function destroyHandle(name) {
  const sound = handles[name];
  if (sound) { sound.stop(); sound.destroy(); handles[name] = null; }
}

export const AudioManager = {
  handles,
  unlocked: false,
  mute: SaveData.getSettings().mute,
  unlock(scene) {
    this.unlocked = true;
    if (scene.sound?.context?.state === 'suspended') scene.sound.context.resume();
  },
  setMute(scene, mute) {
    this.mute = Boolean(mute);
    SaveData.setSettings({ mute: this.mute });
    if (scene?.sound) scene.sound.mute = this.mute;
    if (this.mute) this.stopGunLoop();
  },
  playSfx(scene, key, volume = 0.65, config = {}) {
    if (this.mute || !scene.cache.audio.exists(key)) return null;
    const { throttleMs = 0, ...soundConfig } = config;
    const now = Number(scene.time?.now || performance.now());
    if (throttleMs > 0 && now - (lastPlayed.get(key) || -Infinity) < throttleMs) return null;
    lastPlayed.set(key, now);
    return scene.sound.play(key, { volume, ...soundConfig });
  },
  startLoop(scene, slot, key, volume) {
    if (this.mute || !this.unlocked || !scene.cache.audio.exists(key)) return null;
    if (handles[slot]?.isPlaying || handles[slot]?.isPaused) return handles[slot];
    destroyHandle(slot);
    handles[slot] = scene.sound.add(key, { loop: true, volume });
    handles[slot].play();
    return handles[slot];
  },
  playHomeMusic(scene) {
    this.stopMissionLayers();
    this.startLoop(scene, 'music', ASSET_KEYS.musicHome, 0.2);
  },
  playGameplayMusic(scene) {
    destroyHandle('music');
    this.startLoop(scene, 'music', ASSET_KEYS.musicGameplay, 0.26);
    this.startLoop(scene, 'rotor', ASSET_KEYS.rotorLoop, 0.15);
  },
  startBossLayer(scene) { this.startLoop(scene, 'boss', ASSET_KEYS.bossLoop, 0.16); },
  startGunLoop(scene) { this.startLoop(scene, 'gun', ASSET_KEYS.sfxGun, 0.36); },
  stopGunLoop() { destroyHandle('gun'); },
  stopMissionLayers() { destroyHandle('rotor'); destroyHandle('boss'); destroyHandle('gun'); },
  stopMusic() { destroyHandle('music'); this.stopMissionLayers(); },
  pauseMusic() { Object.values(handles).forEach((sound) => sound?.isPlaying && sound.pause()); },
  resumeMusic() { if (!this.mute) Object.values(handles).forEach((sound) => sound?.isPaused && sound.resume()); },
  activeCount(slot) { return handles[slot] && (handles[slot].isPlaying || handles[slot].isPaused) ? 1 : 0; },
};
