# 07-REGRESSION-CHECKLIST — Keeper of the Last Light

다음 `game-polish` 세션은 **이 목록을 먼저 재현**한다. 하나라도 재발하면 그것이 최우선 결함이다.

## R1. 배가 화면에 보이는가 (Class C)
- 조건: Game 진입 → `__KEEPER_DEBUG__.forceShip('port-turn')`
- 확인: 코드 패널이 주문을 표시할 때 **화면에 배 스프라이트가 실제로 보인다**
- assert: `debug().routing.ships[0].visible === true` && 스프라이트 x가 캔버스 안
- 최초 발견: 디버그 훅이 이동 트윈을 죽여 배가 화면 밖(-480px)에 정지

## R2. 홈 재진입 시 BGM (Class H)
- 조건: 홈 → PLAY → 일시정지 → HOME, 3회 반복
- assert: `browserErrors === 0`, `audio.instances <= 1`
- 최초 발견: `this.sound` 버튼이 Phaser 사운드 매니저를 가려 `sound.add is not a function`

## R3. 레이아웃 공표 (Class F)
- 조건: 페이지 로드 → Home 도달
- assert: `window.__GAME_LAYOUT_BOUNDS__.scene === 'Home'` (10초 내)
- 최초 발견: `publishLayout`이 worldView 미준비 시 조용히 반환 → 영원히 미공표

## R4. 캔버스가 뷰포트를 넘지 않는가 (Class L)
- 조건: 1080×1920 dpr 1
- assert: 캔버스가 뷰포트 안에 있고 가로/세로 중앙 정렬, `backingScale >= min(dpr, 3)`
- 최초 발견: `height:100%` 사슬 + grid 센터링이 캔버스를 2337px로 계산

## R5. 입력 견고성 (Class I)
- 조건: PLAY 5연타 / 램프 멀티포인터 / 일시정지↔재개 6연타 / 일시정지 중 램프 누르기
- assert: 활성 씬 1개 유지, 멀티포인터가 펄스를 2개 넣지 않음, 오버레이 중 버퍼 불변

## R6. 장시간 누수 (Class K)
- 조건: 5회 재시도 × 6회 판정
- assert: `poolSize` 일정, `activeTweens` 첫 회차의 2배 이내, `bgm <= 1`

## R7. 아트 영수증 (파이프라인)
- 조건: `factory:production-demo-qa -- --require-gpt-imagegen`
- assert: 16자산 전부 `outputSha256`가 디스크 파일 해시와 일치, `qualityTier: production-demo`
- 주의: 자산을 손으로 바꾸면 이 게이트가 즉시 잡는다(그것이 설계 의도)

## R8. 난이도 축 (Class D)
- 조건: 코드 리뷰 — `StageDirector`가 참조하는 값
- assert: `elapsedMs`와 스테이지 인덱스만 참조. 인내심·점수·콤보를 읽으면 위반

## R9. 항로 점유 — 배가 겹치지 않는가 (Class C, 자동 게이트 없음)
- 조건: Game 진입 → `__KEEPER_DEBUG__.forceShip()` 4회
- assert: 반환값 `[true,true,true,false]`, 살아있는 배의 `laneIndex` 중복 0
- 최초 발견: 항로를 등장 순번의 나머지로 배정해 앞 배가 있는 자리에 다음 배가 겹쳐 들어옴

## R10. 배가 수평선 아래에 있는가 (Class C, 자동 게이트 없음)
- 조건: 스테이지 3에서 3척 등장 상태 캡처
- assert: 모든 배의 y가 배경 지평선(≈0.49H)보다 아래
- 최초 발견: 항로 4개 중 위 2개가 수평선 위 → 배가 하늘에 떠 보임

## R11. UI 텍스트가 배경판 안에 있는가 (Class C, 자동 게이트 없음)
- 조건: 코드 패널 캡처를 육안 확인
- assert: 라벨·코드·버퍼 3행이 모두 **보이는 판** 위에 있다 (레지스트리 bounds가 아니라 알파>64 bbox 기준)
- 최초 발견: 패널 이미지 여백 29%로 라벨이 판 밖에 표시. 레이아웃 게이트는 통과했다

## R12. 오디오 품질 하한 (신규 시그니처, 자동 게이트 없음)
- 조건: `assets/audio/*.wav` 헤더·파형 실측
- assert: 샘플레이트 ≥ 44100, SFX 피크 ≥ 0.75, 시작/끝 진폭 < 0.01, BGM 루프 이음매 불연속 < 0.005
- 최초 발견: 16kHz·피크 0.16·wreck 시작 팝 0.150

## R13. 패널 텍스트가 안쪽 필드 안에 있는가 (Class C, 자동 게이트 없음)
- 조건: Game 진입 → 배 대기 → `typePrefix(2)`
- assert: 라벨·코드·버퍼의 bounds가 모두 안쪽 필드(패널 sprite의 세로 14.8~85.2% / 가로 7.1~92.8%) 안
- 주의: 레이아웃 레지스트리는 **sprite 경계**를 보고하므로 통과해도 안심할 수 없다. 필드 기준으로 재야 한다
- 최초 발견: 3행 구조가 필드 높이 165를 초과(라벨 위 19, 버퍼 아래 38 침범)

## R14. 캡처가 실제로 도달 가능한 상태인가 (Class F)
- 조건: `game-stage-1` / `game-typing` 캡처
- assert: 화면의 배 수 ≤ 해당 스테이지 `maxConcurrent`, "입력 중" 상태의 버퍼가 비어 있지 않음
- 최초 발견: 강제 등장이 상한을 무시(스테이지1에 2척), 임의 펄스가 오답 처리되어 버퍼가 빈 채로 캡처

## R15. UI 프레임이 비율을 깨뜨리지 않는가 (Class L, 자동 게이트 없음)
- 조건: 코드 패널 렌더
- assert: `panel.type === 'NineSlice'`, 표시 테두리 두께가 사방 ±1 CSS 이내
- 금지: 원본과 다른 비율의 `setDisplaySize` (실측 사례: 2.00:1 자산을 4.54:1로 표시 → 테두리 좌우 1.47배)

## R16. 패널 행 정렬이 내용에 따라 재계산되는가 (Class L)
- 조건: 입력 없음 / 2펄스 입력 두 상태
- assert: 입력 없음일 때 코드행 중심 == 필드 중심(±4), 입력 중일 때 두 행이 필드 중심 기준 대칭
- 최초 발견: 고정 오프셋이라 비어 있는 버퍼 줄이 자리를 차지해 내용이 위로 쏠림
