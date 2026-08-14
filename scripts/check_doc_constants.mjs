#!/usr/bin/env node
// check_doc_constants.mjs — do the docs still name every value the gate accepts?
//
// The Path B checklist in ai-art-pipeline.md tells a human which provenance values to write
// by hand, restating constants that live in production-demo-qa.mjs. If the gate's accepted
// set changes, a hand-written manifest starts failing against a doc that still lists the old
// value — the same silent drift a duplicated file has, so it is checked the same way.
//
// Usage: node scripts/check_doc_constants.mjs   (run from the repo root)
// Exit code: 0 when every constant value appears in the doc, 1 otherwise.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GATE = path.join(ROOT, 'dev_game/generator/scripts/production-demo-qa.mjs');
const DOC = path.join(ROOT, 'dev_game/docs/ai-art-pipeline.md');
const CONSTANTS = ['ACCEPTED_IMAGEGEN_MODELS', 'REQUIRED_IMAGEGEN_METHOD', 'REQUIRED_IMAGEGEN_SKILL'];

const gate = fs.readFileSync(GATE, 'utf8');
const doc = fs.readFileSync(DOC, 'utf8');

// Values come either from `new Set([...])` or a plain string literal.
function constantValues(name) {
  const asSet = new RegExp(`const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\)`).exec(gate);
  if (asSet) return [...asSet[1].matchAll(/["']([^"']+)["']/g)].map((m) => m[1]);
  const asLiteral = new RegExp(`const ${name} = ["']([^"']+)["']`).exec(gate);
  return asLiteral ? [asLiteral[1]] : [];
}

let failed = 0;
for (const name of CONSTANTS) {
  const values = constantValues(name);
  if (!values.length) {
    console.log(`  FAIL: cannot read ${name} from production-demo-qa.mjs`);
    failed = 1;
    continue;
  }
  for (const value of values) {
    if (doc.includes(value)) {
      console.log(`  OK   ${name}: "${value}"`);
    } else {
      console.log(`  FAIL: ${name} value "${value}" is not documented in ai-art-pipeline.md`);
      failed = 1;
    }
  }
}

process.exit(failed);
