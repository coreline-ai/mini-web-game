# 01 · Game Design Document — Skybreak Gunship

## Pitch

자동 비행하는 구조 건십의 사수가 되어, 재난 도심의 의료 호송차와 민간인을 보호하는 세로형 정밀 지원 슈팅 게임이다. 플레이어는 기체를 이동하지 않고 전장을 조준하며 적·아군·민간인을 식별한다.

## Vertical Slice

- 임무: `Operation Skybridge — Downtown Extraction`
- 길이: 90초, 100초 hard timeout
- 구간: Approach 0~15초 / Escort 15~42초 / Armor Break 42~65초 / Boss Extraction 65~90초
- 무기: 30mm 기관포, 유도 미사일 4발
- 적: 소총병, 로켓병, 공격 드론, 장갑차, 공격 헬기 보스
- 보호 대상: 구조 차량 HP 1000, 민간인 그룹

## Core loop

첫 플레이는 임무 시간이 멈춘 3단계 실전 훈련으로 시작한다. 플레이어가 실제 drag 조준, 기관포 적 제거, 미사일 lock-release를 성공해야 본 임무 타이머가 시작된다. 훈련 점수·콤보·열·탄약은 본 임무 시작 시 초기화한다.

1. 드래그로 손가락보다 42px 위의 reticle을 이동한다.
2. red diamond / cyan shield / white rescue ring으로 표적을 식별한다.
3. GUN hold로 hitscan 기관포를 연사하고 heat를 관리한다.
4. MISSILE hold 650ms 후 release로 중장갑 표적을 공격한다.
5. 위협 제거로 호송차 피해를 줄이고 support combo를 올린다.

## Win / fail

- 성공: 공격 헬기 격추 + 구조 차량 HP 1 이상.
- 실패: 구조 차량 파괴, 민간인 오인 사격 3회, 100초 내 보스 미격추.

## Scoring

- 명중 +10, 적 제거 점수 × combo.
- 민간인/아군 오인 사격 -500, combo 초기화.
- 장갑차/보스 part 파괴 +250.
- 결과 화면은 score, accuracy, convoy integrity, rank를 표시한다.

## Out of scope

EMP, 연막, 레이저, 추가 지역, 상점/성장, 자유 비행, 3D 물리 파괴, 온라인 기능은 이번 Vertical Slice에 포함하지 않는다.

<!-- RULES-CONTRACT:START -->
```json
{
  "durationSeconds": 90,
  "goal": "boss-defeated-and-convoy-survives",
  "progressMetric": "mission-seconds-and-boss-hp",
  "requiredObjectives": ["medical-convoy", "civilian-corridor"],
  "failConditions": ["convoy-destroyed", "three-civilian-strikes", "hard-timeout"],
  "commands": [
    { "id": "aim", "label": "AIM", "input": "playfield drag" },
    { "id": "gun", "label": "30MM GUN", "input": "button hold" },
    { "id": "missile", "label": "MISSILE", "input": "button hold 650ms then release" }
  ]
}
```
<!-- RULES-CONTRACT:END -->
