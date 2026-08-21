# 01 - Game Design Document (GDD)
# Project: Neon Parry: Blade Slasher (`neon-parry-slasher`)

## 1. High Concept & Overview
* **Genre**: 2D Cyberpunk Rhythm & Parry Action
* **Platform**: Mobile Web / Desktop (9:16 Portrait Canvas: 390x844)
* **Tagline**: Deflect high-speed neon projectiles and drones with split-second blade slashes to unleash devastating Fever Overdrive!
* **Target Audience**: Arcade, rhythm, and reflex action lovers.

## 2. Core Gameplay Loop (30-Second Loop)
1. **Spawn**: Energy pulses, drones, and missiles converge toward the player at the screen center.
2. **Defend/Slash**: Player swipes, taps, or uses directional keys in the direction of the projectile right before impact.
3. **Parry Window**:
   - **Just Parry (≤68px)**: Causes 0.06s Hit-Stop, deflects bullet at 3x speed, triggers shockwave, adds combo and fever gauge.
   - **Normal Parry (≤105px)**: Destroys bullet, builds combo.
   - **Breach (>105px / Miss)**: Depletes 1 Shield (out of 3).
4. **Fever Overdrive**:
   - Reaching a 10x combo activates Fever mode for 6 seconds, granting 360-degree all-around parry and double score.
5. **Session Resolution**: Survival as long as possible; score and rank (S/A/B/C) recorded.

## 3. Controls
* **Touch/Mobile**: Swipe or Tap anywhere towards incoming hazards.
* **Mouse/Desktop**: Click/Drag in the target hazard direction.
* **Keyboard**: WASD, Arrow keys, or Spacebar.

## 4. Difficulty Curve
* **0-15s (Intro)**: Single-angle basic pulse orbs at 150-180 px/s.
* **15-35s (Escalation)**: Fast drones at 200+ px/s, alternating angles.
* **35s+ (Chaos State)**: Multi-directional simultaneous spawns, rapid projectile barrages.
