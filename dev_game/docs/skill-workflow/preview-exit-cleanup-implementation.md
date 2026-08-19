# 구현 기록 — preview-exit-cleanup

## 왜 오염이 계속 만들어졌나

앞 task(`preview-identity-guard`)는 게이트가 **남의 서버를 검사하는 것**을 잡았다. 그런데 그
유령 서버가 어디서 오는지는 닫지 않았다. 이 task가 그 근원을 닫는다.

`production-gate.mjs`의 헬퍼는 이렇다.

```js
function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (result.status !== 0) process.exit(result.status || 1);   // ← try/finally를 건너뛴다
}
```

브라우저 게이트(visual-layout, scene-composite)는 프리뷰를 띄운 `try` 블록 **안에서** `run()`으로
불린다. 그래서 그 게이트가 하나라도 실패하면 `process.exit()`이 즉시 프로세스를 끝내고,
`finally`의 `stopPreview()`가 **실행되지 않는다.** detached로 띄운 프리뷰는 고아가 되어 포트를
계속 잡는다.

실측(2026-08-19):

```
$ npm --prefix dev_game run factory:production-gate -- \
    --project dev_game/generated/last-light-zero-hour --require-gpt-imagegen --viewports 1x1
gate exit=1
$ lsof -nP -iTCP -sTCP:LISTEN | grep :4325
54331 127.0.0.1:4325        ← 고아 프리뷰
```

오늘 이 유령이 세 번 관측됐다: 전날 세션이 남긴 것(4325·4173), keeper 재게이팅이 남긴 것
(pid 74978/75012, ppid 1로 재부모화), 그리고 위 재현. 앞 두 개는 각각 그 다음 게이트 실행을
오염시켰다.

## 무엇을 넣었나

종료 경로가 몇 개든 한 곳에서 정리하도록 exit 훅을 건다. `'exit'` 핸들러에서는 비동기 작업이
실행되지 않으므로 **동기 kill만** 쓴다.

```js
const killPreviewGroup = () => {
  if (!preview || preview.exitCode !== null || previewDead) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(-preview.pid, 'SIGKILL'); } catch { try { preview.kill('SIGKILL'); } catch {} } }
};
process.on('exit', killPreviewGroup);
```

`finally`의 graceful `stopPreview()`는 그대로 둔다 — 정상 경로는 SIGTERM으로 먼저 부탁하고,
이 훅은 그 밖의 모든 경로(process.exit·미포착 예외)를 덮는 마지막 그물이다.

## 대조군

같은 실패를 다시 만들어 포트를 확인한다.

```
$ npm --prefix dev_game run factory:production-gate -- \
    --project dev_game/generated/last-light-zero-hour --require-gpt-imagegen --viewports 1x1
gate exit=1
$ lsof -nP -iTCP -sTCP:LISTEN | grep :4325
(없음)
```

배선은 `production-pass-receipt-qa.mjs`가 고정한다 — exit 훅이 없거나 첫 브라우저 게이트 뒤로
밀리면 RED다. 대조군 문구를 지워도 통과하지 않도록 기존 배선 검사와 같은 자리에 넣었다.

## 왜 custom-loop-full-qa는 안 고쳤나

그 스크립트의 `run()`은 `throw`한다. 예외는 `try/finally`를 통과하므로 프리뷰 종료가 실행되고,
그 종료는 앞 task에서 이미 프로세스 그룹 종료로 바꿨다. 같은 결함이 없으므로 손대지 않았다.
