# 02 - Technical Design Document
# Project: Neon Parry: Blade Slasher (`neon-parry-slasher`)

## 1. Engine & Tech Stack
* **Game Engine**: Phaser 3 (`^3.90.0`)
* **Bundler & Dev Server**: Vite (`^6.3.5`)
* **Audio**: Procedural Web Audio Synthesizer (`AudioSynth.js`)
* **Rendering**: Canvas 2D + WebGL with Additive & Screen Blend Modes

## 2. Architecture & Scene Flow
```text
[BootScene]
    ├── Preload Image Assets (public/assets/images/)
    ├── Process Dynamic Alpha Channels
    └── Transition to HomeScene
         │
[HomeScene] ── (Start Game) ──► [GameScene] ◄──► [PauseScene]
                                     │
                                (Shields = 0)
                                     ▼
                              [GameOverScene] ── (Retry) ──► [GameScene]
```

## 3. Entity & System Models
* **`PlayerRonin.js`**: Center position ($X: 195, Y: 438$), idle float tween, blade rotation, slash cooldown ($120\text{ms}$), invincibility timer.
* **`Projectile.js`**: Linear and curved movement towards center, deflection reversal ($2\times \sim 3\times$ velocity), despawn off-screen.
* **`VFXManager.js`**: Shockwaves, particle explosions, floating combat damage/combo text, camera shake and hit-stop.
* **`AudioSynth.js`**: Pure Web Audio oscillators (Sawtooth, Triangle, Square) and gain envelopes for low-latency zero-asset SFX/BGM.
* **`LayoutRegistry.js`**: Publishes viewport-normalized bounding boxes to `window.__GAME_LAYOUT_BOUNDS__` for automated QA contracts.
