# Automation Scope Proposals — Parallel Agent Findings

> 목적: `dev_game` 자동 생성기를 현재 `Don't Get Pooped!` 수준의 게임 제작에만 맞추고, 목적을 벗어난 기능을 명확히 제외한다.

## 1. 자동 생성기 필수 CLI

| 옵션 | 필요성 |
|---|---|
| `--name` / `--title` | 프로젝트 ID와 화면 제목 생성 |
| `--out` | 생성 위치 지정, 기본 `dev_game/generated/<game-id>` |
| `--template arcade-vertical` | 범위를 모바일 세로형 아케이드 하나로 제한 |
| `--spec game-spec.json` | 게임 규칙/테마/난이도 입력 |
| `--controls drag|tap-lane|swipe` | 한 손 조작 방식 선택 |
| `--width` / `--height` | 기준 해상도 지정 |
| `--with-sfx` / `--no-sfx` | 기본 사운드 플레이스홀더 생성 여부 |
| `--with-pwa` | 선택적 webmanifest 생성 |
| `--dry-run` | 생성 전 파일 목록 확인 |
| `--validate-only` | spec만 검증 |
| `--force` | 기존 output 삭제 후 생성 |

## 2. 생성해야 하는 최소 게임 구조

```text
.dev-game-generated.json
src/main.js
src/styles/mobile.css
src/game/config.js
src/game/data/game-spec.json
src/game/data/spec.js
src/game/scenes/BootScene.js
src/game/scenes/LoadingScene.js
src/game/scenes/HomeScene.js
src/game/scenes/GameScene.js
src/game/scenes/PauseScene.js
src/game/scenes/GameOverScene.js
src/game/systems/SaveData.js
src/game/systems/AudioManager.js
src/game/systems/ScoreManager.js
src/game/systems/Spawner.js
src/game/systems/SafeArea.js
src/game/ui/LoadingUI.js
src/game/ui/HudUI.js
src/game/ui/MobileButton.js
assets/images/*.svg
assets/audio/*.wav
assets/asset-manifest.json
```

## 3. game-spec 최소 스키마

| 섹션 | 필드 |
|---|---|
| `game` | id, title, description, orientation=`portrait`, target=`mobile-web` |
| `canvas` | width, height, backgroundColor, scaleMode |
| `player` | moveMode, speed, hitbox |
| `hazards` | type, label, spawnRateStart/Max, fallSpeedStart/Max, damage, poolSize |
| `collectibles` | enabled, label, spawnRate, scoreValue |
| `scoring` | survivalPointsPerSecond, collectiblePoints, highScoreLocalStorageKey |
| `difficulty` | curve, rampEverySeconds, maxLevel |
| `lives` | start, max |
| `theme` | preset, colors |
| `audio` | enabled, sfx, music |
| `ui` | score/lives/pause/restart 표시 여부 |
| `performance` | targetFps, objectPooling, pauseWhenHidden |

## 4. 이미지/오디오 QA 자동화 최소 범위

### 이미지 QA

| 체크 | 기준 |
|---|---|
| 파일 존재 | manifest의 required image 100% 존재 |
| 포맷 | starter는 SVG 허용, 실제 릴리즈는 PNG/WebP 권장 |
| 해상도/터치 | UI 최소 44px, sprite 최소 64px 기준 |
| 투명도 | sprite 계열은 alpha/투명 배경 필요 |
| 빈 이미지 | 완전 투명/단색/깨진 이미지 REJECT |
| 용량 | sprite 512KB 이하 권장 |
| contact sheet | 사람이 최종 확인할 미리보기 생성 권장 |

### 오디오 QA

| 체크 | 기준 |
|---|---|
| 파일 존재 | manifest의 required audio 100% 존재 |
| 포맷 | starter WAV 허용, 릴리즈 OGG/MP3 권장 |
| 길이 | UI/SFX 0.05~3s, BGM 15~120s 권장 |
| 무음 | 완전 무음 REJECT |
| 클리핑 | peak 과도하면 FIX/REJECT |
| 상태 제어 | home/pause/background에서 BGM pause/stop |

## 5. 완료 검증

| 대상 | 검증 |
|---|---|
| generator | `npm run validate`, `npm run dry-run`, `npm run smoke` |
| generated game | `npm install`, `npm run dev`, `npm run build` |
| gameplay | Home → Game → Pause → Resume → GameOver → Retry |
| mobile | 360×740, 390×844, 430×932에서 UI 깨짐 없음 |
| state | best score localStorage 저장/복원 |
| audio | 첫 터치 unlock, 게임 중 BGM, pause/home에서 정지 |

## 6. 명확히 제외할 것

- 백엔드 API 서버
- 로그인/계정/클라우드 저장
- 서버 랭킹
- 광고 SDK, IAP, 결제
- AI 이미지 생성 API 직접 호출
- 멀티플레이
- Capacitor/Cordova/Tauri 자동 패키징
- 레벨 에디터
- 3D/WebGPU
- 분석/트래킹 SDK
- 푸시 알림
- 스토어 출시 자동화

## 7. 결론

현재 단계의 목표는 **`game-spec.json` 하나로 모바일 세로형 Phaser/Vite 회피 아케이드 starter를 생성하고, 로컬에서 검증 가능한 상태로 만드는 것**이다. 이 범위를 넘는 기능은 이후 개별 게임이 실제 유저 테스트를 통과한 뒤 별도 단계에서 판단한다.

## 8. 삭제 안전 규칙

`--force`는 기본 생성 루트 하위, 빈 디렉터리, 또는 `.dev-game-generated.json` 마커가 있는 dev_game 생성물만 덮어쓴다. 임의의 기존 프로젝트 디렉터리는 삭제하지 않는다.
