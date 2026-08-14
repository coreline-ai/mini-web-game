#!/usr/bin/env node
// host-preflight.mjs — can THIS host produce production image assets?
//
// The art step is one `codex exec` per planned asset, and every dependency it needs — the
// codex binary, a logged-in CLI, the imagegen skill's chroma-key helper, python+PIL for the
// crop pass — is currently discovered mid-run, after scaffold and productionize have already
// done their work. Checking them here costs seconds and turns a late, confusing failure into
// an upfront verdict with a named fix.
//
// This matters most for hosts that cannot draw. Claude Code has no built-in image generation,
// so `codex exec` is its ONLY art path; running this gate is how it learns whether that path
// is open before promising a production-demo.
//
// Static by default (no image is generated, nothing is spent). --deep additionally produces
// one throwaway image, which is the only way to prove image_gen itself answers — a binary can
// pass --version and still be a broken install.
//
// Usage:
//   node generator/scripts/host-preflight.mjs [--deep] [--json] [--codex <bin>] [--timeout <sec>]
// Exit code: 0 when art is possible, 1 when it is blocked.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { findCodexOrNull, checkCodexAuth, chromaHelperPath, resolveCodexHome, codexGenerate } from './lib/codex-host.mjs';

function parseArgs(argv) {
  const args = { timeoutSec: 180 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--deep') args.deep = true;
    else if (a === '--json') args.json = true;
    else if (a === '--codex') args.codex = argv[++i];
    else if (a === '--timeout') args.timeoutSec = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

function usage() {
  console.log(`Usage:
  node generator/scripts/host-preflight.mjs [--deep] [--json]

Checks whether this host can generate production image assets through the Codex
built-in imagegen skill, before the pipeline commits to a scaffold.

Options:
  --deep            Also generate one throwaway image (proves image_gen answers)
  --json            Machine-readable result on stdout
  --codex <bin>     codex binary to probe
  --timeout <sec>   --deep generation timeout, default 180

Env:
  DEVGAME_CODEX_BIN  Path to a working codex binary (auto-detected otherwise)
  CODEX_HOME         Codex home holding the imagegen skill (default ~/.codex)`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }

  const checks = [];
  const add = (id, label, ok, detail, fix) => { checks.push({ id, label, ok, detail, fix }); return ok; };

  // 1) a codex binary that actually answers --version
  const codex = findCodexOrNull(args.codex);
  add('codex-binary', 'codex binary', !!codex,
    codex || 'not found',
    'Install the Codex CLI, or set DEVGAME_CODEX_BIN=/path/to/codex');

  // 2) credentials — a binary that runs but is logged out fails every image identically
  let auth = { ok: false, detail: 'skipped (no binary)' };
  if (codex) auth = checkCodexAuth(codex);
  add('codex-auth', 'codex authentication', auth.ok, auth.detail, 'Run: codex login');

  // 3) the chroma-key helper that turns magenta-plate output into transparent sprites.
  //    Without it every sprite/UI/FX asset silently stays opaque.
  const codexHome = resolveCodexHome();
  const helper = chromaHelperPath(codexHome);
  add('chroma-helper', 'imagegen chroma-key helper', fs.existsSync(helper), helper,
    `Install the Codex imagegen skill, or point CODEX_HOME at the home that has it (current: ${codexHome})`);

  // 4) python3 + PIL, used for autocrop/resize of sprites and UI frames
  let pil = { ok: false, detail: 'python3 not runnable' };
  try {
    const r = spawnSync('python3', ['-c', 'import PIL; print(PIL.__version__)'], { encoding: 'utf8', timeout: 20000 });
    pil = { ok: r.status === 0, detail: r.status === 0 ? `Pillow ${String(r.stdout).trim()}` : String(r.stderr || '').trim().split('\n').pop() };
  } catch (err) { pil = { ok: false, detail: err.message || String(err) }; }
  add('python-pil', 'python3 + Pillow', pil.ok, pil.detail, 'Install: python3 -m pip install Pillow');

  // 5) --deep: the only check that proves image_gen itself responds
  if (args.deep) {
    if (!codex || !auth.ok) {
      add('imagegen-smoke', 'image_gen smoke (--deep)', false, 'skipped (binary or auth blocked)', 'Fix the blockers above first');
    } else {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'devgame-preflight-'));
      const out = path.join(dir, 'preflight-smoke.png');
      const started = Date.now();
      let ok = false;
      try {
        ok = codexGenerate(codex, out, 'A single plain matte grey square centred on white.', args.timeoutSec);
      } catch { ok = false; }
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      add('imagegen-smoke', 'image_gen smoke (--deep)', ok,
        ok ? `generated in ${secs}s` : `no image after ${secs}s`,
        'Check `codex exec` works interactively and the imagegen skill is installed');
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    }
  }

  const blockers = checks.filter((c) => !c.ok);
  const artCapable = blockers.length === 0;
  const result = {
    adapter: 'codex-exec',
    artCapable,
    deep: !!args.deep,
    codex: codex || null,
    codexHome,
    blockers: blockers.map((b) => b.id),
    checks,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('host preflight — image asset capability via `codex exec`');
    for (const c of checks) {
      console.log(`  ${c.ok ? 'OK  ' : 'FAIL'} ${c.label}: ${c.detail}`);
    }
    console.log('');
    if (artCapable) {
      console.log(`artCapable: yes${args.deep ? ' (deep verified)' : ' (static checks only — use --deep to prove image_gen answers)'}`);
    } else {
      console.log(`artCapable: NO — ${blockers.length} blocker(s)`);
      for (const b of blockers) console.log(`  ${b.label} → ${b.fix}`);
      console.log('');
      console.log('This host cannot generate production image assets. Build structure only with');
      console.log('--skip-art and report the result as production-demo 미통과 — do not substitute');
      console.log('placeholder art and call the game complete.');
    }
  }

  process.exit(artCapable ? 0 : 1);
}

try { main(); } catch (err) { console.error(err.message || err); usage(); process.exit(1); }
