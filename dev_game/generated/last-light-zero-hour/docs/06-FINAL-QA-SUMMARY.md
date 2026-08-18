# 최종 QA 요약 — last-light-zero-hour

## 2026-08-18 · production-demo 통과

이 게임은 그동안 production-demo 게이트를 통과한 적이 없었다. 네 가지가 겹쳐 있었다.

| 증상 | 분류 | 근본 원인 | 수정 |
|---|---|---|---|
| `fx-rocket-explosion-v1 hf 7.08 > 6` | L (asset fidelity) | 자산이 과하게 거칠다 | 저주파 지향 프롬프트로 재생성 (1024x1024 PNG) |
| 재생성 시 `width 384 < minWidth 1024` | L | 런타임 내보내기가 fx 를 384 로 축소 — 이 게임은 풀사이즈 PNG 배송 모델이다 | `--no-runtime-export` 로 기존 모델 유지 |
| 브라우저 게이트 404, canvas 0 | N (first-play) | 빌드에 Pages 절대 base 가 박혀 로컬 preview 가 번들을 못 찾음 | `vite.config.js` `base: './'` — Pages 서빙 경로에서도 동일하게 해석된다 |
| `loading-bar-back ↔ loading-bar-fill` 겹침 | C (UI 모호성) — **오탐** | 진행 바 fill 이 track 안에 있는 것은 설계. 검사기의 `allowOverlapWith` 를 `LayoutRegistry` 가 전달하지 않았다 | 두 씬에서 쌍별 예외 선언 + 레지스트리가 필드 전달 |
| `weapon-gatling/rail` 안전 여백 초과 | C | 카드 x 하드코딩(`152 + i*284`) — 논리 폭 1440 기준 여백 27px 는 390 뷰포트에서 7.3px 로 요구치 8px 미달 | 폭에서 계산(여백 36), 카드 수 변화에도 유지 |

### 게이트 결과

```
factory:production-demo-qa    OK
factory:image-quality-qa      OK (12 assets)
factory:visual-layout-qa      OK (390x844 / 430x932 / 1080x1920)
factory:scene-composite-qa    OK
factory:production-gate       exit 0
→ dev_game/docs/qa-evidence/last-light-zero-hour-production-pass.json
   state: pass · gateProfile: compatibility
```

### 회귀 주의

- 이 게임은 fx 를 **풀사이즈 PNG** 로 배송한다. `factory:imagegen` 을 쓸 때
  `--no-runtime-export` 를 빠뜨리면 384 WebP 로 바뀌어 `minWidth 1024` 에 걸린다.
- `base` 를 절대 경로로 되돌리면 로컬 브라우저 게이트가 다시 통과 불가능해진다.
