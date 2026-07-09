# Road Stream Racer 기획서

작성 일시: `2026-07-08 KST`

참조 이미지: Codex 세션 첨부 이미지 사용. 로컬 attachment 절대경로는 보존하지 않는다.

## 1. 기획 결론

첨부 이미지는 `도로가 이동하는 자동차 게임 제작 예시`로, 단순히 자동차가 위로 달리는 정적 도로 게임이 아니라 `도로 타일 세그먼트가 아래로 흐르고, 화면 밖으로 나간 도로가 다시 위에 재배치되는 구조`를 핵심으로 한다.

따라서 이 게임은 기존 `차량 회피 템플릿`을 그대로 쓰기보다 다음 방향으로 기획한다.

```text
플레이어 차량은 화면 하단 플레이 영역에 머문다.
도로 세그먼트, 차선, 장애물, 코인, 부스터가 플레이어 쪽으로 흘러온다.
도로는 직선만 반복되지 않고, 세그먼트 재배치 때마다 차선/장애물/보상 패턴이 바뀐다.
플레이어는 차선 변경, 미세 회피, 부스트 선택으로 점수와 생존을 동시에 노린다.
```

추천 게임명: `Road Stream Racer`

한줄 피치:

> 움직이는 도로 스트림 위에서 차선을 갈아타며 차량, 공사 구간, 코인 라인, 부스터 패드를 읽고 즉시 판단하는 세로형 모바일 레이싱 러너.

빌드 판단: `hybrid`

- `rush-lane-racer` 계열의 차선 회피/코인/충돌 루프는 참고한다.
- 핵심 도로 시스템은 새로 만든다. 정적 배경이나 단순 falling hazard가 아니라 `RoadSegmentSystem`, `LanePathSystem`, `PatternDirector`가 중심이다.

## 2. 병렬 검토 요약

### 시각/에셋 검토

- 필수 장면은 `타이틀`, `카운트다운`, `주행`, `충돌/게임오버`, `결과/재시작` 5개다.
- 필수 에셋은 도로 타일, 플레이어 차량, AI 차량, 장애물, 코인, 부스터, 가드레일/나무/가로등, UI 버튼/패널이다.
- 실제 게임으로 만들려면 정적 에셋 목록만으로는 부족하다. 도로 이음새, 차선 폭, 차량 크기, 히트박스, 충돌/코인/부스터 애니메이션까지 정의해야 한다.
- 가장 큰 시각 리스크는 도로 타일 상하단의 차선/보도블록/아스팔트 질감이 어긋나는 것이다.

### 게임플레이/기술 시스템 검토

- 핵심은 `자동차가 이동한다`가 아니라 `도로 스트림이 플레이어 쪽으로 밀려온다`로 모델링하는 것이다.
- 권장 조작은 `3차선 고정 + 짧은 드래그 미세 보정`이다.
- 도로 세그먼트는 풀링하고, 화면 아래로 나간 세그먼트를 위로 재배치한다.
- 커브 타일은 초기 MVP에서 욕심내기보다, 직선 기반 루프가 안정화된 뒤 `lane path interpolation`으로 확장한다.
- 모든 도로/장애물/코인은 같은 `scrollSpeed` 기준으로 움직여야 판정과 화면이 맞는다.

### 콘텐츠/레벨 디자인 검토

- 스테이지는 도심 진입로, 교외 도로, 공사 구간, 고속도로, 교차로, 산악 커브길, 야간/비 오는 도로, 무한 질주 모드로 확장 가능하다.
- 난이도는 속도만 올리지 말고 `도로 속도`, `장애물 밀도`, `AI 차량 수`, `코인 위치 위험도`, `부스터 등장 빈도`를 같이 조절한다.
- 종료 조건은 충돌 실패, 체력 소진, 시간 종료, 목표 달성, 도로 이탈 실패를 모드별로 분리한다.
- 재플레이 동기는 최고 점수, 코인, 별 등급, 일일 미션, 차량 해금, 부스터 성장으로 만든다.

## 3. 플레이어 경험 목표

### 1분 플레이 감각

- 시작 후 3초 안에 도로가 움직이는 속도감을 느낀다.
- 10초 안에 차선 변경, 코인 수집, AI 차량 회피를 모두 경험한다.
- 20초 안에 위험한 코인 라인과 안전한 회피 경로 중 선택하게 된다.
- 30초마다 속도와 패턴이 바뀌어 `이번 판은 더 멀리 갈 수 있겠다`는 욕구가 생긴다.

### 5분 혼돈 상태

- 도로 속도가 눈에 띄게 빨라진다.
- AI 차량이 2~3차선을 동시에 압박한다.
- 공사 구간과 보상 라인이 겹친다.
- 부스터 패드를 밟으면 점수는 크게 오르지만 판단 시간이 줄어든다.
- 커브/교차로/야간 테마가 시각적 긴장을 만든다.

## 4. 장면 구성

### Scene 1. 타이틀 / 메인 화면

목적:

- 게임 로고와 즉시 시작 버튼을 보여준다.
- 뒤쪽 도로는 느리게 흐르게 해서 `도로가 움직이는 게임`임을 첫 화면부터 전달한다.

구성:

- `Road Stream Racer` 로고
- START 버튼
- SOUND 버튼
- BEST SCORE / BEST DISTANCE
- 배경: 흐르는 직선 도로 + 좌우 나무/가드레일

주의:

- 도로가 정지해 있으면 이 게임의 차별점이 약해진다.
- START 버튼은 최소 64px 이상 터치 높이로 둔다.

### Scene 2. 카운트다운 / 시작

목적:

- 3-2-1 카운트다운 중 플레이어 차량을 하단에 고정하고 도로 스크롤을 서서히 시작한다.

구성:

- 큰 카운트다운 숫자
- 플레이어 차량
- 시작 전 안전한 빈 도로
- 짧은 엔진 사운드/진동

규칙:

- 카운트다운 중 충돌은 발생하지 않는다.
- 마지막 `GO` 시점부터 스폰과 점수가 시작된다.

### Scene 3. 주행 플레이 화면

목적:

- 게임의 핵심 화면. 도로 세그먼트, 장애물, 보상, 부스터가 아래로 이동한다.

구성:

- 상단 HUD: 점수, 거리, 코인, 일시정지
- 중앙/하단: 플레이어 차량
- 도로 세그먼트: 2~3개가 이어져 무한 스크롤
- AI 차량/장애물/코인/부스터
- near miss, combo, boost FX

규칙:

- 플레이어 차량은 화면 하단 78~88% 영역에 머문다.
- 도로/오브젝트가 내려와 속도감을 만든다.
- 모든 오브젝트는 같은 스크롤 좌표계를 따른다.

### Scene 4. 충돌 / 게임오버

목적:

- 충돌 이유를 명확하게 보여주고 즉시 결과 화면으로 넘어간다.

구성:

- 슬로모션 0.25~0.4초
- 충돌 이펙트, 파편, 연기
- 차량 흔들림/스핀
- GAME OVER 텍스트

규칙:

- 이펙트가 너무 커서 실패 원인을 가리면 안 된다.
- 충돌 후 입력은 잠깐 잠그고, 결과 화면에서 재시작을 받는다.

### Scene 5. 결과 / 재시작

목적:

- 점수, 거리, 코인, 최고 기록, 획득 보상을 한눈에 보여주고 바로 재시작하게 한다.

구성:

- SCORE
- DISTANCE
- BEST SCORE
- COINS
- NEAR MISS / BOOST BONUS
- RESTART 버튼
- HOME 버튼

규칙:

- 재시작 버튼은 가장 크게 둔다.
- 결과 화면도 도로가 아주 느리게 흐르거나 흐린 배경으로 움직여 게임 톤을 유지한다.

## 5. 핵심 조작

권장 MVP 조작: `3차선 이동 + 짧은 드래그 보정`

### 모바일

- 좌/우 스와이프: 인접 차선으로 이동
- 좌/우 드래그 유지: 현재 차선 안에서 미세 보정
- 위 스와이프 또는 BOOST 버튼: 부스트 발동
- 탭: 결과 화면에서 재시작/버튼 입력

### 데스크톱 테스트

- 방향키 또는 A/D: 차선 이동
- Space: 부스트
- Enter: 시작/재시작

### 조작 철학

- 조작은 단순해야 한다.
- 난이도는 입력 복잡도가 아니라 도로 패턴, 위험 배치, 보상 선택에서 나온다.
- 완전 자유 이동은 첫 버전에서 제외한다. 도로/차선 정합과 충돌 판정 난이도가 높아진다.

## 6. 30초 코어 루프

| 시간 | 이벤트 | 플레이 감각 |
|---:|---|---|
| 0~3초 | 카운트다운 | 준비, 위치 확인 |
| 3~8초 | 직선 도로 + 느린 AI 차량 + 코인 | 조작 학습 |
| 8~15초 | AI 차량 2대 + 콘/바리케이드 | 첫 회피 판단 |
| 15~22초 | 위험한 코인 라인 또는 안전 경로 | 리스크/보상 선택 |
| 22~28초 | 속도 상승 + 패턴 밀도 증가 | 압박감 상승 |
| 28~30초 | 난이도 단계 갱신 | 다음 패턴 기대 |

반복 구조:

```text
도로 흐름 시작
→ 장애물/보상 패턴 읽기
→ 차선 변경/미세 회피
→ 코인/near miss/부스트 보상
→ 속도와 패턴 상승
→ 충돌 또는 기록 갱신
→ 결과/재시작
```

## 7. 움직이는 도로 시스템

### 핵심 모델

도로는 배경 이미지 1장이 아니라 `RoadSegment` 풀로 관리한다.

```text
RoadSegment A
RoadSegment B
RoadSegment C

각 세그먼트는 아래로 이동한다.
화면 아래로 완전히 나가면 맨 위로 이동한다.
맨 위로 이동할 때 다음 도로 타입과 패턴을 새로 선택한다.
```

### RoadSegment 데이터

```json
{
  "id": "straight_city_01",
  "visualType": "straight",
  "height": 640,
  "laneCount": 3,
  "laneAnchors": [324, 540, 756],
  "entryCompatibility": ["straight", "left-soft", "right-soft"],
  "exitCompatibility": ["straight", "construction", "coin-line"],
  "difficultyTags": ["easy", "city"],
  "spawnPoints": [
    { "lane": 0, "yRatio": 0.25, "type": "coin" },
    { "lane": 1, "yRatio": 0.55, "type": "traffic-car" },
    { "lane": 2, "yRatio": 0.8, "type": "empty" }
  ]
}
```

### 도로 타입

| 타입 | MVP 포함 | 역할 |
|---|---|---|
| 직선 도로 | 필수 | 기본 주행 |
| 공사 도로 | 필수 | 콘/바리케이드 패턴 |
| 횡단보도 | 권장 | 시각 변화, 경고 패턴 |
| 교차로 | 2차 | 이벤트 구간 |
| 좌커브 | 2차 | 차선 path 변화 |
| 우커브 | 2차 | 차선 path 변화 |
| 야간 도로 | 2차 | 시야 제한/라이트 효과 |
| 비 오는 도로 | 2차 | 미끄러짐/반사 효과 |

### 세그먼트 재배치 규칙

- 세그먼트 상하단 차선과 도로 가장자리는 정확히 맞아야 한다.
- 재배치 순간 y 위치가 소수점 누적으로 어긋나지 않게 정수 스냅을 적용한다.
- 세그먼트가 사라지는 시점은 `segment.y > canvasHeight + segment.height / 2`.
- 새 세그먼트는 현재 가장 위 세그먼트의 top에 정확히 붙인다.
- 첫 버전은 `straight / construction / crosswalk` 중심으로 간다.

## 8. 플레이 시스템

### LaneSystem

역할:

- 현재 차선 index 관리
- 좌우 스와이프 입력 처리
- 미세 드래그 보정 범위 제한
- 커브 확장 시 lane path interpolation 제공

규칙:

- 차선 변경 중 0.12~0.18초 입력 완충을 둔다.
- 차량 중심은 차선 중심에서 너무 벗어나지 않게 clamp한다.
- 터치 입력과 BOOST 버튼 입력 영역이 충돌하지 않게 분리한다.

### TrafficSystem

역할:

- AI 차량, 트럭, 오토바이, 경찰차 등 스폰
- 같은 도로 스크롤 속도 기준으로 이동
- 패턴별 최소 안전 경로 보장

규칙:

- 한 패턴에서 모든 차선을 동시에 막지 않는다.
- 초반 10초는 즉사 바리케이드를 과하게 배치하지 않는다.
- AI 차량은 플레이어 차량과 구분되는 색/실루엣을 가진다.

### ObstacleSystem

장애물:

- 교통 콘: 충돌 시 감속/흔들림, hard mode부터 즉사 옵션
- 바리케이드: 즉사
- 도로 공사판: 차선 차단
- 가드레일: 도로 밖 이동 모드에서 경계
- 오일 웅덩이: 미끄러짐 또는 조작 지연

### RewardSystem

보상:

- 코인
- 위험한 코인 라인
- 부스터 패드
- near miss 보너스
- 연속 회피 콤보

보상 설계:

- 안전 경로에는 낮은 보상
- 위험한 좁은 경로에는 높은 보상
- 부스터는 완전 무적보다 `점수 배율 + 코인 흡입 + 속도 상승`이 낫다.

### CollisionSystem

규칙:

- 차량 히트박스는 시각 크기의 70~80%로 축소한다.
- 충돌 판정은 이미지 투명 bbox가 아니라 설계된 body rect로 한다.
- 부스트 중 빠른 이동으로 터널링이 생기지 않게 fixed step 또는 swept check를 고려한다.
- 차선 변경 직후 짧은 grace window를 둔다.

### ScoreSystem

점수 공식 예시:

```text
distanceScore = elapsedSeconds * baseSpeedFactor * 10
coinScore = coins * 10
nearMissScore = nearMissCount * 25
comboBonus = consecutiveAvoids * 5
boostBonus = boostDistance * 1.5
finalScore = distanceScore + coinScore + nearMissScore + comboBonus + boostBonus
```

## 9. 스테이지 / 모드

### MVP 모드

1. `City Run`
   - 직선 도로 중심
   - AI 차량 1종
   - 코인, 콘
   - 목표: 60초 생존 또는 점수 2,000점

2. `Construction Sprint`
   - 공사 구간 중심
   - 콘, 바리케이드, 좁아지는 차선
   - 목표: 장애물 15개 회피

3. `Highway Rush`
   - 속도 상승 중심
   - AI 차량 2종, 트럭
   - 목표: 목표 거리 도달

4. `Endless Stream`
   - 모든 기본 패턴 무한 반복
   - 30초마다 난이도 단계 상승
   - 목표: 최고 점수 갱신

### 확장 모드

| 모드 | 핵심 변화 |
|---|---|
| Crossroad Panic | 교차로와 횡단보도 이벤트 |
| Mountain Curve | 좌/우 커브 lane path |
| Night Rain | 시야 제한, 헤드라이트, 미끄러짐 |
| Police Chase | 뒤에서 쫓아오는 경찰차 압박 |
| Boss Truck | 화면 상단 대형 트럭 패턴 회피 |

## 10. 난이도 설계

난이도 축:

- `scrollSpeed`
- `trafficDensity`
- `obstacleDensity`
- `safeLaneCount`
- `coinRiskLevel`
- `boostFrequency`
- `patternComplexity`

단계:

| 단계 | 시간/조건 | 주요 변화 |
|---|---|---|
| Lv 1 | 0~30초 | 직선, 느린 차량, 넓은 안전 공간 |
| Lv 2 | 30~60초 | 콘/코인 라인, 차량 2대 패턴 |
| Lv 3 | 60~90초 | 바리케이드, 차선 막힘, near miss 유도 |
| Lv 4 | 90~150초 | 트럭/오토바이, 보상 위험도 상승 |
| Lv 5 | 150초+ | 복합 패턴, 부스터 선택 압박 |

중요 규칙:

- 난이도는 플레이어가 얻는 보상으로 되돌아가지 않는다.
- `elapsedTime`, `distance`, `stageIndex`처럼 단조 증가하는 값으로 난이도를 올린다.
- 모든 패턴은 최소 1개 안전 경로를 가져야 한다.

## 11. 에셋 계획

### 필수 장면 에셋

| 역할 | 수량 | 요구 |
|---|---:|---|
| stage background | 3 | 도시/공사/고속도로 사이드 배경 |
| road segment straight | 2+ | seamless 상하 연결 |
| road segment construction | 2+ | 차선/콘/보도블록 정합 |
| road segment crosswalk | 1+ | 횡단보도/교차로 확장 |
| lane marking overlay | 1~2 | 차선 선명도 보정 |
| player car | 1 spritesheet | 정탑뷰/약한 3D, 좌우 기울기 프레임 |
| traffic car | 2+ | 플레이어와 색/실루엣 구분 |
| truck/motorcycle | 2 | 난이도 확장 |
| cone | 1 | 작은 장애물 |
| barricade | 1 | 즉사 장애물 |
| coin | 1 spritesheet | 회전/반짝임 |
| booster pad | 1 spritesheet | 발광/펄스 |
| crash FX | 2+ | 폭발/연기/파편 |
| boost FX | 2+ | 속도선/잔상 |
| UI buttons | 8+ | start/pause/restart/home/sound/boost |
| result panel | 1 | 점수/코인/베스트 표시 |

### 에셋 정합성 규칙

- 런타임 기준은 `native-fhd-canvas` 1080×1920을 권장한다.
- 도로 세그먼트는 1080 폭 기준으로 제작하되, 실제 주행 도로 영역은 중앙 65~78%에 둔다.
- 차량은 차선 폭의 45~60% 정도로 맞춘다.
- 모든 차량은 같은 시점, 같은 광원, 같은 그림자 방향을 유지한다.
- 도로 타일 상하단의 차선/가장자리/보도블록은 1px 단위로 맞아야 한다.
- UI는 도로/차량 위에 올라와도 읽히도록 두꺼운 stroke 또는 패널 대비를 확보한다.

## 12. 기술 설계

권장 파일 구조:

```text
src/game/systems/RoadSegmentSystem.js
src/game/systems/LaneInputSystem.js
src/game/systems/TrafficPatternSystem.js
src/game/systems/BoostSystem.js
src/game/systems/NearMissSystem.js
src/game/systems/RacingScoreSystem.js
src/game/data/road-segments.json
src/game/data/traffic-patterns.json
src/game/data/racing-tuning.js
```

핵심 데이터:

```text
RoadSegment
- id
- visualType
- height
- laneAnchors
- spawnPoints
- entryCompatibility
- exitCompatibility
- difficultyTags

TrafficPattern
- id
- unlockLevel
- occupiedLanes
- safeLanes
- objects
- rewardLine
- minReactionTime
- tags
```

구현 우선순위:

1. FHD canvas + 모바일 shell
2. 도로 세그먼트 풀링/무한 재배치
3. 플레이어 차선 이동
4. AI 차량/장애물 스폰
5. 충돌/게임오버
6. 코인/점수/near miss
7. 부스터
8. 스테이지/난이도
9. 결과 화면/저장
10. 고품질 에셋/오디오/QA

## 13. QA 기준

### 브라우저 캡처 필수

- Loading
- Home
- Countdown
- Game
- Boost active
- Crash
- GameOver
- Result
- Pause

### 해상도

- 390×844
- 430×932
- 1080×1920
- 1280×900 desktop shell

### 반드시 확인할 항목

- 도로 타일 이음새가 보이지 않는가
- 차선 폭과 차량 크기가 맞는가
- 플레이어/AI 차량 방향이 올바른가
- 도로가 실제로 아래로 흐르고 있는가
- 화면 밖으로 나간 도로 세그먼트가 끊김 없이 위에 재배치되는가
- 장애물 패턴에 최소 1개 안전 경로가 있는가
- 충돌 판정이 억울하지 않은가
- 부스터 중 터널링이 없는가
- 코인/부스터/장애물의 시각 언어가 구분되는가
- HUD와 pause/boost 버튼이 겹치지 않는가
- desktop에서 게임이 전체 창으로 퍼지지 않는가

## 14. MVP 범위와 제외 범위

### MVP에 포함

- 5개 장면: Home, Countdown, Game, GameOver, Result
- 움직이는 도로 세그먼트
- 3차선 이동
- AI 차량/콘/바리케이드
- 코인/부스터
- 충돌/near miss/점수/최고점
- 도시/공사/고속도로 테마
- 즉시 재시작

### MVP에서 제외

- 완전 자유 주행
- 복잡한 커브 lane path
- 실제 물리 기반 드리프트
- 멀티플레이
- 서버 랭킹
- 광고/IAP
- 차량 업그레이드 복잡 경제

## 15. 다음 제작 프롬프트 초안

```text
dev_game에서 새 게임 `Road Stream Racer`를 제작해줘.
첨부 이미지의 도로가 이동하는 자동차 게임 예시를 기반으로 하되,
정적인 도로 배경이 아니라 RoadSegmentSystem으로 도로 타일이 아래로 흐르고,
화면 밖으로 나간 도로가 위로 재배치되는 세로형 모바일 레이싱 러너로 만든다.

핵심:
- native-fhd-canvas 1080x1920
- 3차선 이동 + 짧은 드래그 보정
- 고정 플레이어 차량 + 이동 도로/장애물/코인/부스터
- Home / Countdown / Game / Crash/GameOver / Result
- 직선/공사/횡단보도 도로 세그먼트 MVP
- AI 차량, 콘, 바리케이드, 코인, 부스터 패드
- near miss, boost bonus, best score
- 도로 타일 seamless 연결과 desktop mobile shell QA 필수

병렬 검토 결과에서 지적된 도로 이음새, 차선 폭, 차량 크기, 히트박스, 스폰 안전 경로를
GDD/기술설계/QA에 반영하고 production-demo 기준으로 구현한다.
```

## 16. 최종 판단

이 기획은 단순한 자동차 피하기보다 완성도가 높아질 여지가 있다. 핵심 차별점은 `움직이는 도로 자체가 게임 시스템`이라는 점이다.

처음부터 커브/교차로/야간 효과를 모두 넣으면 도로 정합성과 판정 문제가 커진다. 1차 제작은 직선/공사/횡단보도 기반으로 도로 세그먼트 재배치와 차선 회피 재미를 먼저 완성하고, 그 다음 커브/교차로/날씨를 확장하는 순서가 가장 안전하다.
