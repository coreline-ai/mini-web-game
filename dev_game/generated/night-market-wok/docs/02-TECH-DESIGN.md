# 02 · Technical Design — Night Market Wok

## What is reused and what is replaced

Foundation(arcade-vertical)에서 **유지**한 것: 씬 흐름(Boot/Loading/Home/Game/Pause/GameOver), `AudioManager`, `SaveData`, `LayoutRegistry`, `StageManager`, `Juice`, `MobileButton`, 세이프에어리어.

**교체**한 것: `Spawner`(낙하 해저드)와 드래그 플레이어 이동. 이 게임에는 떨어지는 물체도, 움직이는 플레이어도 없다. `GameScene`은 전면 재작성되었다.

## Scenes

| Scene | 역할 |
|---|---|
| Boot / Loading | 자산 로드. 재료 5·손님 3은 명시적 key로 로드(제네릭 배선은 arcade role만 앎) |
| Home | 시작 |
| **Game** | 조리 루프 전체 |
| Pause | 일시정지 (오디오 정지, 입력 차단) |
| GameOver | 점수·서빙 수 표시 |

## Systems

| 파일 | 책임 | 경계 |
|---|---|---|
| `config/recipeConfig.js` | 재료·레시피·손님·난이도 상수 | 데이터만. 로직 없음 |
| `systems/OrderSystem.js` | 주문 생성, **순서 판정**, 서빙/실수 카운트 | 렌더링 모름 |
| `systems/CustomerQueue.js` | 좌석 3개의 착석·인내심·이탈 생명주기 | 점수 모름 |
| `systems/ComboSystem.js` | 콤보 스택·배수·서빙 점수 | 난이도에 영향 없음 |
| `ui/OrderTicket.js` | 현재 초점 주문 렌더 | 판정 안 함 |
| `ui/IngredientBar.js` | 재료 버튼 5개, 눌림 상태 | 판정 안 함 |

## State flow

```
착석(seat) → 주문 생성 → [탭 판정 루프] → complete → serve → release('served')
                              ↓ wrong
                        progress=0 + 인내심 감소
                              ↓ 인내심 0
                        release('left') → strike++ → 3이면 finish()
```

## 판정 계약

`OrderSystem.judgeTap(order, id)`는 `'correct' | 'complete' | 'wrong'` 셋만 반환한다. 씬은 이 값에 따라 연출만 고른다 — 판정 로직이 씬에 새지 않는다.

## Entity lifecycle (class A 대응)

좌석은 재사용된다. 재착석 시 `killTweensOf` 후 `visible/alpha/scale/x/y/텍스처/인내심 바`를 전부 초기화하고, 이탈 애니메이션의 `onComplete`에서만 `leaving=false`로 풀어 좌석을 반납한다. 이탈 트윈이 도는 동안에는 `active=false, leaving=true`이므로 새 손님이 겹쳐 앉지 못한다.

## Input robustness (class I 대응)

재료 버튼은 `held` 플래그로 한 번의 pointerdown에 한 번만 발화한다. `pointerup`과 `pointerout` 양쪽에서 눌림 비주얼을 복구해 손가락이 미끄러져도 눌린 채 남지 않는다. 일시정지·종료 시 `setEnabled(false)`로 전면 차단한다.

## Layout contract

`publishLayout`에 HUD(score/strikes/pause), 티켓(panel/title), 재료 버튼 5개, 활성 손님을 게시한다. `requiredIds`는 `score, strikes, pause, order-panel, order-title, ingredient-0, ingredient-4`.

## QA hook

`window.__GAME_QA__`로 상태(`score/served/mistakes/strikes/combo/activeCustomers/visibleCustomers/focusedOrder/isOver`)와 조작(`tapCorrect/tapWrong/tapIngredient/forceTimeout`)을 노출한다. `visibleCustomers`와 `activeCustomers`를 함께 노출하는 이유는 좌석 중복 표시(class A)를 기계로 잡기 위해서다.
