# 01 · GDD — Firebreak Commander

## Rules Contract

아래 구조화 블록은 `game-spec.json`과 `docs-runtime-sync-qa`가 비교하는 계약입니다. 숫자나 ID를 바꿀 때는 런타임 설정, spec, 이 블록을 함께 갱신합니다.

<!-- RULES-CONTRACT:START -->
```json
{
  "durationSeconds": 180,
  "goal": "active-fire-zero",
  "progressMetric": "activeFireCells",
  "requiredObjectives": ["village", "substation"],
  "failConditions": ["required-objective-lost", "time-expired-with-active-fire"],
  "commands": [
    {"id": "firebreak", "label": "방화선", "input": "숲·초지를 연속으로 드래그", "costs": {"fuelPerCell": 3}},
    {"id": "helicopter", "label": "헬기", "input": "불꽃 칸을 탭", "costs": {"water": 20, "fuel": 8}},
    {"id": "engine", "label": "소방차", "input": "남쪽 회색 도로 칸을 탭", "costs": {"fuel": 10, "maxUnits": 2}}
  ]
}
```
<!-- RULES-CONTRACT:END -->

## Pitch

바람보다 먼저 방화선을 긋고 제한된 물과 연료로 소방 자원을 지휘해 Pine Ridge를 지키는 모바일 실시간 전략 액션.

## 30초 루프

바람·3틱 확산 예고 확인 → 방화선/헬기/소방차 선택 → 드래그·탭 명령 → 500ms tick 결과 확인 → 자원과 목표 내구도를 읽고 다음 명령 선택.

## Vertical slice

- 스테이지: `Pine Ridge — First Response`
- 목표 시간: 180초
- 보호 대상: 마을, 변전소, 야생동물 보호구역
- 위기 단계: Dry Front → Wind Shift → Ember Night
- 승리: 필수 목표인 마을·변전소 생존 상태로 활성 화재 0
- 실패: 마을 또는 변전소 내구도 0, 또는 제한 시간 종료
- 야생동물 보호구역은 2·3성에 필요한 보너스 목표

## 행동과 자원

| 행동 | 입력 | 비용 | 역할 |
|---|---|---:|---|
| 방화선 | 드래그 후 릴리즈 | 연료 3/셀 | 연료 제거와 지상 확산 차단 |
| 헬기 | 목표 셀 탭 | 물 20, 연료 8 | 넓은 범위 즉시 냉각 |
| 소방차 | 도로 셀 탭 | 연료 10, 위협 대응 중 물 1/tick | 도로 주변 지속 냉각 |

명령은 preview 중 자원을 소비하지 않으며, 전체 유효성 검사를 통과한 commit에서 정확히 한 번만 소비합니다.

## 점수와 별

- 진화 셀 +100
- 방화선이 확산 압력을 차단하면 보너스
- 전소 셀 감점
- 생존 목표, 남은 물·연료를 결과 점수에 반영
- 1성 클리어, 2성 모든 목표 생존
- 3성: 세 행동 모두 사용+모든 목표 생존+물 25 이상+전소 셀 60 이하

## 180초 위기 곡선

| 시점 | 사건 | 의도 |
|---:|---|---|
| 0초 | 초기 화점 2개, 동풍 | 방화선/헬기 학습 |
| 55/60초 | Dry Lightning 경고/발화, SE 강풍 | 첫 계획 수정 |
| 115/120초 | Ember Front 경고/발화, 남풍 | 중반 자원 압박 |
| 125/130초 | Ember 경고/점프 | 확산 예측 재확인 |
| 155/160초 | South Flank 경고/남쪽 화점 | 소방차의 최종 역할 |
| 180초 이후 | 활성 화재 0 판정 | Pine Ridge 종결 |

모든 spot fire는 5초 전에 HUD 메시지와 SFX로 예고되며 stage data에 고정되어 같은 seed/명령/tick에서 동일하게 재현됩니다.

## 공정성

- 다음 3틱의 위험 셀 표시
- 바람 전환과 불씨 이벤트 사전 경고
- gameplay RNG는 seed 기반
- 색상 외에 패턴·실루엣·애니메이션으로 상태 구분
- 화면 밖 즉시 발화와 예고 없는 불씨 점프 금지

## 제외 범위

실제 GIS/산불 예측, 유체 시뮬레이션, 메타 성장, 상점, 광고·결제, 서버, 멀티플레이, native packaging은 vertical slice 범위가 아닙니다.
