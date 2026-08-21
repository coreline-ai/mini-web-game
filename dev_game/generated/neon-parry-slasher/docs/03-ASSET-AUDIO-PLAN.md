# 03 - Asset & Audio Plan
# Project: Neon Parry: Blade Slasher (`neon-parry-slasher`)

## 1. Visual Assets Breakdown

| Asset Key | File Path | Resolution | Blend Mode / Alpha | Purpose |
|---|---|---|---|---|
| `bg-cyber-grid` | `assets/images/cyber_grid_bg.jpg` | 1024x1820 | Normal (0.6 Alpha) | Main gameplay & home backdrop |
| `player-ronin` | `assets/images/player_ronin.jpg` | 1024x1024 | Processed Alpha | Central Cyber Ronin character |
| `projectile-drone` | `assets/images/combat_drone.jpg` | 1024x1024 | Screen / Alpha | High-threat attack drone |
| `slash-arc` | `assets/images/neon_slash_vfx.jpg` | 1024x1024 | ADD | Blade swing VFX arc |
| `projectile-pulse` | Canvas Procedural | 32x32 | Normal | Basic laser orb |
| `projectile-parried` | Canvas Procedural | 32x32 | Normal | Deflected energy bullet |
| `shockwave-ring` | Canvas Procedural | 128x128 | ADD | Just Parry shockwave |
| `shield-icon` | Canvas Procedural | 32x32 | Normal | Health HUD indicator |

## 2. Audio Design & SFX
* **Slash**: 800Hz $\rightarrow$ 150Hz Sawtooth downsweep (120ms).
* **Parry (Metallic Clang)**: Dual triangle & sine harmonic ring at 1400Hz + 2100Hz with exponential decay.
* **Hit**: Heavy sub-bass crunch (120Hz $\rightarrow$ 40Hz) with 250ms decay.
* **Fever Overdrive**: 4-note ascending chord arpeggio (C5, E5, G5, C6).
* **BGM**: 8-step bassline sequence at 110-164Hz + syncopated hi-hat pulse.
