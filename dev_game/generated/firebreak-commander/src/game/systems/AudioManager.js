import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from './SaveData.js';

export const AudioManager = {
  currentMusic: null,
  currentMusicKey: null,
  unlocked: false,
  mute: SaveData.getSettings().mute,
  unlock(scene) {
    if (this.unlocked) return;
    this.unlocked = true;
    if (scene.sound?.context?.state === 'suspended') scene.sound.context.resume();
  },
  setMute(scene, mute) {
    this.mute = !!mute;
    SaveData.setSettings({ mute: this.mute });
    if (scene?.sound) scene.sound.mute = this.mute;
  },
  playSfx(scene, key, volume = 0.65) {
    if (this.mute || !scene.cache.audio.exists(key)) return;
    scene.sound.play(key, { volume });
  },
  playMusic(scene, key, volume) {
    if (this.mute || !scene.cache.audio.exists(key)) return;
    if (this.currentMusic?.isPlaying && this.currentMusicKey === key) return;
    this.stopMusic();
    this.currentMusicKey = key;
    this.currentMusic = scene.sound.add(key, { loop: true, volume });
    this.currentMusic.play();
  },
  playHomeMusic(scene) { this.playMusic(scene, ASSET_KEYS.musicHome, 0.14); },
  playGameplayMusic(scene) { this.playMusic(scene, ASSET_KEYS.musicGameplay, 0.2); },
  stopMusic() { if (this.currentMusic) { this.currentMusic.stop(); this.currentMusic.destroy(); this.currentMusic = null; } this.currentMusicKey = null; },
  pauseMusic() { if (this.currentMusic?.isPlaying) this.currentMusic.pause(); },
  resumeMusic() { if (!this.mute && this.currentMusic?.isPaused) this.currentMusic.resume(); },
  snapshot() {
    return {
      instances: this.currentMusic ? 1 : 0,
      key: this.currentMusicKey,
      isPlaying: !!this.currentMusic?.isPlaying,
      isPaused: !!this.currentMusic?.isPaused,
      mute: this.mute,
      unlocked: this.unlocked,
    };
  },
};
