const MUSIC = new Set(['music-home', 'music-stage', 'music-boss']);
export const Audio = {
  current: null,
  playMusic(scene, key, volume = 0.24) {
    if (this.current?.key === key && this.current.isPlaying) return;
    this.stopMusic();
    if (!scene.cache.audio.exists(key)) return;
    this.current = scene.sound.add(key, { loop: true, volume }); this.current.play();
  },
  sfx(scene, key, volume = 0.45) { if (scene.cache.audio.exists(key)) scene.sound.play(key, { volume }); },
  pauseMusic() { if (this.current?.isPlaying) this.current.pause(); },
  resumeMusic() { if (this.current?.isPaused) this.current.resume(); },
  stopMusic() { this.current?.stop(); this.current?.destroy(); this.current = null; },
  stopAll(scene) { this.stopMusic(); for (const sound of scene.sound.getAllPlaying()) if (!MUSIC.has(sound.key)) sound.stop(); }
};
