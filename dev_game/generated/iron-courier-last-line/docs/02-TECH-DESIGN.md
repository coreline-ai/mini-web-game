# 02. 기술 설계 — 철갑특송: 라스트 라인

## 기술 목표

Phaser 3 + Vite 기반 단일 페이지 게임으로 구현한다. 1280×720 논리 캔버스를 가로 화면에 비율 유지 스케일하며 모바일 터치와 PC 키보드가 동일 액션 인터페이스를 사용한다. 게임 규칙은 데이터 기반으로 두고, 렌더링 효과와 충돌/피해 판정을 분리한다.

## 런타임 구성

```text
BootScene → LoadingScene → HomeScene → GameScene ⇄ PauseScene
                                      ├─ 실패 → GameScene(checkpoint)
                                      └─ 보스 격파 → ResultScene → Home/Game
```

| 씬 | 책임 | 종료 시 정리 |
|---|---|---|
| Boot | 스케일·저장·전역 플러그인 | 전역 설정만 유지 |
| Loading | manifest 기반 로드, 진행률 | loader listener 제거 |
| Home | PLAY/설정, Home BGM | BGM stop/fade, 입력 제거 |
| Game | 월드·전투·HUD·진행 | 타이머/트윈/콜라이더/풀 reset |
| Pause | scene pause overlay | resume/home 분기, 루프음 pause |
| Result | 점수 계산·저장·재시작 | 결과 이벤트 제거 |

## 모듈 경계

```text
src/config/       순수 데이터와 조회 함수
src/entities/     개별 body, state, animation adapter
src/systems/      여러 entity를 조율하는 게임 규칙
src/scenes/       생성 순서, scene state, HUD wiring
assets/runtime/   빌드에 포함되는 게임 전용 에셋
assets/source/    원본/중간 산출물, 런타임 제외
```

필수 엔티티: `Player`, `BasicSoldier`, `ShieldSoldier`, `Grenadier`, `SentryDrone`, `CraneMiniBoss`, `IronMoleBoss`, `Projectile`, `Grenade`, `RescueTarget`, `ArmoredTransport`, `DestructibleProp`.

필수 시스템: `InputSystem`, `PlayerStateMachine`, `WeaponSystem`, `ProjectilePool`, `DamageSystem`, `EnemyStateMachine`, `EnemySpawnSystem`, `RescueSystem`, `EscortSystem`, `DestructionSystem`, `EncounterSystem`, `BossPhaseSystem`, `CameraFxSystem`, `AudioSystem`, `SaveSystem`.

## 설정 계약

| 파일 | named export | 주요 ID |
|---|---|---|
| `gameConfig.js` | `GAME_CONFIG`, `PLAYER_CONFIG`, `SCORE_CONFIG`, `INPUT_CONFIG` | save key, physics, touch 좌표 |
| `weaponConfig.js` | `WEAPON_CONFIG`, `SPECIAL_WEAPON_IDS`, `getWeaponConfig` | rifle, shotgun, rocket, grenade |
| `enemyConfig.js` | `ENEMY_CONFIG`, `ENEMY_TYPES`, `DIFFICULTY_SCALING` | basicSoldier, shieldSoldier, grenadier, sentryDrone |
| `stageConfig.js` | `STAGE_CONFIG`, `getSegmentAtX` | 8 segments, rescue, escort, encounter |
| `bossConfig.js` | `BOSS_CONFIG` | craneSentinel, ironMole |

각 파일은 같은 객체를 default export도 한다. 구현 코드가 요구하는 새 수치는 magic number로 넣지 말고 해당 config 계약에 추가한다.

## 핵심 상태 모델

### 플레이어

```text
spawn → idle ↔ run ↔ crouch → jump → fall → land
                  ↘ shoot/throw/melee (overlay action)
any → hurt → idle | dead → checkpointRespawn
```

- 이동 상태와 무기 행동은 서로 독립된 두 레이어로 관리한다.
- `crouch`는 grounded && |velocityX|≤10에서만 진입하며 body bottom을 유지한 채 높이를 72px로 낮춘다.
- 피격 중 `invulnerableUntil`을 한 곳에서 검사한다.
- 사망 진입은 멱등적이어야 하며 점수/오디오/트윈을 한 번만 발생시킨다.

### 적

```text
inactive → spawn → acquire → move/hold → telegraph → attack → recover
                                   any → stagger/hurt → dead → pooled
```

- `active && visible && body.enable && hp > 0`인 경우에만 피해·충돌·점수를 처리한다.
- 죽음 점수는 `deathResolved` 플래그로 한 번만 지급한다.
- 화면 밖 320px 이상이면 전투 목적에 따라 sleep 또는 despawn한다.

### 보스

`intro → phaseActive → transition → phaseActive → death → clear`. 페이즈 전환 중에는 피해를 막고 모든 이전 페이즈 경고 마커·탄환·타이머를 정리한다.

## 입력 시스템

`InputSystem.sample()`은 매 프레임 다음 snapshot을 반환한다.

```js
{
  moveX: -1..1,
  moveY: -1..1,
  jumpPressed: boolean,
  jumpHeld: boolean,
  shootHeld: boolean,
  grenadePressed: boolean,
  crouch: boolean,
  pausePressed: boolean,
  source: 'touch' | 'keyboard' | 'gamepad'
}
```

- 터치와 키보드가 동시에 들어오면 가장 최근 non-zero source를 사용한다.
- pointer cancel/blur/visibilitychange에서 held 입력을 모두 해제한다.
- 터치 버튼은 fixed UI camera에 두며 gameplay world와 충돌하지 않는다.
- 사격은 입력 후 다음 update tick 안에 projectile을 활성화한다.

## 전투와 충돌

충돌 범주:

```text
playerBody ↔ world/enemyBody/enemyProjectile/hazard
playerProjectile ↔ enemyBody/bossPart/destructible
enemyProjectile ↔ playerBody/destructible/escortVehicle
explosionArea ↔ player/enemy/boss/destructible/escortVehicle
rescueSensor ↔ playerBody
```

`DamageSystem.apply({ sourceId, target, amount, kind, point, knockback, hitStopMs })`가 유일한 HP 변경 통로다. 시각 효과는 `damage:applied`, `damage:blocked`, `entity:died` 이벤트를 구독한다. 폭발은 거리 감쇠를 계산하고 source/target 팀 규칙을 적용한다.

일반 보병/방패병의 직사 projectile은 `dodgeHint='crouch'`와 수평 velocity를 가진다. muzzle y는 standing body와 교차하지만 crouch body top보다 위여야 한다. 드론은 `jump-or-move`, 수류탄은 `move-out`으로 분리하며 crouch 자체에 피해 무효 플래그를 두지 않는다.

방패병 전면 판정은 적 방향 벡터와 피격점 벡터 내적으로 결정한다. 보스 부위는 별도 hit zone을 갖지만 최종 HP는 Boss controller가 소유한다.

## 투사체·효과 풀

| 풀 | 기본 상한 | 회수 조건 |
|---|---:|---|
| player projectile | 72 | hit/lifetime/world bounds |
| enemy projectile | 56 | hit/lifetime/world bounds/phase transition |
| grenade | 10 | explosion/reset |
| explosion | 24 | animation complete |
| debris/particle | 저사양 배수 0.45 | tween/animation complete |

풀 반환 시 `active=false`, `visible=false`, `body.enable=false`, velocity 0, alpha 1, tint clear, timer/tween stop, owner null을 모두 복원한다.

## 구조 시스템

`RescueTarget`은 `captive → available → rescuing → rescued` 상태다. 구조 완료 이벤트:

```js
{ id, type: 'engineer'|'medic'|'artillery', effect, score }
```

- Engineer: 즉시 저장된 `escortRepairCredit += 140`; 차량이 존재하면 즉시 적용.
- Medic: `Player.heal(35)`.
- Artillery: `SupportFire.start(12000)`.
- 중복 이벤트는 target의 `resolved`로 차단한다.

## 호위 시스템

`EscortSystem`은 진행률, 차량 HP, 근접 위협, wave 완료를 소유한다. 차량은 활성 wave 적이 차량 430px 내에 없을 때만 이동한다. 체크포인트 snapshot에 차량 HP, engineer credit, wave index를 저장한다. 차량 HP 0 이벤트는 한 번만 실패를 발생시킨다.

## 파괴 연쇄

`DestructionSystem`은 파괴물 그래프를 런타임 공간 질의로 만든다. 폭발 시 반경 안 미해결 파괴물에 `setTimeout` 대신 scene clock delayedCall(120~220ms)을 등록한다. 각 call은 scene shutdown 및 checkpoint reset 시 취소한다. `destroyResolved`가 피해·점수 중복을 막는다.

## 스테이지/인카운터

- 월드 폭 16800, 실제 충돌 지면 기준 y=606.
- `STAGE_CONFIG.segments`가 카메라 락, 체크포인트, UI 제목, preload 경계를 제공한다.
- `EncounterSystem`은 플레이어 x가 trigger를 넘었을 때 한 번 spawn하고 encounter ID를 완료 목록에 기록한다.
- 보스 arena 진입 시 카메라 bounds를 arena로 제한하고 일반 스폰과 남은 적탄을 정리한다.
- 교량 강제전진은 카메라 왼쪽에 damage wall을 두되 플레이어 속도 외에 점프/전투 난이도도 독립 검증한다.

### 전술 상단 루트

- `STAGE_CONFIG.traversal.platforms`가 id, routeId, step, surfaceY, width, texture, purpose를 소유한다.
- `TerrainArtSystem`은 해당 데이터를 production `platform-support`/`platform-catwalk` 이미지와 top-only collision으로 만든다.
- 물리 한계: gravity 1850, jump velocity 690, 이론상 상승 128.68px. 입구 rise≤120px, 연속 단차≤96px, 수평 gap≤48px를 QA gate로 둔다.
- container/warehouse/collapse 3개 route는 실제 키 입력으로 ground→step1→step2→step3 착지를 통과해야 한다.
- elevated pickup/rescue는 `platformId`를 통해 platform surface에 anchor한다. 임의 y 복제값을 사용하지 않는다.

## 카메라·레이어

레이어 순서:

```text
far background (-40)
mid background (-30)
terrain (-10)
world props (0)
entities (20)
projectiles (30)
VFX (40)
near foreground (50, 가독성 마스크 적용)
HUD (1000)
touch controls (1100)
pause/result overlay (1200)
```

카메라는 플레이어 진행 방향으로 210px look-ahead한다. 보스/호위 arena에서는 clamp한다. 흔들림은 일반 34~90ms, 강폭발 최대 150ms이며 UI camera에는 적용하지 않는다.

## 오디오 상태

AudioSystem bus: `music`, `sfx`, `ui`, `ambience`. 게임 BGM은 GameScene active일 때만 재생한다. pause/blur에서 모든 gameplay loop와 music을 pause하고 resume 시 유효 scene인지 확인한다. Home 이동, restart, boss transition에서 이전 loop를 명시적으로 stop한다. 동시 총성은 variant/voice limit를 사용한다.

## 저장 계약

```js
{
  schemaVersion: 1,
  bestScore: 0,
  bestClearMs: null,
  clears: 0,
  settings: { music: 0.8, sfx: 0.9, shake: 1, flash: 1, lowFx: false },
  lastResult: { score, clearMs, rescues, hp, escortHp, assistUsed }
}
```

파싱 실패·구버전·storage quota 오류는 기본값으로 복구하고 게임 진행을 막지 않는다.

## 레이아웃 QA 계약

런타임은 `window.__GAME_LAYOUT_BOUNDS__`를 갱신한다.

```js
{
  viewport: { width, height },
  scenes: {
    Game: {
      requiredIds: ['playfield','hud-hp','hud-score','hud-ammo','pause','touch-stick','touch-shoot','touch-jump','touch-grenade'],
      items: [{ id, x, y, width, height, role, safeArea: true }]
    }
  }
}
```

좌표는 CSS viewport 기준으로 제공한다. 844×390, 932×430, 1280×720, 1920×1080에서 required item 누락, 겹침, offscreen, safe-area 침범을 게이트가 탐지할 수 있어야 한다.

## 성능 예산

- 중급 Android 60FPS, 10분 연속 실행 후 지속 저하 없음.
- initial runtime asset 100~150MB 이하, stage 진입 3초 이내.
- atlas 4096×4096 이하, 씬/구간별 지연 로드.
- 투명 불필요 배경은 WebP/JPEG, 표시 크기의 1.5~2배 소스.
- lowFx는 파편·연기·shake만 줄이고 공격 경고는 줄이지 않는다.

## Reset 불변식

checkpoint/restart/scene shutdown 때 아래가 모두 참이어야 한다.

1. scene-owned timer와 tween 0개
2. collider/listener 중복 없음
3. pooled entity의 inactive/visible/body 상태 일치
4. 숨은 적·탄환이 충돌/점수 생성하지 않음
5. 이전 보스 phase marker와 loop sound 0개
6. held touch/keyboard 입력 false
7. score와 checkpoint snapshot 단 한 번 복원
