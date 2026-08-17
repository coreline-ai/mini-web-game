# 프롬프트 템플릿

이미지 편집 모델에 넣을 지시문과 신규 시트 생성 프롬프트 기본형.

> **dev_game 예외:** 이 템플릿의 `transparent background`는 standalone 호스트용이다. dev_game의
> 새 픽셀은 이 스킬에서 생성하지 않고 `game-feel-motion-skill` 설계 PASS 뒤 `game-factory`
> Path A/B로 넘긴다. 그 경로는 `dev_game/docs/ai-art-pipeline.md` 규칙 2에 따라 flat 마젠타
> 크로마키와 provenance를 적용한다. 승인 프레임의 cut-and-paste 교정은 계속 이 문서를 쓴다.

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
