---
name: game-asset-creation
description: Create, edit, validate, and QA 2D game sprite assets and sprite sheets, especially 1990s arcade fighting game character animation sheets. Use when Codex needs to generate or edit game animation assets, fix sprite-sheet spacing/alignment, preserve character identity, normalize frame cells, or formalize prompts for image editing tasks such as repositioning 5 completed animation assets so assets 1-3 match the center-to-center spacing of assets 4-5 without changing shape, scale, baseline, order, or frame content.
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

## 정확한 간격 보정 알고리즘

### 용어

- `N`: 전체 에셋 개수. 예: 5
- `B_i`: i번째 에셋의 투명하지 않은 픽셀 bounding box
- `cx_i`: i번째 에셋의 bounding box 중심 X 좌표
- `cy_i`: i번째 에셋의 bounding box 중심 Y 좌표
- `base_i`: i번째 에셋의 발바닥 기준선 Y 좌표
- `D_ref`: 기준 중심 간격
- `P_i`: i번째 에셋을 새 위치에 붙일 목표 중심점

### 5개 에셋에서 1·2·3번이 너무 붙은 경우

1. 이미지에서 5개의 독립 에셋을 분리한다.
2. 각 에셋의 투명하지 않은 픽셀 bounding box `B_1`부터 `B_5`까지 계산한다.
3. 각 bounding box의 중심 X 좌표를 계산한다.

```text
cx_i = (B_i.left + B_i.right) / 2
```

4. 4번과 5번 에셋의 중심 간격을 기준값으로 사용한다.

```text
D_ref = cx_5 - cx_4
```

5. `D_ref`가 0 이하이거나 너무 작으면 실패로 처리한다. 이 경우 4·5번도 기준 간격으로 사용할 수 없으므로 사용자에게 기준 셀 폭 또는 원하는 픽셀 간격을 물어본다.
6. 4번과 5번 에셋은 가능하면 현재 위치에 고정한다.
7. 1·2·3번 에셋의 목표 중심 X 좌표를 다음처럼 계산한다.

```text
P_4.x = cx_4
P_5.x = cx_5
P_3.x = cx_4 - 1 * D_ref
P_2.x = cx_4 - 2 * D_ref
P_1.x = cx_4 - 3 * D_ref
```

동일하게 표현하면 다음과 같다.

```text
P_i.x = cx_4 - (4 - i) * D_ref    for i = 1, 2, 3
```

8. 각 에셋의 Y 위치는 기준선에 맞춘다. 기본값은 4번과 5번 기준선의 평균이다.

```text
B_ref = round((base_4 + base_5) / 2)
P_i.y_offset = B_ref - base_i
```

9. 각 에셋을 원본 픽셀 그대로 잘라 투명 캔버스에 다시 붙인다.
10. 붙일 때 스케일, 회전, 변형, 리터치, 샤픈, 블러를 적용하지 않는다.
11. 재배치 후 중심 간격이 다음을 만족해야 한다.

```text
cx_2' - cx_1' = D_ref
cx_3' - cx_2' = D_ref
cx_4' - cx_3' = D_ref
cx_5' - cx_4' = D_ref
```

12. 원본 캔버스 크기에서 1번 에셋이 왼쪽으로 잘리면 다음 순서로 해결한다.

- 1순위: 투명 캔버스를 왼쪽으로 확장한다.
- 2순위: 1~5번 에셋 전체를 오른쪽으로 같은 거리만큼 평행 이동한다.
- 3순위: 사용자가 캔버스 크기 고정을 요구하면 수정 불가 사유를 보고하고 원하는 간격을 재확인한다.

### 일반화 알고리즘

마지막 두 프레임의 간격을 기준으로 전체 프레임을 등간격 보정할 때는 다음을 사용한다.

```text
D_ref = cx_N - cx_(N-1)
P_i.x = cx_N - (N - i) * D_ref    for i = 1..N
```

또는 `N-1`번째 프레임을 고정 앵커로 쓸 때는 다음을 사용한다.

```text
P_i.x = cx_(N-1) - ((N-1) - i) * D_ref    for i = 1..N-1
P_N.x = cx_N
```

기본값은 **마지막 두 프레임을 기준으로 전체 중심점을 등차수열로 만드는 방식**이다.

## 셀과 가상 직사각형 규칙

사용자가 “동일한 가상의 직사각형 중앙에 연속된 동작 이미지 에셋이 나오게 해줘”라고 요청하면 다음처럼 해석한다.

- 각 프레임은 동일한 크기의 보이지 않는 셀을 가진다.
- 각 캐릭터 에셋은 자기 셀 안의 동일한 기준 위치에 배치된다.
- 셀 사이 간격은 일정하다.
- 캐릭터의 발바닥 기준선은 모든 셀에서 같은 Y 좌표에 놓인다.
- 캐릭터의 루트 앵커는 보통 양발 사이 중앙 또는 몸통 중심 하단으로 둔다.
- 셀 경계선, 숫자, 가이드 라인은 최종 이미지에 넣지 않는다.

5프레임 256×256 시트라면 기본 구조는 다음과 같다.

```text
총 캔버스: 1280 x 256
셀 1: x 0~255
셀 2: x 256~511
셀 3: x 512~767
셀 4: x 768~1023
셀 5: x 1024~1279
각 셀 중심: 128, 384, 640, 896, 1152
중심 간격: 256px
```

하지만 사용자가 기존 이미지의 4·5번 간격을 기준으로 하라고 하면, **고정 셀 폭보다 4·5번의 실제 중심 간격을 우선한다**.

## 이미지 편집 프롬프트 템플릿

이미지 편집 모델에 지시할 때는 다음 템플릿을 사용한다. 가능하면 기존 이미지를 첨부하고, “redraw 금지 / reposition only”를 반복한다.

```text
Edit the supplied completed sprite-sheet image only by repositioning existing sprite assets.
Do not redraw, regenerate, repaint, redesign, resize, rotate, mirror, or restyle any sprite.

The image contains exactly 5 animation assets arranged from left to right.
Assets 1, 2, and 3 are too close together horizontally.
Assets 4 and 5 have the correct horizontal spacing.

Task:
Reposition assets 1, 2, and 3 so that the center-to-center horizontal spacing between every adjacent asset matches the current center-to-center spacing between assets 4 and 5.

Use this spacing rule:
- Measure the center X position of asset 4.
- Measure the center X position of asset 5.
- Let D = centerX(asset 5) - centerX(asset 4).
- Keep assets 4 and 5 fixed if possible.
- Move asset 3 so centerX(asset 3) = centerX(asset 4) - D.
- Move asset 2 so centerX(asset 2) = centerX(asset 4) - 2D.
- Move asset 1 so centerX(asset 1) = centerX(asset 4) - 3D.

Preserve exactly:
- each asset's shape
- pixel content
- pose
- scale
- costume
- facial features
- colors
- baseline
- order
- animation frame meaning
- transparent background

Do not add:
- new drawings
- new frames
- missing frames
- extra characters
- background
- floor
- cast shadow
- impact effects
- motion blur
- text
- labels
- frame numbers
- grid lines
- borders
- UI

If the corrected positions do not fit inside the current canvas, expand only the transparent canvas or shift all 5 assets together while preserving the exact same center-to-center spacing. Never shrink or distort the sprites.

Final result must still contain exactly 5 assets, in the same order, with equal center-to-center spacing based on the original spacing between assets 4 and 5.
```

### 한국어 편집 지시문

```text
첨부된 완성 스프라이트 시트에서 기존 캐릭터 에셋을 다시 그리지 말고 위치만 수정해줘.

이미지에는 왼쪽부터 오른쪽으로 정확히 5개의 연속 동작 에셋이 있다.
현재 1번, 2번, 3번 에셋의 좌우 간격이 너무 붙어 있다.
4번과 5번 에셋의 좌우 간격은 올바른 기준 간격이다.

수정 규칙:
- 4번 에셋 중심 X와 5번 에셋 중심 X의 차이를 기준 간격 D로 삼는다.
- 가능하면 4번과 5번 에셋은 고정한다.
- 3번 에셋 중심은 4번 중심에서 D만큼 왼쪽에 둔다.
- 2번 에셋 중심은 4번 중심에서 2D만큼 왼쪽에 둔다.
- 1번 에셋 중심은 4번 중심에서 3D만큼 왼쪽에 둔다.

반드시 보존할 것:
- 각 에셋의 모양
- 포즈
- 픽셀 내용
- 크기와 스케일
- 캐릭터 디자인
- 발바닥 기준선
- 프레임 순서
- 프레임의 동작 의미
- 투명 배경

금지:
- 캐릭터 다시 그리기
- 캐릭터 변형
- 확대/축소
- 회전
- 좌우 반전
- 새 프레임 추가
- 프레임 삭제
- 배경, 그림자, 이펙트, 텍스트, 번호, 그리드 추가

현재 캔버스에 맞지 않으면 투명 캔버스만 확장하거나 5개 에셋 전체를 같은 거리만큼 평행 이동해라. 캐릭터 자체를 줄이거나 늘리지 마라.
```

## 새 스프라이트 생성 프롬프트 기본형

새 동작 시트를 생성할 때는 다음 구조를 사용한다.

```text
STRICT TECHNICAL ASSET PRIORITY

This is not concept art.
This is not a poster.
This is not a storyboard.
This is a technical game sprite asset intended for direct use in a 2D game.

Using the exact same approved [CHARACTER_NAME] reference character, create a production-ready [ACTION_NAME] animation sprite sheet.

Create exactly [FRAME_COUNT] sequential frames in one horizontal row.
Each frame must be centered in an identical invisible rectangle cell.
The center-to-center spacing between adjacent character assets must be consistent.
The feet must stay aligned to the same horizontal baseline.
The root anchor must remain fixed relative to each cell.

Animation sequence:
1. [FRAME_1_DESCRIPTION]
2. [FRAME_2_DESCRIPTION]
3. [FRAME_3_DESCRIPTION]
...

Layout:
- exactly [FRAME_COUNT] equal cells
- each cell [CELL_WIDTH] x [CELL_HEIGHT] pixels
- total canvas [TOTAL_WIDTH] x [CELL_HEIGHT] pixels
- transparent background
- no grid lines
- no labels
- no text
- no frame numbers
- no border

Consistency:
- identical character identity in every frame
- identical body proportions
- identical costume, colors, face, hair, and accessories
- fixed scale
- fixed baseline
- fixed root anchor
- no camera movement
- no perspective change
- no added visual effects

Priority:
Frame-count accuracy, character identity consistency, fixed scale, fixed baseline, fixed root anchor, and equal spacing are more important than dramatic motion.
Do not add anything that was not explicitly requested.
```

## 검증 기준

완료 후 다음 기준을 모두 확인한다.

| 항목 | 통과 기준 |
|---|---|
| 프레임 수 | 요청한 수와 정확히 일치. 5프레임 요청이면 정확히 5개 |
| 순서 | 왼쪽에서 오른쪽으로 1→2→3→4→5 유지 |
| 중심 간격 | 모든 인접 중심 간격이 `D_ref`와 같음. 허용 오차 1~2px 또는 1% 이하 |
| 기준선 | 발바닥 기준선 Y 편차 1~2px 이하 |
| 스케일 | 각 에셋의 크기와 비율이 원본과 동일 |
| 형태 보존 | 픽셀 내용, 포즈, 의상, 얼굴, 색상이 변하지 않음 |
| 배경 | 투명 배경 유지 |
| 겹침 | bounding box가 서로 겹치지 않음 |
| 잘림 | 머리, 손, 발, 의상 끝이 잘리지 않음 |
| 불필요 요소 | 텍스트, 번호, 그리드, 배경, 그림자, 이펙트 없음 |
| 사용성 | 게임 엔진에서 프레임별 crop이 가능함 |

## QA 체크리스트

작업이 끝나면 다음을 짧게 보고한다.

- [ ] 원본 프레임 수를 확인했다.
- [ ] 4·5번 에셋의 중심 간격을 기준값으로 측정했다.
- [ ] 1·2·3번 에셋을 기준 간격에 맞춰 재배치했다.
- [ ] 4·5번 에셋을 고정하거나, 필요 시 전체를 같은 거리만큼 평행 이동했다.
- [ ] 에셋의 스케일을 변경하지 않았다.
- [ ] 에셋의 픽셀 내용과 포즈를 변경하지 않았다.
- [ ] 발바닥 기준선을 유지했다.
- [ ] 프레임 순서를 유지했다.
- [ ] 투명 배경을 유지했다.
- [ ] 잘림, 겹침, 새 요소 추가가 없는지 확인했다.
- [ ] 수정 전후 중심 좌표 또는 간격을 기록했다.

## 실패 사례와 대응

### 실패: 이미지 모델이 캐릭터를 다시 그림

대응:
- “Do not redraw. Reposition only.”를 프롬프트 첫 줄과 마지막 줄에 반복한다.
- 가능하면 이미지 모델 대신 Python/Pillow, ImageMagick 등으로 cut-and-paste 편집을 수행한다.

### 실패: 5개가 아니라 6개 이상 프레임이 생김

대응:
- 결과를 실패로 처리한다.
- “exactly 5 assets, no extra frames”를 명시하고 재시도한다.
- 추가 프레임을 자르는 것이 아니라 원래 5프레임 구성으로 다시 편집한다.

### 실패: 1번 에셋이 왼쪽으로 잘림

대응:
- 투명 캔버스를 왼쪽으로 확장한다.
- 또는 1~5번 전체를 오른쪽으로 같은 거리만큼 평행 이동한다.
- 절대 캐릭터를 축소하지 않는다.

### 실패: 기준선이 흔들림

대응:
- 각 에셋의 발바닥 하단 Y 좌표를 측정한다.
- 기준 `B_ref`에 맞춰 각 에셋을 수직 이동한다.
- 점프/공중 동작이 아니라면 모든 발바닥 기준선은 같아야 한다.

### 실패: 4·5번 간격 자체가 부정확함

대응:
- `D_ref`를 사용하지 않는다.
- 사용자에게 원하는 셀 폭 또는 중심 간격을 묻는다.
- 예: “각 프레임 중심 간격을 256px로 맞출까요?”

### 실패: 원본 배경이 투명이 아님

대응:
- 배경 제거 가능 여부를 먼저 판단한다.
- 배경 제거가 캐릭터 픽셀을 손상시키면 사용자에게 원본 투명 PNG를 요청한다.

## 예시 명령

### 이미지 크기 확인

```bash
identify input.png
```

### 투명도 포함 PNG 정보 확인

```bash
magick identify -verbose input.png | grep -E "Geometry|Alpha|Matte"
```

### 5개 프레임의 목표 중심 좌표 계산

아래 예시는 4번 중심이 890px, 5번 중심이 1150px일 때 1~5번 목표 중심을 계산한다.

```bash
python3 - <<'PY'
cx4 = 890
cx5 = 1150
D = cx5 - cx4
targets = {
    1: cx4 - 3 * D,
    2: cx4 - 2 * D,
    3: cx4 - 1 * D,
    4: cx4,
    5: cx5,
}
print('D_ref =', D)
for i, x in targets.items():
    print(f'asset {i}: target center x = {x}')
PY
```

### bounding box JSON으로 간격 검증

```bash
python3 - <<'PY'
boxes = [
    {'left': 10, 'right': 150},
    {'left': 270, 'right': 410},
    {'left': 530, 'right': 670},
    {'left': 790, 'right': 930},
    {'left': 1050, 'right': 1190},
]
centers = [(b['left'] + b['right']) / 2 for b in boxes]
gaps = [centers[i+1] - centers[i] for i in range(len(centers)-1)]
print('centers:', centers)
print('gaps:', gaps)
print('max gap error:', max(gaps) - min(gaps))
assert max(gaps) - min(gaps) <= 2, 'center spacing is not even'
PY
```

### ImageMagick으로 새 투명 캔버스 만들기

```bash
magick -size 1280x256 canvas:none output_empty.png
```

### Python/Pillow cut-and-paste 편집 원칙

실제 자동 편집이 필요하면 다음 흐름을 구현한다.

```bash
python3 fix_sprite_spacing.py input.png output.png \
  --asset-count 5 \
  --reference-assets 4,5 \
  --preserve-scale \
  --preserve-baseline \
  --transparent-canvas expand-if-needed
```

구현 시 `fix_sprite_spacing.py`는 다음만 해야 한다.

- alpha 또는 배경 제거 결과로 에셋 bounding box를 찾는다.
- 각 에셋 crop을 원본 픽셀 그대로 보존한다.
- 목표 중심 좌표를 계산한다.
- 새 투명 캔버스에 crop을 붙인다.
- 스케일, 회전, 리샘플링을 하지 않는다.
- 수정 전후 중심점과 간격을 출력한다.

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
