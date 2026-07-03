import { GC } from '../config/gameConfig.js';
import { Save } from './SaveData.js';

// 전역 BGM 헬퍼. Phaser SoundManager는 씬 간 공유되므로 중복 재생을 방지한다.
export const Music = {
  get(scene, track = GC.AUDIO.music?.arcadeSurvivalLoop) {
    if (!track || !scene?.cache?.audio?.exists(track.key)) return null;
    let bgm = scene.sound.get(track.key);
    if (!bgm) {
      bgm = scene.sound.add(track.key, {
        loop: true,
        volume: track.volume ?? 0.28,
      });
    } else if (bgm.volume !== (track.volume ?? 0.28)) {
      bgm.setVolume(track.volume ?? 0.28);
    }
    return bgm;
  },

  play(scene, track = GC.AUDIO.music?.arcadeSurvivalLoop) {
    const bgm = this.get(scene, track);
    if (!bgm) return null;

    scene.sound.mute = Save.mute;
    if (Save.mute) return bgm;

    if (bgm.isPaused) bgm.resume();
    else if (!bgm.isPlaying) bgm.play({ loop: true, volume: track.volume ?? 0.28 });
    return bgm;
  },

  pause(scene, track = GC.AUDIO.music?.arcadeSurvivalLoop) {
    const bgm = track ? scene?.sound?.get(track.key) : null;
    if (bgm?.isPlaying) bgm.pause();
  },

  stop(scene, track = GC.AUDIO.music?.arcadeSurvivalLoop) {
    const bgm = track ? scene?.sound?.get(track.key) : null;
    if (bgm?.isPlaying || bgm?.isPaused) bgm.stop();
  },

  syncMute(scene, { playIfUnmuted = false } = {}) {
    if (!scene?.sound) return;
    scene.sound.mute = Save.mute;
    if (Save.mute) this.pause(scene);
    else if (playIfUnmuted) this.play(scene);
  },
};
