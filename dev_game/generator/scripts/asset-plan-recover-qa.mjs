#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generationGroups, promptsFromArtPrompts, recoverPlan } from './asset-plan-recover.mjs';

// asset-plan 복원의 계측 검증 (계약 §0.1: 음성·양성 대조 + 실패 사유 지문).

const failures = [];
function check(condition, message) { if (!condition) failures.push(message); }

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-plan-recover-'));
function makeProject(id, { manifest, artPrompts } = {}) {
  const dir = path.join(root, id);
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'assets', 'asset-manifest.json'), JSON.stringify(manifest, null, 2));
  if (artPrompts) fs.writeFileSync(path.join(dir, 'art-prompts.md'), artPrompts);
  return dir;
}

const MANIFEST = {
  stageBackgrounds: [
    { id: 'dry-front', path: 'assets/backgrounds/stage-1-dry-front.webp', role: 'stage-background', minWidth: 1290, minHeight: 2796 },
  ],
  images: [
    { id: 'hero', path: 'assets/sprites/hero.webp', role: 'player', type: 'sprite', minWidth: 512, minHeight: 512 },
    { id: 'ui-pause', path: 'assets/ui/pause.webp', role: 'pause-button', type: 'ui', minWidth: 256, minHeight: 256 },
    { id: 'fx-boom', path: 'assets/fx/boom.webp', role: 'explosion', type: 'fx', minWidth: 512, minHeight: 512 },
  ],
};
const ART_PROMPTS = [
  '# Prompts', '',
  '## Stage 1', '', '```text', 'A lonely dry ridge at dusk.', '```', '',
  'Raw built-in output: `assets/_source/stage-1-dry-front-raw.png`, 941x1672.', '',
  '## Object sheet', '', '```text', 'A sheet with hero, pause icon and explosion.', '```', '',
  'Raw built-in output: `assets/_source/object-sheet.png`, 1024x1024.', '',
].join('\n');

try {
  // ── 음성 대조: manifest 만으로 골격이 복원된다 ──
  const bare = makeProject('bare', { manifest: MANIFEST });
  const b = recoverPlan(bare);
  check(b.plan.backgrounds.length === 1, `backgrounds must come from stageBackgrounds (got ${b.plan.backgrounds.length})`);
  check(b.plan.sprites.length === 1 && b.plan.ui.length === 1 && b.plan.fx.length === 1,
    'type must map to sprites/ui/fx buckets');
  check(b.plan.backgrounds[0].width === 1290, 'width must come from minWidth');
  check(b.promptSource === null, 'no art-prompts.md means no prompt source');
  check(b.missing.length === 4, `every entry without a prompt must be reported (got ${b.missing.length})`);

  // ── 음성 대조: art-prompts.md 가 있으면 1:1 인 것만 회수된다 ──
  const withPrompts = makeProject('with-prompts', { manifest: MANIFEST, artPrompts: ART_PROMPTS });
  const w = recoverPlan(withPrompts);
  check(w.promptSource === 'art-prompts.md', 'prompt source must be reported');
  check(w.plan.backgrounds[0].prompt.includes('dry ridge'),
    'background prompt must be recovered by raw-output stem');
  // 시트 프롬프트는 자산 하나가 아니라 여러 자산을 만든다. 붙이면 "자산 하나 재생성"이
  // 시트 전체 재생성이 되므로 붙이지 않는다.
  check(!w.plan.sprites[0].prompt && !w.plan.ui[0].prompt && !w.plan.fx[0].prompt,
    'a sheet prompt must not be attached to the individual assets cut from it');
  check(w.missing.length === 3, `sheet-derived assets must be reported as missing (got ${w.missing.length})`);

  // ── 생성 묶음 — 재생성 단위 ──
  // Path B는 프롬프트 하나가 시트 한 장을 만들고 여러 자산을 잘라냈다. 그 자산들은
  // promptHash를 공유한다. 하나만 다시 만들면 나머지가 옛 해시를 계속 주장해 manifest가
  // 거짓 관계를 남긴다 — 그래서 묶음이 재생성 단위다.
  const SHEET_MANIFEST = {
    stageBackgrounds: [],
    images: [
      { id: 'a1', path: 'assets/a1.webp', type: 'sprite', provenance: { promptHash: 'sheet0001' } },
      { id: 'a2', path: 'assets/a2.webp', type: 'sprite', provenance: { promptHash: 'sheet0001' } },
      { id: 'solo', path: 'assets/solo.webp', type: 'fx', provenance: { promptHash: 'unique999' } },
    ],
  };
  const groups = generationGroups(SHEET_MANIFEST);
  check(groups.size === 1, `only shared hashes form a group (got ${groups.size})`);
  check((groups.get('sheet0001') || []).length === 2, 'the shared-hash pair must be one group');
  check(!groups.has('unique999'), 'a lone hash is not a group');

  const sheetProject = makeProject('sheet', { manifest: SHEET_MANIFEST });
  const s = recoverPlan(sheetProject);
  check(s.plan.generationGroups?.length === 1, 'the recovered plan must carry generationGroups');
  check(s.plan.sprites.every((e) => e.generationGroup === 'sheet0001'),
    'group members must be marked in their plan entries');
  check(!s.plan.fx[0].generationGroup, 'a non-member must not be marked');

  // ── 양성 대조: 근거가 없으면 복원하지 않는다 ──
  const noManifest = path.join(root, 'no-manifest');
  fs.mkdirSync(noManifest, { recursive: true });
  let err = null;
  try { recoverPlan(noManifest); } catch (error) { err = error; }
  check(/asset-manifest\.json이 없다/.test(err?.message || ''),
    `missing manifest must fail with its own reason (got ${err?.message})`);

  // ── 양성 대조: Raw 출력 줄이 없는 블록은 어느 자산인지 특정할 수 없다 ──
  const orphan = promptsFromArtPrompts('```text\nno raw line follows\n```\n\nsome other text');
  check(orphan.size === 0, 'a prompt block with no raw-output line must be discarded, not guessed');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

// ── 호출부 배선 ──────────────────────────────────────────────────────────────
const here = path.dirname(new URL(import.meta.url).pathname);
const imagegen = fs.readFileSync(path.join(here, 'codex-imagegen.mjs'), 'utf8');
// 호출 **지점**을 본다. `assertPlanPrompts(plan)`만 찾으면 함수 정의에도 그 문자열이 있어서
// 호출을 지워도 통과한다 — 실제로 그렇게 공허했다(주입으로 확인).
check(/const plan = readJson\(planFile\);\s*\n\s*assertPlanPrompts\(plan\);/.test(imagegen),
  'imagegen must call assertPlanPrompts right after loading the plan, before generating');
check(!/asset-plan\.json missing — run productionize/.test(imagegen),
  'imagegen must not advise productionize.mjs — it overwrites a shipped game\'s planning docs');
check(imagegen.includes('factory:asset-plan-recover'),
  'imagegen must point at the recovery command when the plan is absent');
// 호출 지점을 본다 — 정의에만 있는 문자열로는 배선을 증명하지 못한다(이 파일에서 한 번 겪었다).
check(/if \(args\.id\) \{[\s\S]{0,400}?assertGroupNotSplit\(manifest, planned/.test(imagegen),
  'imagegen must refuse to regenerate part of a generation group when --id is given');

if (failures.length) {
  console.error('asset-plan recover QA failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('asset-plan recover QA OK: manifest 골격, 1:1 프롬프트 회수, 시트 프롬프트 미부착, '
  + '근거 없음 거부, imagegen 빈 프롬프트 차단·조언 배선');
