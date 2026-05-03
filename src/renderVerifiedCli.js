import fs from 'fs';
import { runVerifiedRender } from './pipeline.js';

const input = process.argv[2];
const out = process.argv[3] || 'output/diagram';
const strict = process.argv.includes('--strict');
const debug = process.argv.includes('--debug');
fs.mkdirSync(out.substring(0, out.lastIndexOf('/')) || '.', { recursive: true });
const result = await runVerifiedRender(fs.readFileSync(input, 'utf8'), { strict });
if (strict && !result.report.pass) {
  fs.writeFileSync(`${out}.report.json`, JSON.stringify(result.report, null, 2));
  process.exit(2);
}
fs.writeFileSync(`${out}.svg`, result.svg);
fs.writeFileSync(`${out}.report.json`, JSON.stringify(result.report, null, 2));
if (debug) {
  fs.writeFileSync(`${out}.step1.imported.ir.json`, JSON.stringify(result.imported, null, 2));
  fs.writeFileSync(`${out}.step2.normalized.ir.json`, JSON.stringify(result.normalized, null, 2));
  fs.writeFileSync(`${out}.step3.exported.bpmn`, result.exported);
  fs.writeFileSync(`${out}.step4.reimported.ir.json`, JSON.stringify(result.reimported, null, 2));
}
console.log(`Wrote ${out}.svg`);
