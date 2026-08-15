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
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

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
  // 확장 번들 바이너리 탐색. node:fs의 globSync는 Node 22+에서만 존재하고 package.json이
  // 선언한 엔진은 >=18이므로, readdirSync로 같은 경로를 직접 훑는다.
  const extensionRoots = [
    `${home}/.antigravity-ide/extensions`,
    `${home}/.antigravity/extensions`,
    `${home}/.vscode/extensions`,
  ];
  for (const root of extensionRoots) {
    let entries = [];
    try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { continue; }
    for (const ext of entries) {
      if (!ext.isDirectory() || !ext.name.startsWith('openai.chatgpt-')) continue;
      const binRoot = path.join(root, ext.name, 'bin');
      let arches = [];
      try { arches = fs.readdirSync(binRoot, { withFileTypes: true }); } catch { continue; }
      for (const arch of arches) {
        if (!arch.isDirectory() || !arch.name.startsWith('macos-')) continue;
        const candidate = path.join(binRoot, arch.name, 'codex');
        if (fs.existsSync(candidate)) candidates.push(candidate);
      }
    }
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
//
// Success is not "a file exists at the path" — a failed run leaves the previous artefact in
// place and that read as success, letting a dead binary produce production-demo provenance.
// The old artefact is therefore moved aside first, the exit status is required to be 0, and
// the result is only moved into place after it is confirmed to be new content.
export function codexGenerate(codex, outFile, prompt, timeoutSec) {
  const outDir = path.dirname(outFile);
  const base = path.basename(outFile);
  fs.mkdirSync(outDir, { recursive: true });

  const sha = (f) => { try { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'); } catch { return null; } };
  const previousSha = fs.existsSync(outFile) ? sha(outFile) : null;
  const stash = previousSha ? `${outFile}.prev.${process.pid}` : null;
  if (stash) fs.renameSync(outFile, stash);

  const restore = () => { if (stash && fs.existsSync(stash)) fs.renameSync(stash, outFile); };
  const discardStash = () => { if (stash && fs.existsSync(stash)) fs.rmSync(stash, { force: true }); };

  const full = `Use the built-in imagegen skill / image_gen tool. Do not create or run external image-service generation scripts. Generate ONE high-quality image, then copy the final result to the current working directory as '${base}'. Prompt: ${prompt} No text, no watermark, no UI, no border. When done print 'SAVED ${base}'.`;
  const r = spawnSync(codex, [
    'exec', '--sandbox', 'workspace-write', '-C', outDir, '--skip-git-repo-check',
    '-c', 'model_reasoning_effort="low"', full,
  ], { encoding: 'utf8', timeout: timeoutSec * 1000, stdio: ['ignore', 'pipe', 'pipe'] });

  const detail = String(r.stderr || r.error?.message || '').trim().split('\n').filter(Boolean).pop();
  if (r.status !== 0) { restore(); return { ok: false, reason: 'exec-failed', status: r.status, detail }; }
  if (!fs.existsSync(outFile)) { restore(); return { ok: false, reason: 'no-output', detail }; }
  const newSha = sha(outFile);
  if (previousSha && newSha === previousSha) { discardStash(); return { ok: false, reason: 'unchanged-output', detail }; }

  discardStash();
  return { ok: true, sha256: newSha };
}
