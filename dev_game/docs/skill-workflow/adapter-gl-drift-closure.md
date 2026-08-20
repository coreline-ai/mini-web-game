# 어댑터 GL 되돌림의 PASS drift 종결 (2026-08-20)

## 무엇이 drift였나

`revert-adapter-gl`이 PASS로 봉인된 뒤 `verify-all`이 이렇게 냈다.

```
[E_PASS_DRIFT] revert-adapter-gl PASS 이후 승인 범위가 변경됐다:
  dev_game/generated/{firebreak-commander,keeper-last-light,last-minute-keeper,skybreak-gunship}/qa/_browser-args.mjs
```

게이트가 옳다. 그 네 파일은 **작업 트리에서만 지운 상태로 PASS**를 올렸고, 그 시점에는 아직
인덱스/HEAD에 남아 있어 스냅샷이 `MISSING`으로 봉인했다. 삭제를 커밋하자 git 목록에서 사라져
봉인된 키가 없어졌다 — 승인 범위가 PASS 이후에 바뀐 것이다.

## 이미 기록돼 있던 교훈이었다

`lastlight-fx-regen-implementation.md`에 같은 패턴이 적혀 있다.

> 교훈: **PASS 로 올리기 전에 작업 트리를 "커밋할 상태" 와 정확히 일치시킨다.** 스테이징 시점에
> 하는 정리(`git rm --cached` 등)는 PASS 이후의 변경이 되어 반드시 drift 를 만든다.

파일 삭제도 같다. `git rm`으로 **삭제를 스테이징한 뒤** PASS를 올려야 스냅샷과 커밋이 일치한다.
그 문서를 읽고도 같은 실수를 했다 — 그래서 이번에는 삭제 케이스를 명시해 남긴다.

## 규칙 (다음 사람에게)

승인 범위 안의 파일을 **지우는** 작업이라면:

1. `git rm <path>` 로 삭제를 스테이징한다 (작업 트리 삭제만으로 끝내지 않는다)
2. 그 상태에서 `advance --to PASS`
3. 그다음 커밋

순서를 바꾸면 커밋이 봉인을 깨고, 그 drift는 supersede로만 닫힌다(이 문서가 그 예다).

## 이 종결의 범위

- 이 task는 위 drift를 기록하고 대체한다. `qa/` 디렉터리는 **다시 봉인하지 않는다** — 더 바꿀
  것이 없고, 봉인해 두면 다음 게이트 실행이 또 같은 문턱에 걸린다.
- 네 게임의 영수증은 이 task 밖에서 재발급한다(게이트 실행이 쓰는 파일을 범위에 넣으면
  PASS 이후 자기 봉인을 깨는 순환이 된다 — 오늘 `skybreak-adapter-gl`에서 겪었다).
