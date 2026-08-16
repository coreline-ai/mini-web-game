// AudioManager — BGM 단일 핸들 + SFX.
//
// 결함 클래스 H(오디오 상태) 규칙을 구조로 강제한다:
//  - BGM 핸들은 전역 하나뿐이다. 씬을 다시 들어가도 인스턴스가 늘지 않는다.
//  - 일시정지·홈·백그라운드 전환에서 정지/일시정지된다.
//  - mute는 저장되는 전역 상태이며 SFX에도 함께 적용된다.

let current = null;
let muted = false;

export const AudioManager = {
  setMuted(value) {
    muted = !!value;
    if (current) current.setMute?.(muted);
  },
  isMuted() { return muted; },

  playMusic(scene, key) {
    if (!scene?.sound) return null;
    if (!scene.cache?.audio?.exists?.(key)) return null;
    // 같은 트랙이 이미 돌고 있으면 재생성하지 않는다 — 이것이 중복 인스턴스의 유일한 원인이었다.
    if (current?.key === key && current.isPlaying) return current;
    current?.stop?.();
    current?.destroy?.();
    current = scene.sound.add(key, { loop: true, volume: 0.55 });
    current.setMute?.(muted);
    current.play?.();
    return current;
  },

  playSfx(scene, key, volume = 0.7) {
    if (muted || !scene?.sound) return;
    if (!scene.cache?.audio?.exists?.(key)) return;
    scene.sound.play(key, { volume });
  },

  pauseMusic() { current?.pause?.(); },
  resumeMusic() { if (current && !current.isPlaying) current.resume?.(); },
  stopMusic() { current?.stop?.(); current?.destroy?.(); current = null; },

  snapshot() {
    return {
      instances: current ? 1 : 0,
      key: current?.key || null,
      isPlaying: !!current?.isPlaying,
      isPaused: !!current?.isPaused,
      mute: muted,
    };
  },
};
