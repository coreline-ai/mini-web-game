# Iron Courier: Last Line — Polish Session 02 Evidence

- Date: 2026-07-12
- Target: `dev_game/generated/iron-courier-last-line`
- Intake: `뒤로 안가!`, `상단 상태 이미지 양쪽 해상도에 안 맞게 보여!`, full runtime sweep
- Classification: I Input Robustness, J Resize Continuity, L Asset Fidelity, F Evidence Isolation
- Result: PASS, open severity 1/2 defects 0

## Fix summary

- Global joystick pointer capture/reset and pause interactive blocking
- Phaser EXPAND wide-screen canvas with camera-sized background layers
- Camera-width HUD/control layout and resize handling
- Uniform-scale NineSlice HUD panels
- 844x390 pause safe-margin correction
- Isolated projectile stability soak from legitimate enemy AI fire

## Evidence

- Before/after screenshots and samples: `qa-captures/polish-02/`
- Runtime art: `assets/qa/asset-coverage/after-phase7/runtime-art-qa.json` — PASS, 20 captures, errors 0
- Background: `assets/qa/background-continuity/background-continuity.json` — PASS, 42 samples
- DPR3: `assets/qa/dpr/dpr3-asset-qa.json` — PASS, minimum source ratio 1.05
- Stability: `assets/qa/stability/runtime-stability-qa.json` — PASS, 600s, 10 restarts, settled projectile 0, listeners 15→15, timers 0→0, max BGM 1
- Production gate: compatibility profile PASS at 844x390, 932x430, 1280x720

## Movement and HUD assertions

| Viewport | Keyboard forward/back | Touch back | Canvas | HUD anisotropy |
|---|---:|---:|---:|---:|
| 844x390 | +194.8 / -185.2 | -281.7 | 844x390 | 1.00 |
| 932x430 | +194.8 / -180.5 | -273.7 | 932x430 | 1.00 |
| 1280x720 | +194.8 / -190.0 | -261.3 | 1280x720 | 1.00 |
