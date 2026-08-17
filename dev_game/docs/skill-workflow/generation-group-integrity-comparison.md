# 스킬·계약 정합성 비교 — generation-group-integrity

| 요구 | 실제 | 판정 |
|---|---|---|
| provenance는 실제 생성 근거를 기록한다 | 묶음을 쪼개는 재생성을 막아 거짓 관계가 남지 않게 함 | MATCH |
| 나쁜 아트는 재생성한다 (patch-around 금지) | 재생성을 막는 것이 아니라 **올바른 단위**로만 하게 함 | MATCH |
| 결함을 known gap으로 낮추지 않는다 | 묶음 프롬프트 분할은 사람의 일로 명시, 자동 추정 안 함 | MATCH |
| 추정을 사실로 기록하지 않는다 | art-prompts 블록↔묶음 연결은 해시로 재현되지 않아 붙이지 않음 | MATCH |

## Path A / Path B 대응

`ai-art-pipeline.md`의 두 경로가 실제 데이터에서 어떻게 다른지 확인됐다.

```
Path A (asset-plan → factory:imagegen)  자산마다 고유 promptHash  → 재생성 단위 = 자산
Path B (art-prompts → built-in image_gen) 시트 한 장에서 여러 자산 → 재생성 단위 = 묶음
```

스킬 문서는 이미 두 경로를 구분하고 있으며, 이 작업은 그 구분을 **도구가 강제**하게 만든다.
문서 변경은 없다.

## 판정
`MATCH`
