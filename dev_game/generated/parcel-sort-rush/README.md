# Parcel Sort Rush

택배 공장 컨베이어로 밀려오는 박스를 한 손 드래그로 올바른 분류 슈트에 보내는 모바일 세로형 분류 아케이드입니다.

## Build decision

- `custom-loop`
- 기존 dodge starter는 공통 Foundation으로만 사용했습니다.
- 핵심 gameplay는 `Parcel`, `ConveyorSystem`, `SortingSystem`으로 별도 구현했습니다.

## Run

```bash
npm install
npm run dev
npm run build
```

## Core gameplay

- 택배 라벨/색/아이콘 확인
- 4개 분류 슈트 중 올바른 곳으로 드래그
- 정분류 점수/콤보 증가
- 오분류/미분류 시 라이프 감소
- 35초마다 물량 러시 이벤트


## Production assets

- 모든 runtime asset은 이 게임 전용으로 새로 생성되어 `assets/images/production/**`, `assets/audio/production/**`에 저장됩니다.
- 공통/루트/다른 게임 에셋을 참조하지 않습니다.
- `assets/asset-manifest.json`의 `assetIsolation`과 `provenance`가 이를 검증합니다.
