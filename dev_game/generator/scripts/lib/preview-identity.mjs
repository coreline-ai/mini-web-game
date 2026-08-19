import fs from 'node:fs';
import path from 'node:path';

// 프리뷰 서버 신원 검증 — "게이트가 무엇을 검사했는지"를 기계로 확인한다.
//
// ── 왜 필요한가 ──────────────────────────────────────────────────────────────
// 브라우저 게이트는 `--url http://127.0.0.1:<port>`만 받는다. 그 포트에 **누가** 응답하는지는
// 아무도 확인하지 않았다. 실측(2026-08-19): 전날 세션이 남긴 `last-light-zero-hour` 프리뷰가
// 4325를 잡고 있었고, `--strictPort`로 띄운 새 프리뷰는 바인딩에 실패했지만 그 오류가
// `stdio:'ignore'`에 버려졌다. `waitForHttp`는 남아 있던 서버의 200을 받아 통과했고,
// `castle-archer`·`road-stream-racer`의 visual-layout·scene-composite 게이트가 **다른 게임의
// dist**를 검사한 뒤 영수증이 발급됐다.
//
// 무엇을 봤는지 모르는 통과는 통과가 아니다. 그래서 서버가 준비된 직후 한 번, 그 서버가
// **이 프로젝트의 dist를 서빙하는지** 확인한다.
//
// ── 왜 번들 참조를 비교하는가 ────────────────────────────────────────────────
// index.html 전체 바이트 비교는 서버가 헤더나 base를 손대면 정당한 실패를 만든다. 대신 Vite가
// 빌드마다 새로 만드는 **해시 붙은 번들 경로**(`/assets/index-XXXXXXXX.js`)를 비교한다.
// 그 값은 게임마다 다르고 빌드마다 다르므로 신원으로 쓸 수 있다(실측: 5개 게임의
// dist/index.html 해시가 모두 다르다). 참조가 하나도 없는 index.html은 번들이 없다는 뜻이므로
// 그때만 바이트 비교로 내려간다 — 검증 없이 통과시키지 않는다.

const BUNDLE_REF = /(?:src|href)="([^"]*\/assets\/[^"]+-[A-Za-z0-9_-]{8,}\.[^"]+)"/g;

export function bundleRefs(html) {
  return [...String(html).matchAll(BUNDLE_REF)].map((match) => match[1]).sort();
}

/**
 * `url`이 `projectDir/dist`를 서빙하는지 확인한다. 아니면 던진다.
 * 게이트가 프리뷰를 띄운 직후, 브라우저 게이트를 부르기 **전에** 부른다.
 */
export async function assertPreviewServesProject(url, projectDir, options = {}) {
  const distIndex = path.join(projectDir, options.distDir || 'dist', 'index.html');
  if (!fs.existsSync(distIndex)) {
    throw new Error(`preview identity check cannot run: ${distIndex} is missing (build first)`);
  }
  const expectedBytes = fs.readFileSync(distIndex);
  const response = await fetch(`${url.replace(/\/+$/, '')}/index.html`);
  if (!response.ok) {
    throw new Error(`preview at ${url} did not serve /index.html (status ${response.status})`);
  }
  const servedBytes = Buffer.from(await response.arrayBuffer());
  const expected = bundleRefs(expectedBytes.toString('utf8'));
  const served = bundleRefs(servedBytes.toString('utf8'));
  const same = expected.length
    ? expected.join('\n') === served.join('\n')
    : servedBytes.equals(expectedBytes);
  if (!same) {
    throw new Error(`preview at ${url} is not serving this project's dist — another server holds the port.\n`
      + `  project: ${projectDir}\n`
      + `  expected bundle refs: ${expected.join(', ') || '(none; byte compare)'}\n`
      + `  served bundle refs:   ${served.join(', ') || '(none; byte compare)'}\n`
      + '  이 포트를 점유한 프로세스를 끝내고 게이트를 다시 돌릴 것 (lsof -nP -iTCP -sTCP:LISTEN).');
  }
  return { url, projectDir, bundleRefs: served };
}
