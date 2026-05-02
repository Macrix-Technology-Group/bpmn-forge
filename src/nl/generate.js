#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { generateProcessFromPrompt } from './promptEngine.js';
import { normalizeIr } from '../normalizer.js';
import { validateIr } from '../validator.js';
import { renderUnifiedSvg } from '../unifiedRenderer.js';

function usage() {
  return `Usage: node src/nl/generate.js <prompt> [--mode rule|llm] [--out <path-without-ext>] [--svg] [--temperature <n>]

  --temperature <n>   LLM sampling temperature (only meaningful with --mode llm).
                      Default 0.3 — mostly deterministic, with a hair of
                      randomness so re-running an imprecise prompt can escape
                      a poor first interpretation. Pin to 0 for byte-stable
                      reproducibility; bump to 0.5–0.7 for exploration.

Examples:
  node src/nl/generate.js "Inbound pallet process"
  node src/nl/generate.js "Customer order with validation gateway" --mode llm
  node src/nl/generate.js "Pallet arrives, is checked, then stored" --mode llm --out output/pallet --svg
  node src/nl/generate.js "Approval workflow" --mode llm --temperature 0.7
`;
}

function parseArgs(argv) {
  const args = { mode: 'rule', out: null, svg: false, prompt: null, temperature: undefined };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') args.mode = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--svg') args.svg = true;
    else if (a === '--temperature') {
      const v = Number(argv[++i]);
      if (!Number.isFinite(v) || v < 0 || v > 1) {
        console.error('--temperature must be a number between 0 and 1');
        process.exit(2);
      }
      args.temperature = v;
    }
    else if (a === '--help' || a === '-h') { console.log(usage()); process.exit(0); }
    else positional.push(a);
  }
  args.prompt = positional.join(' ').trim();
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.prompt) { console.error(usage()); process.exit(2); }

  const { ir: rawIr, report } = await generateProcessFromPrompt(args.prompt, {
    mode: args.mode,
    temperature: args.temperature
  });
  const ir = normalizeIr(rawIr);
  // _meta preserves the generation context with the IR. The renderer reads
  // ir._meta.prompt to embed an info-icon overlay; downstream tools can use
  // it to reproduce or audit how the diagram was generated.
  ir._meta = {
    prompt: args.prompt,
    mode: args.mode,
    model: report?.model || null,
    temperature: args.temperature !== undefined ? args.temperature : null,
    generated_at: new Date().toISOString()
  };
  const validation = validateIr(ir);

  const outBase = args.out || `output/nl_${Date.now()}`;
  const outDir = path.dirname(outBase) || '.';
  fs.mkdirSync(outDir, { recursive: true });

  const irPath = `${outBase}.ir.json`;
  fs.writeFileSync(irPath, JSON.stringify(ir, null, 2));

  const reportPath = `${outBase}.report.json`;
  fs.writeFileSync(reportPath, JSON.stringify({ ...report, validation }, null, 2));

  console.log(`Wrote ${irPath}`);
  console.log(`Wrote ${reportPath}`);

  if (args.svg) {
    const svgPath = `${outBase}.svg`;
    const { svg, mode } = await renderUnifiedSvg(ir);
    fs.writeFileSync(svgPath, svg);
    console.log(`Wrote ${svgPath} (renderer: ${mode})`);
  }

  if (!validation.ok) {
    console.error(`Validation errors: ${validation.errors.join('; ')}`);
    process.exitCode = 2;
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
