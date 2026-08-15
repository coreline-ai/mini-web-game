---
name: game-asset-creation
description: Create, edit, validate, and QA 2D game sprite assets and sprite sheets, especially 1990s arcade fighting game character animation sheets. Use when generating or editing game animation assets, fix sprite-sheet spacing/alignment, preserve character identity, normalize frame cells, or formalize prompts for image editing tasks such as repositioning 5 completed animation assets so assets 1-3 match the center-to-center spacing of assets 4-5 without changing shape, scale, baseline, order, or frame content.
---

# Game Asset Creation

## 목적

2D 게임용 캐릭터 에셋, 스프라이트 시트, 동작 프레임, 타격/방어/피격 애니메이션을 **실제 게임에 바로 넣을 수 있는 기술 에셋**으로 생성·편집·검수한다.

특히 완성된 이미지 안에 5개의 연속 동작 에셋이 있고, 1·2·3번 에셋의 좌우 간격이 4·5번 에셋보다 너무 좁을 때 다음을 보장하며 재배치한다.

- 1·2·3번 에셋의 중심 간격을 4·5번 에셋의 중심 간격과 동일하게 맞춘다.
- 각 에셋의 모양, 픽셀 내용, 포즈, 크기, 스케일, 기준선, 순서, 프레임 의미를 바꾸지 않는다.
- 필요한 경우 투명 캔버스만 확장하거나 전체 시트를 평행 이동한다.
- 캐릭터를 다시 그리지 않고, 기존 에셋을 잘라서 정확히 옮기는 방식을 우선한다.

## 적용 범위

이 스킬은 다음 작업에 사용한다.

- 격투 게임, 액션 게임, 플랫포머용 캐릭터 스프라이트 제작
- idle, walk, punch, kick, guard, guard-hit, body-hit, knockdown 등 동작별 시트 생성
- 완성된 스프라이트 시트의 프레임 간격, 기준선, 중심점, 셀 크기 보정
- 캐릭터 일관성, 프레임 수, 투명 배경, 셀 정렬 검수
- 이미지 편집 모델에 넣을 프롬프트 작성
- 기존 PNG를 deterministic cut-and-paste 방식으로 재배치하는 작업 설계

## 입력 가정

작업 시작 전에 다음 정보를 확인한다.

- 입력 이미지는 하나의 스프라이트 시트이거나, 개별 프레임 PNG 묶음이다.
- 배경은 투명이거나 제거 가능해야 한다.
- 에셋은 왼쪽에서 오른쪽으로 시간 순서대로 배치되어 있다.
- 각 에셋은 하나의 독립된 동작 프레임이다.
- 프레임 내용은 이미 승인되었고, 요청은 “다시 그리기”가 아니라 “정렬/간격 보정”일 수 있다.
- 기준 프레임 수가 명시되어 있으면 반드시 그 수를 유지한다.
- 사용자가 “5개의 이미지 에셋”이라고 말하면 정확히 5개 프레임만 유지한다.

입력에서 모호한 부분이 있으면, 실제 수정 전에 다음 중 필요한 것만 짧게 확인한다.

- 고정해야 할 캔버스 크기
- 투명 캔버스 확장 허용 여부
- 4·5번 에셋을 절대 고정할지, 전체 시트 평행 이동을 허용할지
- 기준선이 발바닥 하단인지, 캐릭터 루트 앵커인지

## 비목표

다음은 기본적으로 하지 않는다.

- 캐릭터 디자인 변경
- 포즈 재해석 또는 동작 추가
- 프레임 수 변경
- 에셋 확대/축소
- 좌우 반전
- 배경, 그림자, 이펙트, 텍스트, UI 추가
- 1개의 프레임을 새 캐릭터처럼 다시 생성
- 간격 보정을 위해 캐릭터 신체 일부를 늘리거나 줄이기
- AI 이미지 모델이 임의로 다시 그리게 맡기는 방식

## 핵심 원칙

1. **기술 에셋 우선**: 포스터, 콘셉트 아트, 스토리보드가 아니라 게임용 스프라이트 시트로 취급한다.
2. **픽셀 보존 우선**: 이미 승인된 프레임은 redraw하지 말고 cut-and-paste로 이동한다.
3. **중심 간격 우선**: 프레임 간 시각적 간격은 bounding box의 중심점 간 거리로 판단한다.
4. **기준선 고정**: 발바닥 기준선 또는 루트 앵커의 Y 위치를 일정하게 유지한다.
5. **순서 보존**: 1→2→3→4→5의 시간 순서를 절대 바꾸지 않는다.
6. **스케일 보존**: 간격 보정을 위해 에셋을 축소/확대하지 않는다.
7. **불가 시 중단**: 원본 캔버스 안에서 보정하면 잘리는 경우, 캔버스 확장 또는 전체 평행 이동을 제안한다.

## Resource Routing

세부 절차는 references에 있다. 작업 전에 해당하는 것을 읽는다.

| 파일 | 언제 읽나 |
|---|---|
| `references/spacing-algorithm.md` | 간격·기준선·셀 배치를 계산할 때. 중심 간격 등차수열 수식과 캔버스 확장 우선순위 |
| `references/prompt-templates.md` | 이미지 편집 모델에 지시하거나 새 시트를 생성할 때 |
| `references/qa-and-failures.md` | 결과를 승인/반려할 때, 그리고 재생성·잘림·기준선 흔들림 같은 실패에 대응할 때 |

## 최종 보고 형식

작업 후 사용자에게 다음처럼 간단히 보고한다.

```text
완료했습니다.
- 프레임 수: 5개 유지
- 기준 간격: 4번↔5번 중심 간격 D = ___px
- 수정: 1·2·3번 에셋을 D 간격에 맞춰 재배치
- 보존: 모양, 스케일, 기준선, 순서, 프레임 내용, 투명 배경
- 검증: 인접 중심 간격 최대 오차 ___px
- 결과 파일: [경로]
```
