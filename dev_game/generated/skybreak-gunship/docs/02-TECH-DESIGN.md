# 02 · Technical Design — Skybreak Gunship

## Runtime

- Phaser 3 + Vite, logical canvas `390×844`, Scale.FIT + CENTER_BOTH.
- scene: Boot → Loading → Home → Briefing → Game ↔ Pause → Result/GameOver.
- 배경은 1440×3120 WebP를 logical canvas에 cover-fit하고 phase에서 crossfade한다.
- runtime sprite는 768×768 RGBA source를 역할별 `setDisplaySize`로 표시한다.

## Systems

| 시스템 | 책임 |
|---|---|
| AimSystem | playfield pointer 소유권, 42px touch offset, reticle clamp |
| WeaponSystem | 10 rps hitscan, heat/overheat, 650ms missile lock, ammo/cooldown |
| CombatTutorial | 첫 실행의 aim→gun→missile 행동 게이트, 임무 시간 정지, 완료 상태 저장 |
| MissionDirector | fixed schedule, phase 전환, deterministic spawn order |
| GameScene target model | target lifecycle, 공격 주기, convoy damage, part damage |
| GunshipHud | score/combo/time/convoy/heat/pause |
| SaveData | best score와 mute 설정의 corruption-safe localStorage |
| LayoutRegistry | visual QA용 viewport UI bounds 공개 |

## Runtime contracts

- `window.__GAME_RULES__`: config-derived rules.
- `window.__GAME_LAYOUT_BOUNDS__`: visible HUD bounds.
- `window.__SKYBREAK_QA__`: phase, time, heat, ammo, convoy HP, strikes, targets, accuracy.
- `window.__GAME__`: Phaser instance for QA adapters.

## Layering

background -30, entity 20~28, combat FX 48~61, targeting 78~85, phase notice 92, dock 95~106, warning 110. 배경은 gameplay entity를 소유하지 않는다.

## Lifecycle rules

- aim pointer와 weapon pointer는 동시에 사용할 수 있지만 GUN과 MISSILE command는 상호 배타적이다. 한 무기가 hold 중이면 다른 무기의 down을 무시한다.
- Pause와 visibilitychange는 즉시 weapon input을 중단한다.
- terminal transition은 `ended` guard로 한 번만 실행한다.
- scene shutdown에서 pointer/visibility listener와 타이머를 제거한다. Display object 파괴는 Phaser scene display-list에 위임해 이중 파괴를 막는다.
- Phaser가 Scene 인스턴스를 재사용하므로 `create()` 시작 시 이전 run의 display-object 참조를 `null`로 초기화한다.
- update delta는 50ms로 clamp해 resume 순간 이동을 방지한다.
- 첫 실행 tutorial 중에는 MissionDirector와 mission elapsed를 정지한다. 미사일 실습 완료 후 score/combo/heat/ammo/accuracy를 실제 임무 초기값으로 되돌린다.
