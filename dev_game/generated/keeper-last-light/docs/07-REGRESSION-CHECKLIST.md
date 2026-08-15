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
