// codex-host.mjs — shared access to the Codex CLI host that produces image assets.
//
// The art step (codex-imagegen.mjs) and the capability gate (host-preflight.mjs) must agree
// on which binary they drive, which CODEX_HOME they read, and where the imagegen skill's
// chroma-key helper lives. Resolving that in one place is what makes preflight's verdict
// true for the run that follows it — two copies of this logic could disagree and the gate
// would be worthless.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';

export function resolveCodexHome() {
  return process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
}

export function chromaHelperPath(codexHome = resolveCodexHome()) {
  return path.join(codexHome, 'skills/.system/imagegen/scripts/remove_chroma_key.py');
}

// Locate a WORKING codex binary (the nvm-installed one is often broken, so every candidate
// is probed with --version rather than trusted for existing).
export function findCodexOrNull(override) {
  const candidates = [];
  if (override) candidates.push(override);
  if (process.env.DEVGAME_CODEX_BIN) candidates.push(process.env.DEVGAME_CODEX_BIN);
  const home = os.homedir();
  const globs = [
    `${home}/.antigravity-ide/extensions/openai.chatgpt-*/bin/macos-*/codex`,
    `${home}/.antigravity/extensions/openai.chatgpt-*/bin/macos-*/codex`,
    `${home}/.vscode/extensions/openai.chatgpt-*/bin/macos-*/codex`,
  ];
  for (const g of globs) {
    try { for (const p of globSync(g)) candidates.push(p); } catch {}
  }
  candidates.push('codex');
  for (const bin of candidates) {
    try {
      const r = spawnSync(bin, ['--version'], { encoding: 'utf8', timeout: 15000 });
      if (r.status === 0 && /codex/i.test(r.stdout || '')) return bin;
    } catch {}
  }
  return null;
}

export function findCodex(override) {
  const bin = findCodexOrNull(override);
  if (!bin) throw new Error('No working codex binary found. Set DEVGAME_CODEX_BIN=/path/to/codex');
  return bin;
}

// `codex login status` exits 0 only while credentials are usable. A binary that runs but is
// logged out fails every image the same way, so it is worth separating from "no binary".
export function checkCodexAuth(codex) {
  try {
    const r = spawnSync(codex, ['login', 'status'], { encoding: 'utf8', timeout: 20000 });
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').filter(Boolean)[0] || '';
    return { ok: r.status === 0, detail: out };
  } catch (err) {
    return { ok: false, detail: err.message || String(err) };
  }
}

// Run one `codex exec` image generation into an absolute output file.
export function codexGenerate(codex, outFile, prompt, timeoutSec) {
  const outDir = path.dirname(outFile);
  const base = path.basename(outFile);
  fs.mkdirSync(outDir, { recursive: true });
  const full = `Use the built-in imagegen skill / image_gen tool. Do not create or run external image-service generation scripts. Generate ONE high-quality image, then copy the final result to the current working directory as '${base}'. Prompt: ${prompt} No text, no watermark, no UI, no border. When done print 'SAVED ${base}'.`;
  const r = spawnSync(codex, [
    'exec', '--sandbox', 'workspace-write', '-C', outDir, '--skip-git-repo-check',
    '-c', 'model_reasoning_effort="low"', full,
  ], { encoding: 'utf8', timeout: timeoutSec * 1000, stdio: ['ignore', 'pipe', 'pipe'] });
  return fs.existsSync(outFile);
}
