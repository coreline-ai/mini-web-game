# Parcel Sort Rush — QA Plan

## 자동 검증

```bash
node dev_game/generator/src/cli.mjs --validate-only --spec dev_game/generator/examples/parcel-sort-rush.spec.json
node dev_game/generator/scripts/asset-qa.mjs --project dev_game/generated/parcel-sort-rush
npm --prefix dev_game/generated/parcel-sort-rush install
npm --prefix dev_game/generated/parcel-sort-rush run build
```

## Browser gameplay smoke

1. 모바일 viewport 390x844에서 접속
2. canvas 렌더 확인
3. PLAY 클릭
4. GameScene 활성 확인
5. 첫 택배의 type과 matching bin 좌표를 JS에서 읽음
6. 마우스 드래그로 택배를 correct bin에 drop
7. score가 100 이상 증가하고 sorted count가 증가하는지 확인
8. console/page error 없음

## 수동 QA

- 라벨/색이 작은 화면에서 읽히는가
- 택배가 박스처럼 보이는가
- 슈트 4개가 서로 구분되는가
- 틀렸을 때 실패 이유가 명확한가
- 러시 이벤트가 압박감 있게 보이는가


## Production-demo gate

```bash
npm --prefix dev_game run factory:production-demo-qa -- --project dev_game/generated/parcel-sort-rush
npm --prefix dev_game run factory:visual-layout-qa -- --project dev_game/generated/parcel-sort-rush
npm --prefix dev_game run factory:production-gate -- --project dev_game/generated/parcel-sort-rush
```

추가 확인: manifest `assetIsolation.mode=per-game`, 모든 이미지/오디오 provenance `generated-for-game`, stage background 3종 이상, core gameplay SVG placeholder 0개, `window.__GAME_LAYOUT_BOUNDS__` registry 존재.

## 2026-07-05 visual QA 강화

`visual-layout-qa`는 Home → Game → Pause → GameOver를 모두 캡처한다. 또한 registry scene mismatch와 Image texture aspect distortion을 검사한다. 버튼처럼 눌림 상태가 있는 UI는 초기 scale을 저장한 뒤 곱셈 scale을 적용해야 하며, `setDisplaySize()`로 비균등 scale된 이미지를 `setScale(1)`로 되돌리는 방식은 금지한다.
