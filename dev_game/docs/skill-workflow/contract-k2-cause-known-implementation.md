# 구현 기록 — contract-k2-cause-known

## 왜

계약 K-2는 어제 승격될 때 원인 축을 "미확정"으로 적었다. 그 판단은 그 시점에 옳았다 — 세 가설이
재측정에서 배제된 상태였기 때문이다. 그런데 `gate-boot-diagnostics`가 계측을 붙여 **원인을
확정했다.** 계약에 "미확정"이 남아 있으면 다음 세션이 이미 답이 나온 질문을 다시 판다.

## 무엇을 바꿨나

| 항목 | 이전 | 이후 |
|---|---|---|
| 가설 표의 마지막 줄 | "게이트 도구 자체 — **미확정**" | "도구가 쓰던 소프트웨어 GL 경로 — **확정(2026-08-20)**", 근거 값과 측정치 포함 |
| 처방 | 없음(원인 미확정) | `--use-angle=swiftshader` 기본, `GAME_QA_GL=gl`로 복귀 가능, 남은 곳(게임 어댑터) 명시 |
| 진단 순서 2단계 | "도구를 계측한다"까지 | 계측이 최소로 남겨야 할 다섯 값을 명시: `rafTicks`, `loop.running/frame`, `glLost/glError`, 로더 진행률, 활성 씬 |

마지막 줄이 이 갱신의 핵심이다. "계측하라"는 지시는 무엇을 남길지 말하지 않으면 다시 추측으로
돌아간다. 그 다섯 값이 "죽었다 / 느리다 / 루프 미시작"을 서로 가른다 — 오늘 실제로 가른 값들이다.

## 확정 근거 (계약 본문에 인용된 값)

```
loading-wait 10003ms 실패 시점 진단:
  scene=(none) game=booted renderType=2 canvas=1170x2532
  glLost=false glError=0 active=[] rafTicks=725 loop=stopped frame=0 visibility=visible

GL 경로 비교: --use-gl=swiftshader 9/10  vs  --use-angle=swiftshader 22/22
             scene-composite 픽셀 검사 12/12 (렌더러 교체가 판정을 흔들지 않음)
```

## 남긴 것

게임 어댑터(`qa/_helpers.mjs`)의 하드코딩은 이 task도 고치지 않는다. 계약에 "아직 남은 곳"으로
적어 다음 사람이 그 사실을 알고 시작하게 했다.
