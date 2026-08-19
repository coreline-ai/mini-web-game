# 구현 기록 — preview-identity-guard

## 무엇이 잘못돼 있었나

브라우저 게이트는 `--url http://127.0.0.1:<port>`만 받고, 그 포트에 **누가** 응답하는지는
아무도 확인하지 않았다. `production-gate.mjs`는 프리뷰를 이렇게 띄웠다.

```js
spawn(npm, ['run','preview','--','--port',String(port),'--strictPort'],
      { stdio: 'ignore', ... })   // 바인딩 실패가 버려진다
await waitForHttp(previewUrl)     // 남의 서버가 200을 주면 통과한다
```

실측(2026-08-19): 전날 세션(Aug 18 19:01 시작)이 남긴 `last-light-zero-hour` 프리뷰가 4325를
잡고 있었다. `--strictPort`는 제 일을 했다 — vite는 바인딩에 실패했다. 그런데 그 오류가
`stdio:'ignore'`로 사라지고, `waitForHttp`는 남아 있던 서버의 200을 받아 통과했다.

그 결과 오늘 돌린 게이트의 브라우저 단계가 대상 게임이 아닌 것을 검사했다.

| 게임 | 브라우저 단계가 실제로 본 것 | 결과 |
|---|---|---|
| castle-archer | last-light-zero-hour의 dist | 영수증 발급됨 (근거 무효) |
| road-stream-racer | 같음 | 영수증 발급됨 (근거 무효) |
| keeper-last-light | 같음 | 영수증 발급됨 (근거 무효) |
| last-light-zero-hour | 자기 자신 (같은 dist를 디스크에서 서빙) | 근거 유효 |

포트를 비우고 다시 돌리자 4개는 자기 자신을 검사해 통과했고, `keeper-last-light`는 처음
두 번 브라우저 단계에서 떨어진 뒤 세 번째에 통과했다(플레이키한 부팅은 이 task의 범위가 아니다 —
`--url`을 고정한 검사가 무엇을 봤는지 몰랐다는 것이 이 task의 결함이다).

`custom-loop-full-qa.mjs`에는 결함이 하나 더 있었다: 프리뷰에 `--strictPort`가 없어 포트가
점유되면 vite가 **다음 포트로 물러나는데** QA는 원래 포트를 계속 봤다. 그리고 종료가
`server.kill('SIGTERM')`이라 npm 래퍼만 죽고 vite 자식이 남았다 — 실측으로 4325·4173에
전날 세션의 프리뷰가 유령으로 남아 있었고, 그것이 위 오염의 원인이다.

## 무엇을 넣었나

`lib/preview-identity.mjs` — `assertPreviewServesProject(url, projectDir)`.
서버가 준비된 직후, 브라우저 게이트를 부르기 **전에** 한 번 부른다.

신원은 Vite가 빌드마다 새로 만드는 **해시 붙은 번들 참조**(`/assets/index-XXXXXXXX.js`)로 잰다.
게임마다 다르고 빌드마다 다르다(실측: 5개 게임의 `dist/index.html` 해시가 전부 다르다).
index.html 전체 바이트 비교는 서버가 헤더나 base를 손대면 정당한 실패를 만들므로 쓰지 않고,
번들 참조가 하나도 없을 때만 바이트 비교로 내려간다 — 검증 없이 통과시키지 않는다.

| 파일 | 변경 |
|---|---|
| `lib/preview-identity.mjs` | 신규. 신원 검증 + 이유를 담은 실패 메시지(점유 프로세스 찾는 명령 포함) |
| `production-gate.mjs` | 프리뷰 stderr를 `pipe`로 보관, 자식이 준비 전에 죽으면 `waitForHttp`가 즉시 실패, 준비 후 신원 검증 |
| `custom-loop-full-qa.mjs` | `--strictPort` 추가, stderr 보관, 신원 검증, 종료를 **프로세스 그룹** 종료로 바꿔 유령을 남기지 않는다 |
| `production-pass-receipt-qa.mjs` | 배선 대조군 8개 추가(두 게이트 × 신원검증 존재·브라우저 게이트보다 앞·strictPort·stderr 보관) |

## 대조군

배선은 grep으로, 동작은 실제 서버로 잰다.

```
$ node scratch/guard-control.mjs      # last-light-zero-hour 프리뷰를 4431에 띄우고
양성 대조 (남의 서버를 내 프로젝트로 검사):
  "preview at http://127.0.0.1:4431 is not serving this project's dist — another server holds the port."
음성 대조 (그 서버를 자기 프로젝트로 검사): ok

$ node dev_game/generator/scripts/production-pass-receipt-qa.mjs
production PASS receipt QA OK: ... gate/make wiring, preview identity guard
```

양성 대조가 이 task의 요점이다 — **오염을 재현한 뒤** 가드가 그것을 잡는 것을 확인했다.

## 남는 것

게이트를 실제로 한 번 완주시켜 행복 경로가 깨지지 않았음을 확인하는 일은 이 task가 PASS로
봉인된 뒤에 한다. 활성 task의 상태 파일이 봉인된 범위 안에 있어 `verify-all`이 빨간 동안에는
`factory:qa`가 통과할 수 없고, 그래서 게이트를 돌릴 수 없다. 그 확인 결과는 이 문서가 아니라
그때 발급되는 영수증이 증명한다.
