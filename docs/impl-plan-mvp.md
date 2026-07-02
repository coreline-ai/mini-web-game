# Implementation Plan: Don't Get Pooped! — MVP

> 좌우 이동으로 떨어지는 똥을 피하며 생존하는 세로형 아케이드 게임의 **최소 실행 가능 버전(MVP)**을 최단 시간에 완성한다.
> Generated: 2026-07-02
> Project: game-dd (💩 Don't Get Pooped!)

---

## 1. Context (배경)

### 1.1 Why (왜 필요한가)
`cocept.txt` 기획서는 10 스테이지 + 아이템 + 보스 + 상점까지 방대한 콘텐츠를 담고 있다.
전체를 한 번에 만들면 "재미가 있는지" 검증이 늦어진다. 따라서 **핵심 재미 루프**(좌우로 피하기 → 생존 점수 → 게임오버 → 재시작)만 먼저 실행 가능한 형태로 만들어, 조작감·난이도 곡선을 즉시 검증한다.

### 1.2 Current State (현재 상태)
- 코드 없음. 기획서(`cocept.txt`)와 SVG 에셋 규약(`assets/README.md`) 및 에셋 인덱스(`assets/manifest.json`)가 존재.
- 현재 SVG 에셋은 총 77개이며, MVP에서는 기본 플레이어(`player_boy.svg`)와 기본 똥(`poop_basic_01.svg`)을 즉시 사용한다.
- `assets/backgrounds/bg_*.svg`는 게임 기준 해상도와 같은 `1080×1920` 풀스크린 배경이며, 원본 카드형 `320×480` 배경은 `assets/backgrounds/cards/`에 보존한다.
- 빌드 시스템·엔진·폴더 구조 없음.

### 1.3 Target State (목표 상태)
브라우저에서 `npm run dev`로 즉시 실행되며 다음이 동작한다:
- 세로 화면(1080×1920 기준, 화면에 맞춰 스케일)에서 캐릭터를 좌우 드래그로 이동
- 위에서 똥이 계속 떨어지고, 시간이 지날수록 낙하 속도·생성 빈도 증가
- 똥에 맞으면 게임오버, 생존 시간·회피 수 기반 점수 표시, 최고 점수 저장
- Game Over 화면에서 탭하면 즉시 재시작

### 1.4 Scope Boundary (범위)
- **In scope**: 좌우 이동, 기본 똥 낙하, 오브젝트 풀링, 충돌/게임오버, 점수(생존+회피), 최고점 저장(localStorage), 시간 기반 난이도 상승, Start/Play/GameOver 씬 흐름, 기본 SVG 스프라이트 로드 및 placeholder 폴백.
- **Out of scope (MVP 이후)**: 아이템, 코인/상점, 콤보, 황금/독/새/회전/가짜 똥, 보스, 스킨, 사운드, 파티클, 진동, 광고/이어하기, 랭킹, 스테이지별 배경.

---

## 2. Architecture Overview (아키텍처)

### 2.1 Design Diagram
```
index.html
  └─ src/main.js  ── Phaser.Game 생성 (scale: FIT, 1080x1920)
        ├─ scenes/BootScene.js     에셋 로드 → StartScene
        ├─ scenes/StartScene.js    타이틀 + "탭하여 시작"
        ├─ scenes/GameScene.js     ◀── 핵심 게임 루프
        │     ├─ entities/Player.js       하단 15% 영역, 포인터 추적
        │     ├─ systems/PoopSpawner.js   오브젝트 풀 + 스폰 타이머
        │     ├─ systems/Difficulty.js    시간 기반 속도/빈도 증가
        │     └─ systems/ScoreManager.js  생존·회피 점수, best 저장
        └─ scenes/GameOverScene.js  점수/최고점 표시 + 재시작
```
데이터 흐름: 포인터 입력 → Player.x 갱신 / 시간 경과 → Difficulty가 스폰 간격·속도 조정 → PoopSpawner가 풀에서 똥 재사용 → GameScene.update가 화면 밖/충돌 판정 → 충돌 시 GameOverScene로 전환.

### 2.2 Key Design Decisions
| 결정 사항 | 선택 | 근거 |
|-----------|------|------|
| 엔진 | **Phaser 3** | 2D 아케이드에 최적, 웹 즉시 실행, 물리/입력/씬 내장 |
| 빌드 도구 | **Vite** | 제로 설정에 가까운 핫리로드, 최속 개발 루프 |
| 언어 | **JavaScript (ESM)** | MVP 속도 우선. 타입 오버헤드 제거 (구조화는 폴더/모듈로) |
| 스케일 모드 | `Scale.FIT` + `CENTER_BOTH` | 1080×1920 논리 해상도를 다양한 화면에 레터박스 대응 |
| 렌더링 초기 에셋 | **현재 SVG 우선 + placeholder 폴백** | 이미 77개 SVG가 있으므로 실제 감성 검증 우선. 로드 실패 시 도형 fallback |
| 낙하물 관리 | **오브젝트 풀** (Phaser Group `maxSize` + `killAndHide`) | 기획서 성능 요구(풀링) 반영, GC 스파이크 방지 |
| 충돌 판정 | Arcade Physics `overlap` + 히트박스 축소(70%) | Near-miss 여지 확보, "맞았는데 억울함" 최소화 |
| 데이터 | `src/config/gameConfig.js` 상수 모듈 | 난이도/속도/점수/에셋 키를 한곳 집중 (기획서 JSON 관리 방향의 경량판) |

### 2.2.1 Runtime State Diagram
```
BOOT -> START -> PLAYING -> GAME_OVER
                 |   ^        |
                 |   |        v
                 +---+---- RESTART
```
`GameScene`은 종료/재시작 시 타이머, 입력 리스너, 물리 바디를 정리해 중복 스폰·중복 충돌을 방지한다.

### 2.3 New Files (신규 파일)
| 파일 경로 | 용도 |
|-----------|------|
| `package.json` | 의존성(phaser, vite) + 스크립트 |
| `vite.config.js` | Vite 설정 (base, server) |
| `index.html` | 캔버스 마운트 진입점 |
| `src/main.js` | Phaser.Game 인스턴스 + 씬 등록 |
| `src/config/gameConfig.js` | 해상도·난이도·점수·에셋 키 등 튜닝 상수 |
| `src/scenes/BootScene.js` | 에셋 프리로드 |
| `src/scenes/StartScene.js` | 타이틀/시작 화면 |
| `src/scenes/GameScene.js` | 핵심 게임 루프 |
| `src/scenes/GameOverScene.js` | 결과/재시작 화면 |
| `src/entities/Player.js` | 플레이어 스프라이트 + 이동 |
| `src/systems/PoopSpawner.js` | 똥 오브젝트 풀 + 스폰 |
| `src/systems/Difficulty.js` | 시간 기반 난이도 상승 |
| `src/systems/ScoreManager.js` | 점수 계산 + best 저장 |

### 2.4 Modified Files (수정 파일)
| 파일 경로 | 변경 내용 |
|-----------|-----------|
| (없음) | 신규 프로젝트 — 기존 코드 수정 없음 |

---

## 3. Phase Dependencies (페이즈 의존성)

```
Phase 0 (부트스트랩)
   └─> Phase 1 (플레이어 이동)
          └─> Phase 2 (똥 낙하 + 풀링)
                 └─> Phase 3 (충돌 + 게임오버)
                        └─> Phase 4 (점수 + HUD + best)
                               └─> Phase 5 (씬 흐름 + 난이도 통합)
```
전 페이즈가 이전 페이즈의 실행 결과 위에 증분으로 쌓이므로 **순차 진행**. 각 페이즈 종료 시 `npm run dev`로 브라우저에서 즉시 눈으로 검증 가능하다(작동하는 증분).

---

## 4. Implementation Phases (구현 페이즈)

### Phase 0: 프로젝트 부트스트랩
> Phaser 3 + Vite가 뜨고 빈 세로 캔버스가 화면에 렌더된다.
> Dependencies: 없음

#### Tasks
- [ ] `git init` 실행(현재 non-git 디렉토리) 후 Phase 단위 커밋 준비
- [ ] `package.json` 생성: `dependencies`에 `phaser@^3.90.0`, `devDependencies`에 현재 Vite/Vitest/Playwright 계열, scripts `dev`/`build`/`preview`/`test`/`test:e2e`
- [ ] `npm install` 실행
- [ ] `index.html` 생성: `<div id="game">` + `<script type="module" src="/src/main.js">`, viewport meta(모바일)
- [ ] 전역 CSS 생성 또는 `index.html` 스타일 추가: `touch-action: none`, `overscroll-behavior: none`, `user-select: none`
- [ ] `src/config/gameConfig.js` 생성: `WIDTH=1080`, `HEIGHT=1920`, `PLAYER_ZONE=0.15`, 난이도/점수 상수, `ASSET_KEYS` 뼈대
- [ ] `src/main.js` 생성: `Phaser.Game` (type AUTO, scale FIT+CENTER_BOTH, arcade physics, backgroundColor), 씬 배열에 `BootScene`만 우선 등록
- [ ] `src/scenes/BootScene.js` 생성: 기본 SVG 에셋(`player_boy`, `poop_basic_01`, `hud_panel`, `game_over`) 프리로드 + 로드 실패 시 fallback 텍스처 생성

#### Success Criteria
- `npm run dev` 실행 시 콘솔 에러 0건
- `npm run build`와 `npm test`가 실행 가능(초기 테스트는 최소 smoke/pure util부터 시작)
- 브라우저에 세로 비율(9:16) 캔버스가 화면 중앙에 레터박스로 표시됨
- 캔버스 안에 "LOADING" 텍스트가 보임

#### Test Cases
- [ ] TC-0.1: `npm run dev` → 터미널에 Vite local URL 출력, 브라우저 콘솔 에러 없음
- [ ] TC-0.2: 브라우저 창 크기를 바꿔도 게임 캔버스가 9:16 비율 유지하며 중앙 정렬
- [ ] TC-0.E1: `src/main.js`에서 존재하지 않는 씬 참조 시 → 콘솔에 명확한 Phaser 경고 (등록 전 참조 방지 확인용)
- [ ] TC-0.E2: SVG 로드 실패를 임시로 유도해도 fallback 텍스처로 게임이 blank 상태가 되지 않음

#### Testing Instructions
```bash
cd /Users/hwanchoi/project_202606/game-dd
npm install
npm run dev
# 출력된 http://localhost:5173 을 브라우저에서 열어 확인
```

**테스트 실패 시 워크플로우:**
1. 에러 출력 분석 → 근본 원인 식별
2. 원인 수정 → 재테스트
3. **모든 테스트가 통과할 때까지 다음 Phase 진행 금지**

---

### Phase 1: 플레이어 좌우 이동
> 하단 15% 영역에서 캐릭터가 포인터(마우스/터치) 좌우 드래그를 따라 이동한다.
> Dependencies: Phase 0

#### Tasks
- [ ] `src/scenes/StartScene.js` 생성: 타이틀 텍스트 + "탭하여 시작", 포인터 입력 시 `GameScene` 시작
- [ ] `src/scenes/GameScene.js` 생성: `create()`에서 Player 인스턴스화, `update()` 스텁
- [ ] `src/main.js`: 씬 배열에 `StartScene`, `GameScene` 추가하고 Boot→Start 전환 연결
- [ ] `src/entities/Player.js` 생성: `player_boy` SVG 스프라이트 우선 사용, fallback 스프라이트 지원, y는 화면 하단 15% 라인에 고정
- [ ] `Player.js`에 `updatePosition(pointerX)` 구현: 포인터 x를 따라 이동하되 `Phaser.Math.Clamp`로 좌우 화면 경계 내 제한
- [ ] `GameScene.js`의 입력 바인딩: `pointerdown`/`pointermove` 모두 처리하고, 포인터 없거나 캔버스 밖일 때 마지막 유효 위치 유지
- [ ] 입력 좌표 변환은 DOM 좌표가 아닌 Phaser 게임 좌표계 기준으로 처리

#### Success Criteria
- 시작 화면에서 탭하면 게임 화면으로 전환
- 캐릭터가 화면 하단 15% 영역(y 고정)에 위치
- 드래그/마우스 이동 시 캐릭터 x가 부드럽게 따라오고 좌우 벽을 넘지 않음

#### Test Cases
- [ ] TC-1.1: 시작 화면 탭 → GameScene 전환, 캐릭터 표시
- [ ] TC-1.2: 포인터를 화면 왼쪽 끝으로 → 캐릭터 x가 `player.width/2` 이상 (화면 밖 안 나감)
- [ ] TC-1.3: 포인터를 오른쪽 끝으로 → 캐릭터 x가 `WIDTH - player.width/2` 이하
- [ ] TC-1.4: 캐릭터 y가 항상 `HEIGHT * (1 - PLAYER_ZONE)` 부근 고정
- [ ] TC-1.E1: 포인터가 캔버스 밖으로 나가도 캐릭터가 마지막 유효 위치 유지 (튀지 않음)
- [ ] TC-1.E2: 모바일 에뮬레이션에서 드래그 시 브라우저 스크롤/당겨서 새로고침이 발생하지 않음

#### Testing Instructions
```bash
npm run dev
# 브라우저에서 시작 화면 탭 → 마우스/터치로 좌우 이동 확인
```

**테스트 실패 시 워크플로우:**
1. 에러 출력 분석 → 근본 원인 식별
2. 원인 수정 → 재테스트
3. **모든 테스트가 통과할 때까지 다음 Phase 진행 금지**

---

### Phase 2: 똥 낙하 + 오브젝트 풀링
> 위에서 똥이 랜덤 x 위치에 생성되어 아래로 떨어지고, 화면 밖으로 나가면 풀로 회수된다.
> Dependencies: Phase 1

#### Tasks
- [ ] `src/systems/PoopSpawner.js` 생성: Phaser physics group을 오브젝트 풀로 구성(`maxSize`, `defaultKey`)
- [ ] `PoopSpawner.spawn()` 구현: 풀에서 비활성 똥 하나 꺼내 랜덤 x·화면 위(y<0)에 배치하고 아래 방향 속도 부여
- [ ] `PoopSpawner.update()` 구현: 화면 하단을 벗어난 똥을 `killAndHide` + physics body 비활성화로 풀 반납
- [ ] `GameScene.js`: 스폰 타이머(`this.time.addEvent`, 초기 간격 상수) 등록 → `spawner.spawn()` 호출
- [ ] `GameScene.update()`: `spawner.update()` 호출로 화면 밖 회수 처리
- [ ] 기본 똥 텍스처는 `assets/enemies/poop/poop_basic_01.svg`를 로드해 사용하고, 로드 실패 시 BootScene에서 fallback 갈색 원 텍스처 생성
- [ ] 런타임 표시 크기 규칙 정의: 기본 플레이어 128~160px, 기본 똥 96~128px, 큰 똥은 MVP 이후 160px 이상

#### Success Criteria
- 똥이 위에서 계속 생성되어 일정 속도로 낙하
- 화면 아래로 나간 똥이 파괴되지 않고 재사용됨(동시 표시 개수 상한 = `maxSize` 준수)
- 장시간 실행해도 활성 오브젝트 수가 무한 증가하지 않음

#### Test Cases
- [ ] TC-2.1: 게임 시작 후 스폰 간격마다 새 똥이 화면 상단에서 등장
- [ ] TC-2.2: 똥이 아래로 이동(y 증가)하다 화면 하단(`y > HEIGHT + margin`) 통과 시 비활성화
- [ ] TC-2.3: 60초 실행 후 `spawner.group.getChildren().filter(활성).length <= maxSize` (풀 상한 유지)
- [ ] TC-2.E1: 풀이 가득 찬 상태에서 `spawn()` 호출 → 새 오브젝트 생성 안 하고 조용히 스킵(에러 없음)
- [ ] TC-2.E2: SVG 텍스처 크기가 명시 크기로 로드되어 스케일 계산이 NaN/0이 되지 않음

#### Testing Instructions
```bash
npm run dev
# 브라우저 콘솔에서: window.__scene = game.scene.getScene('GameScene') 노출용 디버그 라인 임시 추가 권장
# 낙하 지속 및 회수 시각 확인
```

**테스트 실패 시 워크플로우:**
1. 에러 출력 분석 → 근본 원인 식별
2. 원인 수정 → 재테스트
3. **모든 테스트가 통과할 때까지 다음 Phase 진행 금지**

---

### Phase 3: 충돌 판정 + 게임오버
> 똥이 플레이어에 닿으면 게임이 멈추고 GameOverScene으로 전환된다.
> Dependencies: Phase 2

#### Tasks
- [ ] `src/scenes/GameOverScene.js` 생성: "GAME OVER" 텍스트 + "탭하여 재시작" (점수는 Phase 4에서 연결)
- [ ] `main.js`: 씬 배열에 `GameOverScene` 추가
- [ ] `Player.js`: physics body 히트박스를 스프라이트의 70%로 축소(`body.setSize`/`setCircle`)
- [ ] `GameScene.create()`: `this.physics.add.overlap(player, spawner.group, this.onHit, null, this)` 등록
- [ ] `GameScene.onHit()` 구현: 중복 방지 플래그 설정 → 스폰 타이머/스폰 accumulator 정지 → `GameOverScene`로 데이터와 함께 전환
- [ ] `GameScene` shutdown/cleanup 구현: 입력 리스너 제거, 타이머 중지, 활성 똥 비활성화로 재시작 중복 상태 방지
- [ ] `GameOverScene`: 포인터 입력 시 `GameScene` 재시작(상태 완전 초기화 확인)

#### Success Criteria
- 똥과 플레이어가 겹치면 즉시 게임오버 화면으로 전환
- 스치기만 하고 히트박스 밖이면 게임 계속(70% 축소 판정 동작)
- GameOver에서 탭하면 점수·오브젝트가 초기화된 새 게임 시작

#### Test Cases
- [ ] TC-3.1: 캐릭터를 낙하하는 똥 아래로 이동 → 접촉 시 GameOverScene 전환
- [ ] TC-3.2: 똥이 캐릭터 가장자리를 스침(히트박스 밖) → 게임 계속
- [ ] TC-3.3: GameOver 탭 → 새 GameScene에서 활성 똥 0개부터 다시 시작
- [ ] TC-3.E1: 한 프레임에 여러 똥이 동시 접촉 → `onHit`이 1회만 실행(중복 전환 없음)
- [ ] TC-3.E2: GameOver→Restart 3회 반복 후 스폰 타이머/입력 리스너가 중복되지 않음

#### Testing Instructions
```bash
npm run dev
# 일부러 똥에 맞아 게임오버 → 탭 재시작 반복 검증
```

**테스트 실패 시 워크플로우:**
1. 에러 출력 분석 → 근본 원인 식별
2. 원인 수정 → 재테스트
3. **모든 테스트가 통과할 때까지 다음 Phase 진행 금지**

---

### Phase 4: 점수 시스템 + HUD + 최고점 저장
> 생존 시간과 회피 개수로 점수를 매기고 화면 상단에 실시간 표시, 최고점은 localStorage에 저장한다.
> Dependencies: Phase 3

#### Tasks
- [ ] `src/systems/ScoreManager.js` 생성: `survivalMs`, `dodgeCount` 누적 + `getScore()`(생존 10점/초 + 회피 2점/개, `gameConfig` 상수 사용)
- [ ] `ScoreManager`: `loadBest()`/`saveBest()` — `localStorage['dgp_best']` 읽기/쓰기, 접근 실패 시 in-memory fallback
- [ ] `GameScene`: HUD 텍스트(Score / Best) 생성, `update(time,delta)`에서 `survivalMs += delta`, Score 갱신
- [ ] `PoopSpawner` 회수 지점(화면 밖 통과)에서 콜백으로 `scoreManager.dodgeCount++` (성공 회피 카운트)
- [ ] `GameScene.onHit`: 최종 점수 계산 → `saveBest()` → `GameOverScene`에 `{score, best, isNewBest}` 전달
- [ ] `GameOverScene`: 전달받은 Score / Best 표시, 신기록이면 "NEW BEST!" 강조

#### Success Criteria
- 생존 중 Score가 시간에 비례해 증가하고, 똥을 흘려보낼 때마다 추가 가산
- 게임오버 시 최종 점수와 최고점이 표시되고 신기록 갱신 시 저장됨
- 페이지 새로고침 후에도 Best 유지(localStorage)

#### Test Cases
- [ ] TC-4.1: 10초 생존(회피 0) → Score ≈ 100 (생존 10점/초)
- [ ] TC-4.2: 똥 5개를 안 맞고 흘려보냄 → dodge 점수 +10 반영
- [ ] TC-4.3: 이전 최고점보다 높은 점수로 게임오버 → GameOver에 "NEW BEST", 새로고침 후 Best 유지
- [ ] TC-4.4: 이전 최고점보다 낮은 점수 → Best 값 변경 없음
- [ ] TC-4.E1: `localStorage`에 손상된 값(비숫자) 저장돼 있을 때 → `loadBest()`가 0으로 안전 폴백(크래시 없음)
- [ ] TC-4.E2: `localStorage.getItem/setItem`이 throw해도 게임이 크래시하지 않고 현재 세션 in-memory best로 폴백

#### Testing Instructions
```bash
npm run dev
# 게임 플레이 → 점수 증가 확인 → 게임오버 점수/Best 확인
# 브라우저 새로고침 후 StartScene/GameOver에서 Best 유지 확인
# localStorage 초기화 테스트: 콘솔에서 localStorage.removeItem('dgp_best')
```

**테스트 실패 시 워크플로우:**
1. 에러 출력 분석 → 근본 원인 식별
2. 원인 수정 → 재테스트
3. **모든 테스트가 통과할 때까지 다음 Phase 진행 금지**

---

### Phase 5: 시간 기반 난이도 상승 + 전체 흐름 통합
> 시간이 지날수록 낙하 속도와 스폰 빈도가 올라가 "1분은 쉽고 5분부터 어려운" 곡선을 만든다. 전체 씬 흐름을 매끄럽게 마감한다.
> Dependencies: Phase 4

#### Tasks
- [ ] `src/systems/Difficulty.js` 생성: 경과 시간 → `{ phase, fallSpeed, spawnIntervalMs, maxConcurrent, burstChance }` 반환
- [ ] 난이도 곡선은 단일 선형 증가가 아니라 0~60초 onboarding, 60~180초 arcade ramp, 180~300초 panic ramp, 300초+ endless clamp의 piecewise curve로 구성
- [ ] `GameScene.update()`: `difficulty.getParams(elapsedMs)`로 매 프레임 파라미터 갱신
- [ ] `PoopSpawner`: `setFallSpeed()` / accumulator 기반 스폰 클록으로 현재 `spawnIntervalMs` 반영(타이머 반복 생성 지양)
- [ ] `gameConfig.js`: 난이도 곡선 상수 튜닝(초기 쉬움 ~60초, 이후 급상승) 값 채우기
- [ ] StartScene에 Best 표시 추가, GameOverScene 재시작 흐름 최종 점검
- [ ] 전체 플레이 밸런스 1차 튜닝: 초반 여유 / 후반 압박 체감 확인 후 상수 조정

#### Success Criteria
- 시작 직후 낙하가 완만하고, 시간이 갈수록 눈에 띄게 빨라지고 촘촘해짐
- 속도·간격이 상한값에서 clamp되어 비정상적으로 폭주하지 않음
- Start → Play → GameOver → Restart 전 흐름이 끊김·에러 없이 반복 가능

#### Test Cases
- [ ] TC-5.1: 게임 시작 0~30초 낙하 속도 < 120초 시점 낙하 속도 (증가 확인)
- [ ] TC-5.2: 스폰 간격이 시간 경과에 따라 짧아짐(초기 대비 후기 delay 감소)
- [ ] TC-5.3: 장시간(≥5분) 실행 시 속도/간격이 `MAX_*` 상수를 넘지 않음
- [ ] TC-5.4: Start→Play→GameOver→Restart 3회 반복 시 매번 난이도가 처음부터 리셋
- [ ] TC-5.E1: `elapsedMs=0`에서 `getParams` 호출 → base 값 반환(0 나눗셈/NaN 없음)
- [ ] TC-5.E2: 60초/180초/300초 경계값에서 phase 전환과 clamp가 예상값으로 동작

#### Testing Instructions
```bash
npm run dev
# 5분간 연속 플레이하며 난이도 상승 체감 및 상한 동작 확인
```

**테스트 실패 시 워크플로우:**
1. 에러 출력 분석 → 근본 원인 식별
2. 원인 수정 → 재테스트
3. **모든 테스트가 통과할 때까지 완료 처리 금지**

---

## 5. Integration & Verification (통합 검증)

### 5.0 Automated Gate (자동 검증)
- [ ] `npm run build` 통과
- [ ] `npm test` 통과: `Difficulty`, `ScoreManager`, 플레이어 clamp, localStorage fallback
- [ ] `npm run test:e2e` 통과: 앱 로드, Start→Game, GameOver→Restart smoke
- [ ] 5분 soak 중 dev HUD의 activePoops가 `maxSize`를 넘지 않음

### 5.1 Integration Test Plan (통합 테스트)
- [ ] E2E-1: 앱 로드 → Start 탭 → 좌우 이동으로 30초 생존 → 점수 증가 확인 → 의도적 피격 → GameOver 점수/Best 표시 → 탭 재시작 → 정상 새 게임
- [ ] E2E-2: 신기록 달성 → 새로고침 → Best 유지 확인
- [ ] E2E-3: 5분 연속 플레이 → 난이도 상승·상한 clamp·메모리(오브젝트 수) 안정 확인

### 5.2 Manual Verification Steps (수동 검증)
1. 데스크톱 브라우저에서 마우스 드래그로 조작감 확인
2. 브라우저 개발자도구 모바일 에뮬레이션(세로)에서 터치 드래그 확인
3. Performance 탭으로 60 FPS 유지 및 오브젝트 수 폭증 없음 확인

### 5.3 Rollback Strategy (롤백 전략)
- 신규 프로젝트이므로 데이터 롤백 불필요
- 페이즈 단위로 커밋 → 문제 시 직전 페이즈 커밋으로 `git revert`/`reset`
- `git init`은 Phase 0 착수 시 수행 권장(현재 non-git 디렉토리)

---

## 6. Edge Cases & Risks (엣지 케이스 및 위험)

| 위험 요소 | 영향도 | 완화 방안 |
|-----------|--------|-----------|
| 오브젝트 풀 미회수로 메모리 누수 | 높음 | Phase 2 TC-2.3 장시간 테스트로 활성 수 상한 검증 |
| 여러 똥 동시 접촉 시 중복 게임오버 | 중간 | `onHit` 1회 실행 가드 플래그 (TC-3.E1) |
| 화면 비율 다양성으로 조작 영역 어긋남 | 중간 | 논리 해상도 + FIT 스케일, 좌표는 항상 게임 좌표계 기준 |
| localStorage 접근 불가/손상 값 | 낮음 | try/catch + 숫자 파싱 실패 시 0 폴백 (TC-4.E1) |
| 난이도 곡선이 너무 쉽거나 급함 | 중간 | 모든 튜닝 값을 `gameConfig.js`에 집중해 즉시 조정 |
| SVG 경로 누락/로드 실패로 빈 스프라이트 발생 | 중간 | BootScene load error logging + fallback 텍스처 |
| 재시작 시 타이머/입력 리스너 중복 | 높음 | GameScene cleanup + Restart 반복 E2E |

---

## 7. Execution Rules (실행 규칙)

1. **독립 모듈**: 각 Phase는 독립적으로 구현하고 브라우저에서 즉시 검증한다
2. **완료 조건**: 모든 태스크 체크박스 체크 + 모든 테스트 통과
3. **테스트 실패 워크플로우**: 에러 분석 → 근본 원인 수정 → 재테스트 → 통과 후에만 다음 Phase 진행
4. **Phase 완료 기록**: 체크박스를 체크하여 이 문서에 진행 상황 기록
5. **순차 실행**: 페이즈는 이전 페이즈 위에 쌓이므로 순서대로 진행
6. **튜닝 값 집중**: 모든 난이도·점수·속도 상수는 `src/config/gameConfig.js`에만 둔다
7. **자동 검증 필수**: 완료 처리는 `npm run build`, `npm test`, `npm run test:e2e` 통과 후에만 한다
8. **MVP 이후 확장**: 아이템/보스/스킨 등은 본 MVP 완료·검증 후 별도 계획서로 진행
