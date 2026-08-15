# 검증 기준 · QA · 실패 대응

보정 결과를 승인하기 위한 수치 기준과, 자주 나오는 실패 6종의 대응.

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
