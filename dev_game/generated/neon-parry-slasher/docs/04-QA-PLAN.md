# 04 - QA Plan
# Project: Neon Parry: Blade Slasher (`neon-parry-slasher`)

## 1. Test Matrix & Scenarios
* **Scene Transitions**: Boot $\rightarrow$ Home $\rightarrow$ Game $\rightarrow$ Pause $\rightarrow$ GameOver $\rightarrow$ Game.
* **Input Hostility**:
  - Multi-touch spamming on canvas during gameplay.
  - Rapid pause / resume toggling.
  - Directional keyboard combinations (WASD + Space simultaneously).
* **Audio Stability**:
  - Mute toggle state persistence.
  - No overlapping BGM oscillator instances on restart.
* **Layout & DPR**:
  - Mobile portrait viewport (390x844) scaling verification.
  - Publication of `window.__GAME_LAYOUT_BOUNDS__` with required IDs: `score-display`, `pause`, `title`, `start-button`.
