# 💩 Don't Get Pooped! — MVP

세로형 모바일 아케이드 회피 게임. 좌우로 움직여 떨어지는 똥을 피하며 생존한다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173 (개발, 핫리로드)
npm run build      # dist/ 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
```

## 조작
- **마우스 드래그 / 터치 좌우 이동** (한 손 플레이)
- 시작·재시작: 화면 **탭**

## 기술 스택
- **Phaser 3** + **Vite** (JavaScript / ESM)
- 논리 해상도 1080×1920, `Scale.FIT` + `CENTER_BOTH`
- Arcade Physics(overlap 충돌), 낙하물 **오브젝트 풀링**
- 에셋: `assets/`의 **SVG**를 표시 크기로 rasterize (벡터 → 어떤 해상도에서도 선명)

## 구조
```
index.html · vite.config.js (publicDir: assets)
src/
  main.js                 Phaser.Game + 씬 등록
  config/gameConfig.js    모든 튜닝 상수(난이도·점수·에셋 키)
  scenes/                 Boot → Start → Game → GameOver
  entities/Player.js      하단 15% 영역, 포인터 lerp 추종, 원형 히트박스
  systems/
    PoopSpawner.js        똥 오브젝트 풀 + 스폰/회수
    Difficulty.js         시간 기반 속도·간격·동시상한
    ScoreManager.js       생존/회피 점수 + best(localStorage)
```

## MVP 범위
포함: 좌우 이동, 똥 낙하+풀링, 충돌/게임오버, 생존+회피 점수, 최고점 저장, 시간 기반 난이도 상승.
제외(이후): 아이템·코인·상점·콤보·특수 똥·보스·사운드·광고. → [docs/impl-plan-mvp.md](docs/impl-plan-mvp.md), [docs/design-spec-supplement.md](docs/design-spec-supplement.md)

## 밸런스 조정
난이도·점수·크기 값은 전부 [src/config/gameConfig.js](src/config/gameConfig.js)에 모여 있다.
