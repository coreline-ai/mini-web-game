# 05-ADVERSARIAL-REVIEW — Keeper of the Last Light

이 문서는 "이 게임이 기존 게임의 리스킨이 아닌가"를 적대적으로 검증한다.

## 기존 17개와의 대조

| 기존 계열 | 대표 | 이 게임과 겹치는가 |
|---|---|---|
| 사격 | target-shooter-rush, skybreak-gunship, ghost-train-railgun, iron-courier | 조준·발사 없음. 겹치지 않음 |
| 궁술 | sky-archer, castle-archer, jungle-arcshot, bullseye-rush | 각도·힘 조절 없음. 겹치지 않음 |
| 레이싱 | rush-lane-racer, road-stream-racer | 이동·회피 없음. 플레이어 아바타가 아예 없음 |
| 물류/지휘 | parcel-sort-rush, harbor-crane-commander, firebreak-commander | 드래그 배치·자원 배분 없음 |
| 회피 | poop-dodge, meteor-dash, last-light-zero-hour | 낙하물 회피 없음 |
| 조리 | night-market-wok | 재료 순서 탭이라는 점만 표면적으로 유사 |
| 전략 | market-panic | 수치 판독은 유사하나 실시간 리듬 입력이 아님 |

## night-market-wok과의 결정적 차이

가장 가까운 것은 야시장 조리(순서대로 탭)다. 그러나:

| | night-market-wok | keeper-last-light |
|---|---|---|
| 입력 단위 | **어떤 재료를 누르는가**(공간 선택) | **얼마나 오래 누르는가**(시간 길이) |
| 대상 수 | 재료 버튼 여러 개 | 램프 **하나** |
| 실패 판정 | 잘못된 재료 탭 | 누름 길이가 임계를 넘었는지 |
| 핵심 기술 | 순서 기억 | 시간 감각 |

입력 대상이 하나뿐이고 정보가 **누름 지속 시간**에만 실려 있다는 점이 이 게임의 정체성이다.
이 축은 저장소 어디에도 없다.

## v1로 만들 수 없는가 — 예

schema v1 어휘는 낙하 hazard + collectible + 좌우 이동 플레이어다. 이 게임에는
낙하물도, 수집물도, 이동하는 플레이어도 없다. 억지로 v1에 넣으면 "배 모양 낙하물을 피하는
게임"이 되어 설계가 통째로 사라진다. 그래서 `buildDecision: custom-loop`가 유일한 선택이고,
이것은 편의가 아니라 필연이다.

## 새로 구현한 시스템 (재사용 아님)

`SignalCodec`(접두사 판정), `PatternInput`(누름 길이→펄스, 멀티터치 차단),
`Ship`(인내심 게이지 생명주기), `ShipRouting`(고정 풀·동시 대기 상한),
`StageDirector`(쿼타·터미널). 어느 것도 기존 게임에서 복사하지 않았다.

## 남은 리스크

- **판정 임계의 재미**: `longPressMs`가 너무 엄격하면 스트레스가 된다. config로 빼 두었고
  캡처 검토에서 조정한다.
- **동시 대기 시 포커스 모호성**: 현재는 "가장 급한 배"를 자동 선택한다. 플레이어가 어느
  배에 답하는지 헷갈릴 수 있으므로, 포커스 배를 시각적으로 강조해야 한다 — 캡처 검토 항목.
