# 기술 설계

## 빌드 결정

`custom-loop`. Phaser/Vite 장면 셸만 사용하고 전투 엔티티와 시스템은 게임 전용으로 구현한다.

## 장면

| 장면 | 책임 |
|---|---|
| Boot | 저장 데이터·설정 초기화 |
| Loading | 모든 전용 이미지·오디오 로드 |
| Home | 시나리오, 최고 기록, 시작, 무기고 진입 |
| Arsenal | 영구 자원과 무기별 레벨 강화 |
| Game | 무한 생존 전투, 시간대, 무기, 웨이브 |
| Pause | 안전한 중단과 복귀 |
| GameOver | 전투 통계, 자원 지급, 재도전 |

## 핵심 엔티티

- `Player`: 하단 전투 구역 이동, HP, 회피 스텝, 조준 방향, 무기별 상체 반동.
- `Zombie`: 역할별 상태 머신, 분리 조향, 피격 경직, 공격, 사망.
- `BulletPool`: 일반탄·펠릿·로켓·감염탄 풀.
- `BossEntity`: 타이탄 상태 머신과 약점 단계.
- `Pickup`: 감염 결정과 응급팩.

## 핵심 시스템

- `HybridAimController`: 무입력 자동 조준, 드래그 중 수동 벡터 이동·조준.
- `WeaponSystem`: 기관포 자동사격·열 관리와 특수무기별 독립 즉시 발동, 시간·처치 충전.
- `BulletPool`: 최대 탄체 수 제한, 재사용, 관통과 폭발.
- `EnemyWaveDirector`: 단계별 예산, 군집 크기, 다방향 진입, 엘리트·보스 예약.
- `SwarmMotionSystem`: 목표 추적, 개체 간 분리, 흔들림·지그재그·돌진.
- `DayNightSystem`: 180초 주기 팔레트 보간과 시간대 이벤트.
- `CombatFeedbackSystem`: 총구 화염, 탄피, 검은 체액, 경직, 카메라 충격.
- `PermanentProgression`: 무기 레벨, 자원, 최고 기록 localStorage 저장.
- `NarrativeRadioSystem`: 시간대·엘리트·보스 이벤트에 따른 무전 출력.

## 상태 흐름

`Home → Game → GameOver → Retry 또는 Arsenal → Game`

브라우저 비활성화 시 자동 일시정지하고, Home·Pause·GameOver에서는 전투 음악과 스폰 타이머를 정지한다.

## 성능 예산

- 기준 캔버스 1440×2560, CSS FIT.
- 60fps 목표, 과밀 상태에서는 파티클·그림자·애니메이션 샘플링을 단계적으로 감축한다.
- 활성 좀비 140, 탄환 260, 체액 파티클 180 상한.
- 물리 충돌은 원형/캡슐 근사와 공간 그리드로 후보를 줄인다.
- HeadlessChrome QA에서는 Canvas 렌더러를 사용해 WebGL framebuffer 편차를 차단한다.

## 런타임 진단 계약

- `window.__GAME_LAYOUT_BOUNDS__`: 장면별 필수 UI 경계.
- `window.__GAME_QA_STATE__`: 시간, 적 수, 처치, HP, 무기, 열, 충전, 보스 상태.
- `window.__GAME_DEBUG__`: QA 전용 웨이브·보스·피격·충전 트리거.
