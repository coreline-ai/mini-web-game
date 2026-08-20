import fs from 'node:fs';
import path from 'node:path';

// 브라우저 게이트가 **왜** 실패했는지 남긴다.
//
// ── 무엇이 버려지고 있었나 ───────────────────────────────────────────────────
// `visual-layout-qa`·`scene-composite-qa`의 씬 대기는 이렇게 쓰여 있었다.
//
//   await page.waitForFunction(() => ...scene === 'Loading', { timeout: 10000 }).catch(() => {});
//   await inspectCurrentPage(page, 'loading', ...)   // → "__GAME_LAYOUT_BOUNDS__ missing or empty"
//
// 타임아웃이 `.catch(() => {})`로 침묵하고, 그 다음 검사가 "레지스트리가 비었다"고 보고한다.
// 그래서 로그에는 **결과만** 남고 원인 판별에 필요한 것이 전부 사라진다 — 몇 초 기다렸는지,
// 게임 객체가 아예 없는지, WebGL 컨텍스트가 죽었는지, 로더가 어디서 멈췄는지.
//
// 실측(2026-08-20): 이 공백 때문에 같은 실패를 두고 "호스트 메모리 압력"과 "뷰포트 크기"를
// 차례로 원인으로 단정했고 둘 다 재측정에서 배제됐다. 도구가 자기 실패를 설명하지 못하면
// 사람이 추측으로 메우고, 추측은 계약 문서에 잘못된 원인 축으로 굳는다.
//
// ── 무엇을 남기는가 ─────────────────────────────────────────────────────────
// 타임아웃 시점의 페이지 상태를 한 번에 뜬다. 게임 객체·부팅 플래그·렌더러 종류·캔버스 크기·
// GL 컨텍스트 손실·로더 진행률·문서 상태. 이 값들이 "게임이 죽었다"와 "게임이 느리다"를
// 가른다 — 그 둘은 전혀 다른 수정으로 이어진다.

/**
 * 페이지 스크립트보다 **먼저** 실행되어 requestAnimationFrame 발행 횟수를 센다.
 * `game=booted`인데 `active=[]`인 실패를 두고 "씬 시작이 막혔다"와 "프레임이 한 번도 발행되지
 * 않았다"를 가르는 것이 이 카운터다 — Phaser는 씬 부팅 큐를 게임 루프의 첫 step에서 처리한다.
 */
export async function installFrameCounter(page) {
  await page.addInitScript(() => {
    globalThis.__RAF_TICKS__ = 0;
    const tick = () => { globalThis.__RAF_TICKS__ += 1; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    globalThis.__PAGE_VISIBILITY__ = () => ({ hidden: document.hidden, state: document.visibilityState });
  }).catch(() => {});
}

/** 페이지 안에서 실행되어 부팅 상태를 한 번에 수집한다. 실패해도 던지지 않는다. */
export async function bootDiagnostics(page) {
  try {
    return await page.evaluate(() => {
      const out = {
        readyState: document.readyState,
        scene: globalThis.__GAME_LAYOUT_BOUNDS__?.scene ?? null,
        gameExists: Boolean(globalThis.__GAME__),
        isBooted: Boolean(globalThis.__GAME__?.isBooted),
        renderType: globalThis.__GAME__?.config?.renderType ?? null, // 1=CANVAS 2=WEBGL
        canvas: null,
        gl: null,
        loaderProgress: null,
        activeScenes: null,
        rafTicks: globalThis.__RAF_TICKS__ ?? null,
        visibility: typeof globalThis.__PAGE_VISIBILITY__ === 'function' ? globalThis.__PAGE_VISIBILITY__() : null,
        loop: null,
      };
      const loop = globalThis.__GAME__?.loop;
      if (loop) {
        out.loop = {
          running: Boolean(loop.running),
          frame: loop.frame ?? null,
          actualFps: loop.actualFps ?? null,
          time: loop.time ?? null,
        };
      }
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        out.canvas = {
          backing: `${canvas.width}x${canvas.height}`,
          css: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
          dpr: globalThis.devicePixelRatio || 1,
        };
      }
      const gl = globalThis.__GAME__?.renderer?.gl;
      if (gl) {
        let renderer = null;
        try {
          const info = gl.getExtension('WEBGL_debug_renderer_info');
          if (info) renderer = gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
        } catch {}
        out.gl = {
          contextLost: typeof gl.isContextLost === 'function' ? gl.isContextLost() : null,
          error: gl.getError(),
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
          maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
          renderer,
        };
      }
      const scenes = globalThis.__GAME__?.scene?.scenes;
      if (Array.isArray(scenes)) {
        out.activeScenes = scenes.filter((s) => s.scene?.settings?.active).map((s) => s.scene.key);
        const loading = scenes.find((s) => s.scene?.key === 'Loading');
        if (loading?.load) out.loaderProgress = loading.load.progress;
      }
      return out;
    });
  } catch (error) {
    return { unreadable: String(error && error.message ? error.message : error) };
  }
}

/**
 * 씬 도달을 기다린다. **침묵하지 않는다** — 타임아웃이면 경과 시간과 진단을 함께 돌려준다.
 * 호출부는 그것을 errors에 한 줄로 넣고, 전체 JSON은 `writeDiagnostics`가 파일로 남긴다.
 */
export async function awaitScene(page, scene, timeoutMs, record) {
  const startedAt = Date.now();
  try {
    await page.waitForFunction(
      (expected) => globalThis.__GAME_LAYOUT_BOUNDS__?.scene === expected,
      scene, { timeout: timeoutMs },
    );
    record?.push({ scene, ok: true, elapsedMs: Date.now() - startedAt, timeoutMs });
    return { ok: true, elapsedMs: Date.now() - startedAt };
  } catch {
    const elapsedMs = Date.now() - startedAt;
    const diagnostics = await bootDiagnostics(page);
    record?.push({ scene, ok: false, elapsedMs, timeoutMs, diagnostics });
    return { ok: false, elapsedMs, diagnostics };
  }
}

/** 진단 요약 한 줄. 게이트 로그에 남아 사람이 바로 읽는다. */
export function summarizeDiagnostics(diagnostics) {
  if (!diagnostics || diagnostics.unreadable) return `page unreadable (${diagnostics?.unreadable})`;
  const bits = [
    `scene=${diagnostics.scene ?? '(none)'}`,
    `game=${diagnostics.gameExists ? (diagnostics.isBooted ? 'booted' : 'not-booted') : 'absent'}`,
    `renderType=${diagnostics.renderType ?? '?'}`,
  ];
  if (diagnostics.canvas) bits.push(`canvas=${diagnostics.canvas.backing}`);
  if (diagnostics.gl) bits.push(`glLost=${diagnostics.gl.contextLost} glError=${diagnostics.gl.error}`);
  if (diagnostics.loaderProgress != null) bits.push(`loader=${diagnostics.loaderProgress}`);
  if (diagnostics.activeScenes) bits.push(`active=[${diagnostics.activeScenes.join(',')}]`);
  if (diagnostics.rafTicks != null) bits.push(`rafTicks=${diagnostics.rafTicks}`);
  if (diagnostics.loop) bits.push(`loop=${diagnostics.loop.running ? 'running' : 'stopped'} frame=${diagnostics.loop.frame}`);
  if (diagnostics.visibility) bits.push(`visibility=${diagnostics.visibility.state}`);
  return bits.join(' ');
}

/** 전체 기록을 파일로. 실패한 실행을 나중에 다시 읽을 수 있어야 한다. */
export function writeDiagnostics(dir, payload) {
  if (!dir) return null;
  try {
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'boot-diagnostics.json');
    fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
    return file;
  } catch { return null; }
}

// swiftshader가 내는 드라이버 메시지는 게임 오류가 아니다. 게임들의 자체 어댑터
// (`qa/_helpers.mjs`)는 이미 이것을 렌더러 경고로 분류한다. 도구가 hard error로 취급하면
// 정상 부팅한 실행도 이 메시지 하나로 실패할 수 있다 — 그래서 같은 분류를 여기서도 쓴다.
// **버리지는 않는다**: 경고로 세고, 출력에 개수와 표본을 남긴다.
export const RENDERER_NOISE = /Framebuffer status|GL Driver Message|WebGL-0x|swiftshader|SwiftShader/i;

export function classifyPageError(message) {
  return RENDERER_NOISE.test(String(message)) ? 'rendererWarning' : 'error';
}


// ── 소프트웨어 GL 선택은 한 곳에서 정한다 ───────────────────────────────────
// 두 도구가 `--use-gl=swiftshader`를 각자 하드코딩하고 있었다. 그 플래그는 최신 Chromium에서
// 대체된 경로이고, 실패한 실행에는 항상 `Framebuffer status: Framebuffer Unsupported`가 함께
// 났다. 그러니 이것이 원인 후보다 — 그런데 하드코딩이면 **비교 측정을 할 수 없다.**
// 환경변수로 갈아 끼울 수 있게 해서 두 경로의 실패율을 재고, 결과로 기본값을 정한다.
//   GAME_QA_GL=gl     → --use-gl=swiftshader (이전 기본)
//   GAME_QA_GL=angle  → --use-angle=swiftshader (ANGLE 소프트웨어 경로)
export function browserLaunchArgs() {
  const mode = String(process.env.GAME_QA_GL || 'angle').toLowerCase();
  const gl = mode === 'gl' ? ['--use-gl=swiftshader'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  return [...gl, '--disable-gpu-sandbox', '--no-sandbox'];
}
