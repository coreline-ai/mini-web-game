import fs from 'node:fs';
import path from 'node:path';

// 게이트가 게임 의존성을 설치하는 방법 — 한 곳에서 정한다.
//
// ── 왜 `npm install`이 문제인가 ──────────────────────────────────────────────
// `npm install`은 lockfile을 **고칠 권한을 가진 명령**이다. 환경에 따라 실제로 고친다.
// 실측(2026-08-19, node 24 + npm 11): castle-archer의 게이트 실행이 `package-lock.json`에서
// optional peer 항목 두 개(`@types/node`, `undici-types`, 21줄)를 지웠다.
//
// 그리고 lockfile은 영수증 지문에 **포함된다** — canonical snapshot은 루트의 `dist/`,
// `qa-captures/`, `node_modules/`만 제외한다. 그래서 순서가 이렇게 된다.
//
//   1. 게이트가 npm install을 돌린다 → lockfile이 바뀐다
//   2. QA가 통과한다 → 영수증이 **바뀐 lockfile**을 봉인한다
//   3. 누군가 트리를 정리한다(git checkout) → 지문이 어긋난다 → 영수증이 stale
//
// 오늘 castle-archer·road-stream-racer가 stale이던 원인이 정확히 이것이다. 게임은 바뀌지
// 않았고, 게이트가 자기 실행 중에 지문 입력을 바꿨을 뿐이다.
//
// `npm ci`는 lockfile을 **읽기만** 한다. 실측: 20개 게임 전부 `npm ci --dry-run` 통과,
// 실행 시간 2초, 작업 트리 변경 0건.
//
// ── 왜 무조건 ci가 아닌가 ────────────────────────────────────────────────────
// `npm ci`는 lockfile이 없으면 실패한다. 그런데 `browser-smoke`는 **즉석에서 생성한 스캐폴드**에
// 설치한다(`.tmp/browser-smoke/poop-dodge-browser`) — 방금 만든 프로젝트에는 lockfile이 없다.
// 없는 파일을 요구하는 검사는 대상이 아니라 검사가 틀린 것이므로, 경계를 여기 한 줄로 적는다:
// **lockfile이 있으면 ci(결정적), 없으면 install(생성).**
export function depsInstallArgs(projectDir) {
  const lockfile = path.join(projectDir, 'package-lock.json');
  return fs.existsSync(lockfile) ? ['ci', '--silent'] : ['install', '--silent'];
}
