# 07. Regression Checklist & Prevention Protocol

**Game Title**: Neon Parry: Blade Slasher (`neon-parry-slasher`)  
**Status**: Production-Demo Grade Verified

---

## 1. 🔍 과거 발견 결함 및 재발 방지 체크리스트

| 결함 번호 | 과거 발생 증상 | 근본 원인 | 재발 방지 조치 및 검증 방식 | 상태 |
|---|---|---|---|:---:|
| **REG-01** | 임시 초록색 버튼 노출 | 템플릿의 `MobileButton.js` 기본 색상 하드코딩 | 사이버펑크 네온 글래스모피즘 테마 버튼 토큰화 및 `UI_DIRECTION` 적용 | **RESOLVED** |
| **REG-02** | 캔버스 전면 흐림/블러링 | 390×844 캔버스가 브라우저에서 2.77배 강제 확대 | `SPEC.canvas`를 **Native FHD ($1080 \times 1920$)**로 승격 및 1:1 픽셀 렌더링 | **RESOLVED** |
| **REG-03** | 우주선(드론) 투명화 현상 | `SCREEN` 블렌드 모드 및 단순 밝기 키잉으로 금속 장갑 픽셀 훼손 | `NORMAL` 블렌드 모드 및 **외곽 테두리 Flood-Fill 100% 솔리드 마스킹** 적용 | **RESOLVED** |
| **REG-04** | 터치/타격 조작 판정 난항 | 작은 사거리(270px)와 각도 미세 오차로 인한 헛손질 | **직접 탭(Direct Tap)** 조준 지원, 사거리 **$460\text{px}$** 확장, **$\pm 55^\circ$ 오토에임 스냅** | **RESOLVED** |
| **REG-05** | 단조로운 단일 배경 | 단일 정적 배경으로 인한 세션 지루함 | **3단계 동적 배경 크로스페이드 트랜지션** (사이안 $\rightarrow$ 크림슨 노을 $\rightarrow$ 오로라) 구현 | **RESOLVED** |
| **REG-06** | 캐릭터 액션 정적 느낌 | 정적 이미지 회전으로 인한 부자연스러움 | **대기 / 쾌속 발도 슬래시 / 헥사곤 패링 가드 3단 상태 머신** 구현 | **RESOLVED** |

---

## 2. 🛡️ 자동화 검증 스크립트 실행 프로토콜

```bash
# 1. UI Art Direction 정합성 검사
npm run factory:ui-direction

# 2. CLI Schema 및 스펙 검사
npm run factory:cli-parity
node generator/src/cli.mjs --validate-only --spec generator/examples/neon-parry-slasher.spec.json

# 3. 프로덕션 빌드 무결성 검증
cd dev_game/generated/neon-parry-slasher && npm run build
```
