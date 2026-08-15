# 04 · QA Plan — Night Market Wok

## 1. Foundation smoke

- 캔버스 렌더, PLAY로 게임 진입, 콘솔/페이지 에러 0건
- 일시정지 → 재개 시 입력·HUD 복구

## 2. 장르 고유 assertion (이 게임에서만 의미 있는 검사)

| # | 검사 | 방법 | 기대 |
|---|---|---|---|
| G1 | 올바른 순서 탭이 단계를 진행시킨다 | `__GAME_QA__.tapCorrect()` 반복 | `focusedOrder.progress` 단조 증가 |
| G2 | 마지막 단계에서 서빙된다 | 레시피 길이만큼 `tapCorrect()` | `served` +1, 좌석 해제 |
| G3 | 틀린 순서는 그 그릇만 초기화한다 | `tapWrong()` | `progress → 0`, 주문명 불변, `mistakes` +1 |
| G4 | 오조작이 즉사시키지 않는다 | `tapWrong()` ×5 | `isOver === false` |
| G5 | 인내심 소진이 스트라이크가 된다 | `forceTimeout()` | `strikes` +1 |
| G6 | 3스트라이크에서 종료된다 | `forceTimeout()` ×3 | GameOver 씬 전환 |
| G7 | 콤보는 서빙에 오르고 실수에 초기화된다 | 서빙 2회 → `tapWrong()` | 배수 상승 후 `comboStack === 0` |
| G8 | 좌석이 중복 표시되지 않는다 | 서빙/이탈 10회 반복 | 매 프레임 `visibleCustomers === activeCustomers` |
| G9 | 난이도가 회복 가능한 값에 의존하지 않는다 | 코드 검토 + `recipeConfig` | 난이도 입력이 `elapsed`/`servedCount`뿐 |

## 3. 입력 적대성 (class I)

- 재료 버튼 3연타 → 단계가 1회만 진행되는지
- 버튼 누른 채 손가락 이탈 → 눌림 비주얼 복구
- 일시정지 중 재료 탭 → 무반응
- 전환 중 탭 → 중복 씬 전환 없음

## 4. 생명주기 (class A)

- 서빙 ↔ 재착석 10사이클: 좌석의 `alpha/visible/scale/y`가 매번 초기값으로 복귀
- 이탈 트윈 진행 중 새 손님이 같은 좌석에 앉지 않음

## 5. 오디오 (class H)

- 홈→게임→홈 ×3 후 BGM 인스턴스 ≤ 1
- 일시정지·백그라운드 전환 시 BGM 정지

## 6. Production-demo 게이트

```bash
npm --prefix dev_game run factory:production-demo-qa -- --project generated/night-market-wok --require-gpt-imagegen
npm --prefix dev_game run factory:image-quality-qa -- --project generated/night-market-wok
npm --prefix dev_game run factory:visual-layout-qa -- --project generated/night-market-wok --viewports 390x844,430x932,1080x1920
npm --prefix dev_game run factory:scene-composite-qa -- --project generated/night-market-wok --viewports 390x844,430x932,1080x1920
```

## 7. 캡처 상태 매트릭스

| 상태 | 확인 항목 |
|---|---|
| Loading | 진행 바·타이틀 표시 |
| Home | PLAY 버튼, 배경 |
| Game (초기) | 손님 1명, 티켓에 주문, 재료 5개 |
| Game (진행 중) | 단계 체크 표시, 콤보 텍스트, 인내심 바 색 변화 |
| Game (다중 주문) | 좌석 3개 동시, 초점 좌석만 불투명 |
| Pause | 오버레이, HUD 숨김 |
| GameOver | 점수·서빙 수 |

각 상태에서 아이콘 누락·방향 오류, HUD 겹침, 레이어 순서, 잘림, 콘솔 예외를 확인한다.
