#!/usr/bin/env node
import path from 'node:path';
import { qaDistRuntime } from '../templates/runtime-asset-delivery.mjs';

function parseArgs(argv) {
  const args = { project: null, distDir: 'dist' };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (value === '--project') args.project = path.resolve(argv[++i]);
    else if (value === '--dist') args.distDir = argv[++i];
    else if (value === '--max-runtime-bytes') args.maxRuntimeBytes = Number(argv[++i]);
    else if (value === '--help' || value === '-h') args.help = true;
    else throw new Error(`Unknown dist-runtime-qa argument: ${value}`);
  }
  return args;
}

function usage() {
  console.log(`Usage:
  node generator/scripts/dist-runtime-qa.mjs --project generated/<game-id>
  node generator/scripts/dist-runtime-qa.mjs --project generated/<game-id> --max-runtime-bytes 16777216`);
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { usage(); process.exit(0); }
  if (!args.project) throw new Error('Missing required --project <generated-game-dir>');
  const result = qaDistRuntime(args.project, args);
  console.log(`Dist runtime QA OK: ${result.assets} assets, ${result.totalBytes}/${result.budget} bytes (${result.distDir})`);
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
