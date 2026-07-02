# 게임 시나리오 재구성 — 전체 에셋 활용판

> `assets/`의 **모든 이미지·오디오가 실제로 쓰이도록** 게임을 풀 구조로 재구성.
> Generated: 2026-07-02 · Project: game-dd (💩 Don't Get Pooped!)

## 게임 플로우
```
Home ──▶ Play ──▶ Game ──▶ GameOver ──(이어하기: 하트/코인)──▶ Game
  │                 ▲            │
  ├─ Shop ──────────┘(스킨/배경) └─▶ Home / Shop / Restart
  ├─ Ranking (최고기록)
  └─ Settings (사운드)
```

## 에셋 → 기능 100% 매핑

| 에셋 그룹 | 파일 | 사용처 |
|-----------|------|--------|
| **캐릭터 8종** | player_boy/girl/office_worker/ninja/astronaut/rabbit/cat/duck | 상점에서 구매·선택, 인게임 플레이어. boy는 걷기 애니, 나머지는 정지+바운스 |
| **걷기 애니** | player_walk_8frames | 플레이어(소년) 걷기 |
| **기본 똥** | poop_basic×3 | Stage1~ 낙하 |
| **큰 똥** | poop_large_angry×3 | Stage2~ (느리고 넓음) |
| **작은 똥** | poop_small×3 | Stage3~ (빠르고 작음) |
| **회전 똥** | poop_spin_8frames | Stage4~ 회전 애니 낙하 |
| **황금 똥** | poop_gold×3 | Stage5~ 회피 시 +500 + 코인 |
| **새 똥** | poop_bird_fast | Stage6~ 대각선 진입 |
| **독 똥** | poop_poison×3 | Stage7~ 낙하 후 바닥에 독 잔류 |
| **독 바닥** | poison_floor×3(애니) | 독똥이 바닥에 남기는 장애물(밟으면 사망) |
| **가짜 똥** | poop_fake_shadow | Stage8~ 무해 페이크 |
| **보스** | toilet_boss_front/open/attack/hit + attack_12frames + projectile_poop | Stage10 보스전(왕복 이동·발사·생존 처치) |
| **파워업 5종** | umbrella_shield/slipper_speed/magnet_coin/clock_slow/lightning_clear | 인게임 드롭 → 획득 시 효과 |
| **코인** | coin_poop_01/02(애니) | 드롭·자석 흡수·상점 재화 |
| **하트** | heart_continue_01/02(애니) | 이어하기(continue) 잔여 표시 |
| **이펙트** | explosion/smoke_puff/sparkle_trail/star_ring | 번개/보스폭발/게임오버 / 회피퍼프 / 플레이어 트레일·황금 / 콤보·획득 |
| **메시지** | warning/fantastic/game_over | 폭우 경고 / 콤보 달성 / 게임오버 |
| **UI 버튼** | home/pause/ranking/restart/settings/shop/sound/trophy | 홈·일시정지·게임오버·상점·설정·랭킹 화면 |
| **HUD 패널** | hud_panel | 인게임 상단 점수 패널 배경 |
| **배경 8종** | bg_city/park/school/subway/space/desert/iceberg/lava | 스테이지별 배경 |
| **배경 카드 8종** | bg_*_card | 상점 배경 썸네일 |
| **오디오 10** | dodge_tick×3/near_miss/coin/warning/hit/game_over/shield/button_click | 각 이벤트 SFX |

## 핵심 시스템 요약
- **경제**: 회피/황금/보스로 코인 획득 → 상점에서 캐릭터·배경 영구 구매(성능 무관 코스메틱).
- **콤보**: 연속 회피 100/200/500 → FANTASTIC/MASTER/LEGEND 배수 상승.
- **파워업**: 낮은 확률 드롭, 서로 다른 종류는 동시 중첩, 같은 종류는 지속시간 리셋.
- **이어하기**: 게임오버 시 하트(무료 1회) 또는 코인 50으로 부활(무적 2s + 주변 제거).
- **보스**: 생존 기반 HP 감소(회피로 버티기) + 발사체 회피.
- 저장: 코인/보유스킨/선택/최고점/랭킹/음소거 → localStorage.
