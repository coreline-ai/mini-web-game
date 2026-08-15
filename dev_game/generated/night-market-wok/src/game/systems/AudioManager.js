import { ASSET_KEYS } from '../constants/gameKeys.js';
import { SaveData } from './SaveData.js';

export const AudioManager = {
  currentMusic: null,
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
  playGameplayMusic(scene) {
    if (this.mute || !scene.cache.audio.exists(ASSET_KEYS.musicGameplay)) return;
    if (this.currentMusic?.isPlaying) return;
    this.currentMusic = scene.sound.add(ASSET_KEYS.musicGameplay, { loop: true, volume: 0.22 });
    this.currentMusic.play();
  },
  stopMusic() { if (this.currentMusic) { this.currentMusic.stop(); this.currentMusic.destroy(); this.currentMusic = null; } },
  pauseMusic() { if (this.currentMusic?.isPlaying) this.currentMusic.pause(); },
  resumeMusic() { if (!this.mute && this.currentMusic?.isPaused) this.currentMusic.resume(); },
};
