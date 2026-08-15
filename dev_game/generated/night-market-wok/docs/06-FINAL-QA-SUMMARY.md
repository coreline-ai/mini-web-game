# 06 · Final QA Summary — Night Market Wok

작성: 2026-08-15 · 호스트 어댑터: `claude-shellout` (`codex exec` 경유)

## 게이트 결과 (최종)

| 게이트 | 결과 |
|---|---|
| `factory:production-demo-qa --require-gpt-imagegen` | **OK** |
| `factory:image-quality-qa` | **OK** (20 assets, role-aware bar) |
| `factory:visual-layout-qa` (390×844 / 430×932 / 1080×1920) | **OK** |
| `factory:scene-composite-qa` (3 viewports) | **OK** |
| `factory:dist-runtime-qa` | **OK** — 25 assets, 1,210,738 / 16,777,216 bytes |
| `factory:hq-screen-quality-qa --skip-market-events` | **OK** |
| `factory:production-gate --skip-foundation` | **OK (전 구간)** |

## 장르 고유 회귀 (`scripts/cooking-loop-regression.mjs`)

`cooking-loop regression OK: 8 assertions`

| ID | 검사 | 결과 |
|---|---|---|
| G1 | 올바른 순서 탭이 단계를 진행 | OK |
| G2 | 레시피 완성이 서빙으로 이어짐 | OK |
| G3 | 틀린 순서는 그 그릇만 초기화(주문 유지, 실수 카운트) | OK |
| G4 | 오조작 5회로 즉사하지 않음 | OK |
| G5 | 인내심 소진이 스트라이크가 됨 | OK |
| G6 | 3스트라이크에서 종료 | OK |
| G8 | 좌석 중복/충돌 없음 (10사이클) | OK |
| EX | 콘솔/페이지 예외 없음 | OK |

## 아트 생성

- Path A(자동) · 20자산 전부 생성 · `qualityTier: production-demo` 승격
- **declared resample 3건** — 배경 네이티브 1080×1920 → 마스터 2160×3840, raw는 `assets/_source/stage-*-raw.png`에 보존, provenance에 `nativeSize`/`resampledTo`/`resampleMethod` 기록
- 런타임 배포는 §2.0.5 "런타임 권장" 규격 적용 — 1080×1920 WebP + 스프라이트 512px WebP, PNG 마스터는 `assets/_source/masters/`에 보존

## 캡처 후 수정한 결함 (기계 게이트가 잡지 못한 것)

| # | 증상 | 원인 | 수정 |
|---|---|---|---|
| 1 | player 스프라이트가 셀 경계에 잘림 | 4프레임 걷기 시트가 아케이드 템플릿 잔재 — 이 요리사는 걷지 않으며, 두 번 재생성해도 바깥 셀이 계속 잘림 | 단일 스프라이트로 교체하고 조리 반응을 트윈으로 구현 |
| 2 | 홈 타이틀이 세이프 마진을 벗어남 | 38px 폰트가 390px 폭에 과대 | 32px + wordWrap |
| 3 | `order-panel ↔ order-title` 겹침 실패 | 의도된 중첩(패널 위 라벨)인데 `publishLayout`이 `allowOverlapWith` 필드를 버리고 있었음 | LayoutRegistry가 선언 필드를 전달하도록 수정 + 중첩 선언 |
| 4 | 런타임 자산 26.6MB (예산 16MB 초과) | 2160×3840 PNG 마스터를 그대로 배포 | §2.0.5 런타임 권장 규격의 WebP로 변환 → 2.7MB |
| 5 | **두 좌석에 같은 손님·같은 주문** | 시작 티어가 2단계라 해당 레시피가 `기본 국수` 1종뿐 + 손님 유형 무작위 중복 | 시작 티어를 3단계로(레시피 4종) + 착석 시 유형·레시피 중복 회피 |

5번은 캡처를 눈으로 보지 않으면 발견할 수 없는 종류다. 모든 게이트가 GREEN인 상태에서도 화면은 "렌더링 버그"처럼 보였다.

## 캡처 증거

`qa-captures/` — 16개 (3 viewport × Loading/Home/Game/Pause/GameOver + before/after 비교)

- `390x844-game.png` — 수정 전(좌석 중복)
- `390x844-game-after.png` — 수정 후(유형·주문 구분)

## 남은 확장 여지 (비차단)

- 손님 3종의 차이가 인내심 배수뿐 — 유형별 고유 요구를 넣으면 깊어진다
- 레시피 6종 고정이라 장시간 플레이 시 반복감
- 티켓의 재료 아이콘 시각 크기가 원본 알파 bbox에 따라 미세하게 다름

---

# 후보정 세션 1 — 2026-08-15

**사용자 보고 (원문)**: "에셋이 너무 품질이 떨어지는데?"

**Step 0 회귀 재실행**: clean — `cooking-loop-regression` 8/8 OK (이전 수정 재파손 없음)

## 증상 → 분류 → 근본 원인

| # | 증상 | 클래스 | 심각도 | 근본 원인 |
|---|---|---|---|---|
| S1 | 화면 전체가 물러 보임 | **L · backing-store-too-small** | 3 (지배적 원인) | 논리 캔버스가 390×844여서 canvas backing store가 CSS 크기와 같음 → DPR2 기기에서 브라우저가 2배 확대. `backingScale 1 < min(dpr 2, maxTargetDpr 3)` |
| S2 | 스프라이트 외곽이 지저분한 검은 테두리 | **L · bad-background-removal** | 3 | `remove_chroma_key.py --edge-feather 2`가 1254px 원본에서 2px만 침식 → 안티에일리어싱 경계에 마젠타 오염 잔존. 경계 띠 R72 G17 B53(B/R 0.74)로 의도된 따뜻한 외곽선(B/R 0.26)과 구별됨 |
| S3 | 요리사 웍 옆 보라 반점 | **L · bad-background-removal** | 4 | 스프라이트 내부 잔여 크로마 화소 1,044px |
| S4 | 손님마다 나무 카운터가 붙어 떠 보임 | — | — | **결함 아님으로 재현 확인**. Class B는 "배경 아트가 런타임 스프라이트를 중복"할 때 성립하는데, 배경(`qa-captures/bg-customer-row.png`)은 손님 줄에 카운터를 제공하지 않는다 → 중복 없음 |
| S5 | (S1 수정 중 파생) stage-3 배경 선명도 미달 | **L · source-too-small** | 3 | 네이티브 1080×1920 → 마스터 2160 → 런타임 1440의 2단 리샘플 + 원본 자체가 흐림. 엣지분산 57.3 < 60 |

## 수정 (심각도 순)

**S1 — DPR backing store (Class L 규칙 3·4)**
논리 캔버스를 390×844 → **1170×2532**(정확히 3배, 규칙 4의 DPR3 목표)로 이관. 레이아웃은 390×844 디자인 단위로 유지하고 `tuning.js`의 `U = SPEC.canvas.width / 390`로 환산. 폰트 19곳·좌표/크기 30여 곳·버튼 크기(`makeTextButton` 내부 1회 환산)를 스케일. 배경 런타임을 1440×3120으로 재출력(캔버스 이상).
`backingScale 1 → 3` (요구 min(2,3)=2 충족)

**S2/S3 — 크로마 오염 (Class L 규칙 9)**
샤픈이나 CSS 필터가 아니라 **소스 수정**. 마스터 PNG에서 오염된 반투명 경계 띠를 3px 침식 후 1px 재페더링. 색을 되돌리지 않은 이유는 요리사의 빨간 두건·앞치마까지 탈색될 위험 때문. 내부 잔여 자홍 화소는 B가 높은 조건(빨간 아트는 B가 낮음)으로만 골라 G 수준으로 중화.
마젠타 편향 +50~62 → +1~18, 잔여 반점 1,536px → 1px

**S5 — 배경 선명도 (Class L 규칙 9)**
2단 리샘플을 네이티브 raw에서 1회로 축소(quality 94). stage-1/2는 통과했으나 stage-3은 여전히 59.3 → **재생성**(프롬프트에 엣지 정의 요구 추가). 엣지분산 **181.7**

## 증거 (before/after 쌍)

| 파일 | 내용 |
|---|---|
| `qa-captures/390x844-game-after.png` | BEFORE (세션 시작 상태) |
| `qa-captures/390x844-game-despill.png` | 크로마 수정 직후 |
| `qa-captures/390x844-game-final.png` | AFTER (DPR + 크로마 + 배경 전부 반영) |
| `qa-captures/zoom-inspect.png` | 최초 3배 확대 진단 |
| `qa-captures/despill-before-after.png` | 크로마 수정 before/after |
| `qa-captures/final-before-after.png` | 최종 before/after (요리사·티켓 2.2배) |
| `qa-captures/bg-customer-row.png` | S4를 결함 아님으로 판정한 근거 |
| `qa-captures/polish-1-samples.json` | 상태 샘플 |

## 상태 샘플 assert

```
browserErrors 0 · duplicateVisibleEntities 0 · seatConflicts 0
activeBgmInstances 0 (≤1) · cycles 10 · backingScale 3 · devicePixelRatio 2
```

## 게이트 (최종)

production-demo-qa · image-quality-qa(20자산) · visual-layout-qa(3뷰포트) · scene-composite-qa(3뷰포트) ·
dist-runtime-qa(1,855,414/16,777,216) · **hq-screen-quality-qa** · production-gate 전 구간 **OK**
장르 회귀 `cooking-loop-regression` **8/8 OK**

## 배운 것

기계 게이트가 전부 GREEN인 상태에서 사용자가 "품질이 떨어진다"고 지적했고, 그 지배적 원인(backingScale 1)은 **상태 샘플을 뜨기 전까지 어떤 게이트도 보고하지 않았다**. `hq-screen-quality-qa`는 manifest 자산 크기만 보고 실제 canvas backing store를 보지 않는다.
