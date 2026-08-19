# 구현 기록 — gate-deterministic-install

## 결함

게이트는 브라우저 단계 직전에 게임 의존성을 설치한다. 그 명령이 `npm install`이었다.

`npm install`은 lockfile을 **고칠 권한을 가진 명령**이고, 환경에 따라 실제로 고친다.
실측(2026-08-19, node 24 + npm 11) — castle-archer 게이트 실행이 남긴 diff:

```
 dev_game/generated/castle-archer/package-lock.json | 21 ---------------------
 1 file changed, 21 deletions(-)
-    "node_modules/@types/node": { ... optional, peer ... }
-    "node_modules/undici-types": { ... optional, peer ... }
```

그리고 lockfile은 영수증 지문에 **포함된다** — canonical snapshot은 루트의 `dist/`,
`qa-captures/`, `node_modules/`만 제외한다. 그래서 순서가 이렇게 된다.

1. 게이트가 `npm install`을 돌린다 → lockfile이 바뀐다
2. QA가 통과한다 → 영수증이 **바뀐 lockfile**을 봉인한다
3. 누군가 트리를 정리한다(`git checkout`) → 지문이 어긋난다 → 영수증이 `stale`

오늘 `castle-archer`·`road-stream-racer`가 stale이던 원인이 정확히 이것이다. 게임은 바뀌지
않았다 — 게이트가 자기 실행 중에 **지문 입력을 바꿨다.** 그때는 영수증과 lockfile을 한 커밋에
묶어 봉합했지만(4d475bf), npm/node 버전이 다른 환경에서 게이트를 돌리면 같은 일이 반복된다.

## 무엇을 넣었나

`lib/npm-install.mjs` — `depsInstallArgs(projectDir)`. 한 줄 계약이다.

```
lockfile이 있으면  ['ci', '--silent']       lockfile을 읽기만 한다
lockfile이 없으면  ['install', '--silent']  생성해야 한다
```

무조건 `ci`로 바꾸지 않은 이유: `browser-smoke`는 **즉석에서 생성한 스캐폴드**에 설치한다
(`.tmp/browser-smoke/poop-dodge-browser`). 방금 만든 프로젝트에는 lockfile이 없고, `npm ci`는
없는 lockfile에 실패한다. 없는 파일을 요구하는 검사는 대상이 아니라 검사가 틀린 것이다.

호출부 4곳을 모두 이 계약으로 바꿨다 — `production-gate`, `visual-layout-qa`,
`scene-composite-qa`(둘은 `--project`로 단독 실행할 때 설치한다), `browser-smoke`.

## 사전 점검

전 게임의 lockfile이 `package.json`과 동기인지 먼저 쟀다. 어긋난 게임이 하나라도 있으면
`npm ci`는 거기서 실패하므로, 20개 중 하나에 지뢰를 놓는 일이 된다.

```
$ for g in <20 games>; do (cd $g && npm ci --dry-run); done
20/20 통과 (실패·경고 없음)
$ time npm ci --silent      # last-minute-keeper
2.068 total                 # 작업 트리 변경 0건
```

## 대조군

| 대조군 | 무엇을 증명하나 |
|---|---|
| `depsInstallArgs(빈 디렉터리)` → `install --silent` | 스캐폴드 경로가 살아 있다 |
| `depsInstallArgs(lockfile 있는 디렉터리)` → `ci --silent` | 실제 게임은 결정적 경로를 쓴다 |
| `production-gate`·`custom-loop-full-qa` 소스에 `['install', '--silent']`가 없다 | 되돌리면 RED |
| `production-gate`가 `depsInstallArgs(projectDir)`를 부른다 | 공용 계약을 우회하지 못한다 |

`browser-smoke`는 이 변경 뒤 실제로 완주했다(`Browser smoke OK`) — lockfile 없는 경로가
동작한다는 실행 증거다.

## 남는 것

게이트를 완주시켜 "실행 후 lockfile 변경 0건"을 확인하는 일은 이 task가 PASS로 봉인된 뒤에
한다. 활성 task 동안에는 `verify-all`이 빨라 `factory:qa`가 통과할 수 없다(실측: 이 확인을
먼저 시도했더니 foundation에서 막혔다). 결과는 이 문서가 아니라 그때의 영수증과 `git status`가
증명한다.
