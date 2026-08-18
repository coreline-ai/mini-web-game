# 독립 검토 — retire-legacy-pass

- reviewer: `production-pass-receipt-qa` (기계 판정)
- 판정: `PASS`

승인 근거는 의견이 아니라 대조군이다. 대조군은 구현과 같은 커밋에 있고, `legacy-pass` 분기를
되살리면 폐지 증명 대조군이 곧바로 빨갛게 된다.

```
$ node dev_game/generator/scripts/production-pass-receipt-qa.mjs
production PASS receipt QA OK: v1/v2 profiles, tracked receipt path, pass/stale/invalid/unknown,
src+asset staleness, forgery/schema/JSON/unverified-marker positives, retired legacy-pass
(allowlist entry + committed evidence must stay unknown), fingerprint exclusivity,
gate-start invalidation, gate/make wiring
```

## 검토자가 실제로 확인한 것

1. **판정이 바뀐 게임이 없다.** 폐지 전후로 20개 게임을 전수 측정했다: pass 16 / stale 0 /
   invalid 1 / unknown 3. 어떤 게임도 polish 자격을 잃거나 얻지 않았다. `legacy-pass`를 받던
   게임이 0개였기 때문이고, 그것이 이 변경의 전제다.
2. **자격이 이미 소멸했다는 것.** `iron-courier-last-line`은 커밋된 미검증 표식(9afe541)을
   갖고 있어 `invalid`다. 설계가 정한 대로 legacy 자격은 실패한 게이트 실행에서 소멸했다.
   이 task는 그 사실을 문서와 코드에 반영한 것이고, 사실을 만든 것이 아니다.
3. **자격이 파일 존재로 부활하지 않는다.** 폐지 증명 대조군은 allowlist 파일과 커밋된 증거를
   모두 갖춘 fixture에 unknown을 요구한다. 파일을 되살려도 자격은 돌아오지 않는다.
4. **표식 우선순위 불변.** 표식은 여전히 "영수증 없음"을 이기고(`invalid`), 유효한 현재
   영수증에는 진다(`pass`). `make-game`의 교착 방지 순서를 건드리지 않았다.
5. **썩은 참조 없음.** `grep -rn "legacy-pass"`로 남은 것은 폐지 이력을 설명하는 주석과
   과거 task 기록(skill-workflow/·dev-plan/)뿐이다. 후자는 그때의 사실이므로 고치지 않았다.

## 남는 위험

`unknown`이 늘어나면 "영수증 없음"이 곧 factory 라우팅이므로, 제도 이전에 만들어졌지만 실제로
품질이 충분한 게임이 있다면 polish 대신 factory로 간다. 그것은 손실이 아니라 정직함이다 —
현재성을 증명하는 유일한 수단이 게이트 실행이고, 그 실행은 한 번이면 끝난다.
