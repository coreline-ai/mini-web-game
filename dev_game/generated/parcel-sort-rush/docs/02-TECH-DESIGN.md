# Parcel Sort Rush — Technical Design

## 씬 구조

- `BootScene`: 저장소/설정 초기화
- `LoadingScene`: 게임 전용 PNG/OGG production assets preload + progress
- `HomeScene`: 택배센터 타이틀, Play/Sound, layout registry 발행
- `GameScene`: 택배 분류 루프, gameplay music, HUD, pause
- `PauseScene`: Resume/Home, 음악 일시정지 유지
- `GameOverScene`: 점수/최고점/정분류/미스/재시작, 음악 중지

## 주요 엔티티

| 파일 | 역할 |
|---|---|
| `src/game/entities/Parcel.js` | 드래그 가능한 택배 컨테이너, 전용 PNG sprite + 라벨/색/아이콘 오버레이 |

## 주요 시스템

| 파일 | 역할 |
|---|---|
| `src/game/config/sortingConfig.js` | 분류 슈트, 택배 종류, 점수/난이도 설정 |
| `src/game/systems/ConveyorSystem.js` | 1080x1920 배경, 컨베이어 타일스크롤, 스캐너, 4개 슈트, 러시 배경 전환 |
| `src/game/systems/SortingSystem.js` | 스폰, 속도, 판정, 정분류/오분류/미분류 이벤트 |
| `src/game/systems/ScoreManager.js` | 점수, 콤보, 라이프, 통계 |
| `src/game/systems/LayoutBounds.js` | `window.__GAME_LAYOUT_BOUNDS__` 발행으로 HUD/버튼/슈트 겹침 QA 지원 |
| `src/game/systems/AudioManager.js` | GameScene 음악만 재생, Pause/Home/GameOver에서 pause/stop 제어 |

## 입력 처리

- pointerdown: 가장 위에 있는 택배 hit-test
- pointermove: 선택 택배를 pointer 위치로 이동
- pointerup: 슈트 hit-test 후 정분류/오분류 판정

## 판정

- 슈트 영역에 release + type 일치: 정분류
- 슈트 영역에 release + type 불일치: 오분류
- `missY` 아래로 지나감: 미분류 실패

## Asset isolation

런타임은 `src/game/constants/gameKeys.js`의 `IMAGE_PATHS`/`AUDIO_PATHS`만 preload한다. 모든 경로는 `assets/images/production/**` 또는 `assets/audio/production/**` 하위이며, 루트 프로젝트나 다른 생성 게임의 공통 에셋을 참조하지 않는다.

## QA 기준

- PLAY 후 GameScene 진입
- 첫 택배가 생성됨
- 택배를 올바른 슈트로 드래그하면 score 증가
- 틀린 슈트 또는 miss는 lives 감소
- 러시 상태에서 스폰/속도 증가와 경고음 발생
- Pause 시 음악 정지, Resume 시 복귀, Home/GameOver 시 stop
- visual-layout QA에서 canvas center, safe area, HUD/버튼/슈트 overlap 0건
