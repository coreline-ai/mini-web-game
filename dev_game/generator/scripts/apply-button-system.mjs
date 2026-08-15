#!/usr/bin/env node
// apply-button-system.mjs — retrofit an already-generated game with the button system.
//
// Fixing the generator does not fix games that were already made: each project owns a copy of
// the template. This script applies the same change by hand-free edit — BUTTON size tokens,
// the theme-derived palette, and the call sites — so a polish session does not have to redo
// the edits from memory for every game.
//
// Scope — this fixes SIZING, not colour, and that limit is deliberate.
//
// A game that ships a generated btn-frame image keeps showing it: the procedural palette only
// applies when no image texture exists. Recolouring therefore means regenerating those images,
// and that turned out not to be safely automatable across the fleet. Two things break it:
//   - asset layout differs per game. sky-archer enforces `assets/images/production/**` while
//     its asset-plan.json still points at `assets/ui/**`, so a plan-driven regeneration writes
//     to the wrong place and the build rejects the manifest.
//   - image_gen does not reliably honour a palette described in prose. Asked for the game's
//     own accent from a purple/green/gold palette, it returned blue.
// So button images are regenerated per game, by hand, with the layout and result checked —
// see dev_game/docs/ai-art-pipeline.md. The procedural fallback here is deterministic because
// it derives from exact hex values in the spec.
//
// Fleet divergence this script does handle: `options`/`opts`/absent 8th parameter, `su()` vs
// `U` scaling, scaling applied at the call site vs inside the function, and ternary labels.
// It refuses to run when it cannot recognise the signature, because tokenising call sites
// without patching the signature passes an object where a number is expected and the buttons
// silently stop rendering.
//
// Usage: node generator/scripts/apply-button-system.mjs --project generated/<game-id> [--dry-run]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generatorRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(generatorRoot, '..');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project') args.project = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.help && !args.project) throw new Error('Missing --project <generated-game-dir>');
  return args;
}

function resolveProject(input) {
  for (const c of [path.resolve(process.cwd(), input), path.resolve(workspaceRoot, input), path.resolve(workspaceRoot, 'generated', input)]) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(`Project not found: ${input}`);
}

const PALETTE_SOURCE = `import { SPEC } from '../data/spec.js';

// 버튼/UI 색은 spec.theme.colors에서 파생한다. 하드코딩하면 게임 테마가 무엇이든 같은 색이 나와
// 배경과 겉돈다. 통일감은 배경과 같은 계열의 액센트를 쓰는 데서, 구분은 배경 대비 명도차에서 온다.
function hexToRgb(hex) {
  const v = String(hex || '').replace('#', '');
  const full = v.length === 3 ? v.split('').map((c) => c + c).join('') : v.padEnd(6, '0');
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}
function toInt({ r, g, b }) { return (r << 16) | (g << 8) | b; }
function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function shade(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  const t = factor >= 0 ? factor : 0;
  return factor >= 0
    ? toInt({ r: clamp(r + (255 - r) * t), g: clamp(g + (255 - g) * t), b: clamp(b + (255 - b) * t) })
    : toInt({ r: clamp(r * (1 + factor)), g: clamp(g * (1 + factor)), b: clamp(b * (1 + factor)) });
}
// 상대 휘도 (WCAG) — 배경 대비를 재서 액센트가 묻히지 않게 보정하는 데 쓴다.
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const la = luminance(a); const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function toHex(int) { return '#' + int.toString(16).padStart(6, '0'); }

export function buttonPalette() {
  const c = SPEC.theme?.colors || {};
  const bg = c.background || SPEC.canvas.backgroundColor || '#0b1024';
  // 액센트는 게임이 이미 선언한 색에서 고른다 — 새 색을 발명하지 않아야 통일감이 유지된다.
  let face = c.collectible || c.player || c.ui || '#39e98a';
  // 배경과 대비가 부족하면 밝기만 조정한다. 색상(hue)은 유지해 계열 통일을 깨지 않는다.
  let guard = 0;
  while (contrast(face, bg) < 3 && guard < 12) {
    face = toHex(shade(face, luminance(bg) < 0.35 ? 0.12 : -0.12));
    guard += 1;
  }
  const dark = luminance(bg) < 0.35;
  return {
    face: toInt(hexToRgb(face)),
    shadow: shade(face, -0.35),
    highlight: shade(face, 0.25),
    label: dark ? (c.ui || '#ffffff') : '#1a1a1a',
    stroke: dark ? '#000000' : '#ffffff',
  };
}
`;

const BUTTON_TOKENS = `// 버튼 규격 — 호출부가 크기를 지어내지 못하게 역할별 토큰으로 고정한다.
// (production-demo-quality-contract §2.0.25)
export const BUTTON = {
  primary: { width: 230, height: 64 },
  secondary: { width: 230, height: 54 },
  icon: { width: 56, height: 56 },
};

`;

// 호출부의 숫자 크기를 토큰으로 바꾼다. 라벨로 역할을 판별한다 — PLAY/RETRY/RESUME은 화면당
// 하나뿐인 주요 행동이고, SOUND/HOME은 보조다.
const PRIMARY_LABELS = ['PLAY', 'RETRY', 'RESUME', 'START'];
const SECONDARY_LABELS = ['HOME', 'SOUND ON', 'SOUND OFF', 'MENU'];

// 호출부를 정규식으로 자르면 화살표 함수 본문의 `;`나 중첩 괄호에서 끊긴다.
// 괄호를 세어 인자 목록의 끝을 정확히 찾고, 최상위 인자만 분리한다.
function splitTopLevelArgs(source, openIndex) {
  const args = [];
  let depth = 0;
  let start = openIndex + 1;
  let quote = null;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') { depth += 1; continue; }
    if (ch === ')' || ch === ']' || ch === '}') {
      depth -= 1;
      if (depth === 0) { args.push(source.slice(start, i)); return { args, end: i }; }
      continue;
    }
    if (ch === ',' && depth === 1) { args.push(source.slice(start, i)); start = i + 1; }
  }
  return null;
}

function tokenizeCallSites(source) {
  const CALL = 'makeTextButton(';
  let changed = 0;
  let out = source;
  let cursor = 0;
  while (true) {
    const at = out.indexOf(CALL, cursor);
    if (at < 0) break;
    const open = at + CALL.length - 1;
    const parsed = splitTopLevelArgs(out, open);
    if (!parsed) { cursor = at + CALL.length; continue; }
    const { args, end } = parsed;
    // 마지막 두 숫자 인자가 크기다. 뒤에 options 객체가 붙는 경우도 있다.
    // 게임마다 스케일 관례가 다르다: 230 · su(230) · 230 * U 를 모두 크기 인자로 본다.
    const SIZE_ARG = /^\s*(?:[A-Za-z_$][\w$]*\s*\(\s*)?(\d+)\s*\)?\s*(?:\*\s*[A-Za-z_$][\w$]*)?\s*$/;
    const sizeOf = (a) => { const m = SIZE_ARG.exec(a); return m ? Number(m[1]) : null; };
    let wIdx = -1;
    for (let i = args.length - 1; i >= 0; i -= 1) {
      if (sizeOf(args[i]) !== null && i > 0 && sizeOf(args[i - 1]) !== null) { wIdx = i - 1; break; }
    }
    if (wIdx < 0) { cursor = at + CALL.length; continue; }
    // 라벨은 'PLAY' 처럼 단순 문자열일 수도, mute ? 'SOUND OFF' : 'SOUND ON' 처럼 삼항식일 수도 있다.
    // 인자 전체가 따옴표 문자열인지 보면 후자를 놓친다 — 인자 안의 첫 문자열 토큰을 쓴다.
    const labelArg = args.slice(0, wIdx).find((a) => /'[^']*'/.test(a));
    const label = labelArg ? (/'([^']*)'/.exec(labelArg)[1] || '').toUpperCase() : '';
    const w = sizeOf(args[wIdx]);
    const h = sizeOf(args[wIdx + 1]);
    let token = null;
    if (PRIMARY_LABELS.includes(label)) token = 'BUTTON.primary';
    else if (SECONDARY_LABELS.some((s) => label.startsWith(s.split(' ')[0]))) token = 'BUTTON.secondary';
    else if (w <= 80 && h <= 80) token = 'BUTTON.icon';
    if (!token) { cursor = at + CALL.length; continue; }
    const next = [...args.slice(0, wIdx), ` ${token}`, ...args.slice(wIdx + 2)];
    const replacement = `${CALL}${next.join(',')})`;
    out = out.slice(0, at) + replacement + out.slice(end + 1);
    changed += 1;
    cursor = at + replacement.length;
  }
  return { out, changed };
}

function ensureImport(source, names) {
  const re = /import \{ ([^}]*) \} from '(\.\.\/constants\/tuning\.js)'/;
  const m = re.exec(source);
  if (!m) return source;
  const have = m[1].split(',').map((s) => s.trim()).filter(Boolean);
  const merged = [...new Set([...have, ...names])];
  return source.replace(re, `import { ${merged.join(', ')} } from '$2'`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node generator/scripts/apply-button-system.mjs --project <dir> [--dry-run]');
    process.exit(0);
  }
  const projectDir = resolveProject(args.project);
  const src = path.join(projectDir, 'src/game');
  if (!fs.existsSync(src)) throw new Error(`Not a generated game (no src/game): ${projectDir}`);

  const report = [];
  const write = (rel, content) => {
    if (!args.dryRun) fs.writeFileSync(path.join(projectDir, rel), content);
  };

  // 1) palette.js
  const paletteRel = 'src/game/constants/palette.js';
  if (!fs.existsSync(path.join(projectDir, paletteRel))) {
    write(paletteRel, PALETTE_SOURCE);
    report.push(`  + ${paletteRel}`);
  } else report.push(`  = ${paletteRel} (이미 있음)`);

  // 2) tuning.js 의 BUTTON 토큰
  const tuningRel = 'src/game/constants/tuning.js';
  const tuningPath = path.join(projectDir, tuningRel);
  let tuning = fs.readFileSync(tuningPath, 'utf8');
  if (!tuning.includes('export const BUTTON')) {
    tuning = tuning.replace('export const TUNING = {', BUTTON_TOKENS + 'export const TUNING = {');
    write(tuningRel, tuning);
    report.push(`  ~ ${tuningRel} (BUTTON 토큰)`);
  } else report.push(`  = ${tuningRel} (토큰 이미 있음)`);

  // 3) MobileButton — 시그니처 + 테마 색
  const mbRel = 'src/game/ui/MobileButton.js';
  const mbPath = path.join(projectDir, mbRel);
  let mb = fs.readFileSync(mbPath, 'utf8');
  const before = mb;
  if (!mb.includes('buttonPalette')) {
    mb = mb.replace(/(import \{[^}]*\} from '\.\.\/constants\/tuning\.js';\n)/, "$1import { buttonPalette } from '../constants/palette.js';\n");
    if (!mb.includes('buttonPalette')) mb = "import { buttonPalette } from '../constants/palette.js';\n" + mb;
  }
  mb = ensureImport(mb, ['BUTTON']);
  // 시그니처의 8번째 인자명이 게임마다 다르고(options/opts) 아예 없는 게임도 있다.
  // 이름을 고정해 찾으면 교체가 조용히 실패하고, 호출부만 토큰화되어 크기가 객체가 된다.
  const SIG = /export function makeTextButton\(scene, x, y, label, onClick, width = 190, height = 58(?:,\s*([A-Za-z_$][\w$]*)\s*=\s*\{\})?\)\s*\{/;
  const sigMatch = SIG.exec(mb);
  let sigPatched = false;
  if (sigMatch) {
    const optName = sigMatch[1] || 'options';
    mb = mb.replace(SIG,
      `export function makeTextButton(scene, x, y, label, onClick, size = BUTTON.primary, heightOrOptions, maybeOptions) {
  // 규격 토큰(디자인 단위)을 받는다. 과거 시그니처(width, height, options)도 계속 동작시키되,
  // 그 호출부는 이미 스케일된 픽셀을 넘기므로 다시 스케일하지 않는다 — 이중 적용은 버튼을 배로 키운다.
  let spec = size; let ${optName} = heightOrOptions || {}; let preScaled = false;
  if (typeof size === 'number') { spec = { width: size, height: heightOrOptions }; ${optName} = maybeOptions || {}; preScaled = true; }
  let width = spec.width; let height = spec.height;`);
    sigPatched = true;
  } else if (/size = BUTTON\.primary/.test(mb)) {
    sigPatched = true; // 이미 적용됨
  }
  // U 환산이 이미 있는 프로젝트와 없는 프로젝트 모두 지원
  mb = mb.replace('width = Math.round(width * U); height = Math.round(height * U);', '');
  // 스케일 헬퍼 감지 — 디자인 단위를 캔버스 단위로 옮기는 방식이 게임마다 다르다.
  // 더 중요한 것은 "어디서" 스케일하느냐다. 함수 본문이 이미 `width = su(width)`로
  // 스케일하는 게임에 다시 씌우면 버튼이 배로 커진다(bullseye-rush에서 실제로 발생).
  const scalesInternally = /^\s*(?:let |const )?width\s*=\s*(?:su|sx)\s*\(\s*width\s*\)/m.test(mb);
  let scaleExpr = null;
  if (scalesInternally) scaleExpr = null;
  else if (/\bsu\s*\(/.test(mb)) scaleExpr = (v) => `su(${v})`;
  else if (/\*\s*U\b/.test(mb)) scaleExpr = (v) => `Math.round(${v} * U)`;
  if (scaleExpr) {
    mb = mb.replace('let width = spec.width; let height = spec.height;',
      `let width = preScaled ? spec.width : ${scaleExpr('spec.width')}; let height = preScaled ? spec.height : ${scaleExpr('spec.height')};`);
  }
  report.push(`  · 스케일: ${scalesInternally ? '함수 내부에서 이미 적용됨(추가 없음)' : (scaleExpr ? (/\bsu\s*\(/.test(mb) ? 'su() 적용' : 'U 적용') : '없음(원시 픽셀)')}`);
  mb = mb.replace('g.fillStyle(0x0a3d1f, 1);', 'const pal = buttonPalette();\n      g.fillStyle(pal.shadow, 1);');
  mb = mb.replace('g.fillStyle(0x22b357, 1);', 'g.fillStyle(pal.face, 1);');
  mb = mb.replace('g.fillStyle(0x46e07e, 0.85);', 'g.fillStyle(pal.highlight, 0.85);');
  mb = mb.replace(/const txt = scene\.add\.text\(x, y, label, \{ fontFamily: 'Arial Black, Arial', fontSize: ([^,]+), color: '#ffffff', stroke: '#000000', strokeThickness: 4 \}\)/,
    "const _pal = buttonPalette();\n  const txt = scene.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: $1, color: _pal.label, stroke: _pal.stroke, strokeThickness: 4 })");
  if (mb !== before) { write(mbRel, mb); report.push(`  ~ ${mbRel} (토큰 시그니처 + 테마 색)`); }
  else report.push(`  = ${mbRel} (변경 없음)`);

  if (!sigPatched) {
    throw new Error(
      'makeTextButton 시그니처를 인식하지 못했습니다. 이 게임은 템플릿에서 갈라져 있어 수동 적용이 필요합니다.\n'
      + '  호출부만 토큰화하면 크기 인자가 객체가 되어 버튼이 렌더되지 않습니다.\n'
      + `  확인: ${path.join(projectDir, mbRel)}`,
    );
  }

  // 4) 호출부 토큰화
  for (const rel of ['src/game/scenes/HomeScene.js', 'src/game/scenes/GameOverScene.js', 'src/game/scenes/PauseScene.js', 'src/game/ui/HudUI.js']) {
    const p = path.join(projectDir, rel);
    if (!fs.existsSync(p)) continue;
    let s = fs.readFileSync(p, 'utf8');
    const { out, changed } = tokenizeCallSites(s);
    if (!changed) { report.push(`  = ${rel} (호출부 없음)`); continue; }
    s = out;
    if (/import \{[^}]*\} from '\.\.\/constants\/tuning\.js'/.test(s)) s = ensureImport(s, ['BUTTON']);
    else s = s.replace(/^(import [^\n]*\n)/, `$1import { BUTTON } from '../constants/tuning.js';\n`);
    write(rel, s);
    report.push(`  ~ ${rel} (호출부 ${changed}건 토큰화)`);
  }

  console.log(`${args.dryRun ? '[dry-run] ' : ''}apply-button-system: ${path.basename(projectDir)}`);
  for (const line of report) console.log(line);
  console.log('  다음: 프롬프트를 테마화한 뒤 factory:imagegen --only ui --id "btn-*" 로 버튼 이미지를 재생성한다.');
}

try { main(); } catch (err) { console.error(err.message || err); process.exit(1); }
