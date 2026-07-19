#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { requiredAnimationEventKeys, requiredAnimationKeys } from '../src/systems/AnimationRegistry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselineMode = process.argv.includes('--baseline');
const manifestPath = path.join(root, 'assets/asset-manifest.json');
const reportPath = path.join(root, 'assets/qa/asset-coverage/current.json');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const absolute = path.join(dir, entry.name);
  if (entry.isDirectory()) return walk(absolute);
  return entry.isFile() && /\.[cm]?js$/.test(entry.name) ? [absolute] : [];
});

const sources = walk(path.join(root, 'src'));
const findings = [];
const recordMatches = (file, source, regex, kind, allow = (line) => line.includes('asset-coverage-allow')) => {
  source.split(/\r?\n/).forEach((line, index) => {
    regex.lastIndex = 0;
    if (regex.test(line) && !allow(line, file)) findings.push({ kind, file: path.relative(root, file), line: index + 1, source: line.trim() });
  });
};

for (const file of sources) {
  const source = fs.readFileSync(file, 'utf8');
  recordMatches(file, source, /['"]__WHITE['"]/, 'placeholder-texture');
  recordMatches(file, source, /generateTexture\s*\(/, 'generated-production-texture');
  recordMatches(file, source, /(?:this|scene)\.add\.(?:circle|rectangle)\s*\(/, 'primitive-production-visual');
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const manifestImages = [...(manifest.stageBackgrounds ?? []), ...(manifest.images ?? [])];
const missingFiles = manifestImages
  .filter((entry) => !fs.existsSync(path.join(root, entry.path)))
  .map((entry) => ({ id: entry.id, path: entry.path }));

const declaredAnimations = new Set((manifest.animations ?? []).flatMap((family) => (family.states ?? []).map((state) => `${family.family}:${state}`)));
const requiredAnimations = requiredAnimationKeys();
const missingRequiredAnimations = requiredAnimations.filter((key) => !declaredAnimations.has(key));
const declaredAnimationEvents = new Set((manifest.animationEvents ?? []).map(({ family, state, event }) => `${family}:${state}:${event}`));
const missingRequiredAnimationEvents = requiredAnimationEventKeys().filter((key) => !declaredAnimationEvents.has(key));

const requiredFamilies = manifest.assetCoverageContract?.requiredFamilies ?? [];
const declaredFamilies = new Set(manifestImages.flatMap((entry) => [entry.family ?? entry.role ?? entry.id, ...(entry.familyAliases ?? [])]));
const missingRequiredFamilies = requiredFamilies.filter((family) => !declaredFamilies.has(family));

const report = {
  gameId: manifest.assetIsolation?.generatedFor ?? 'unknown',
  generatedAt: new Date().toISOString(),
  baselineMode,
  summary: {
    sourceFindings: findings.length,
    placeholderTextures: findings.filter((item) => item.kind === 'placeholder-texture').length,
    generatedProductionTextures: findings.filter((item) => item.kind === 'generated-production-texture').length,
    primitiveProductionVisuals: findings.filter((item) => item.kind === 'primitive-production-visual').length,
    missingManifestFiles: missingFiles.length,
    missingRequiredAnimations: missingRequiredAnimations.length,
    missingRequiredAnimationEvents: missingRequiredAnimationEvents.length,
    missingRequiredFamilies: missingRequiredFamilies.length,
  },
  findings,
  missingFiles,
  missingRequiredAnimations,
  missingRequiredAnimationEvents,
  missingRequiredFamilies,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const failures = Object.entries(report.summary).filter(([key, value]) => key !== 'sourceFindings' && value > 0);
console.log(`Asset coverage report: ${path.relative(root, reportPath)}`);
console.log(JSON.stringify(report.summary));
if (failures.length && !baselineMode) {
  console.error(`Asset coverage QA FAILED: ${failures.map(([key, value]) => `${key}=${value}`).join(', ')}`);
  process.exit(1);
}
console.log(baselineMode && failures.length ? 'Asset coverage baseline recorded with expected open findings.' : 'Asset coverage QA OK.');
