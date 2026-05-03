import fs from 'fs';
import path from 'path';
import { runVerifiedRender } from './pipeline.js';

const inputDir = process.argv[2] || 'tests/bpmn';
const outDir = process.argv[3] || 'reports';
const strict = process.argv.includes('--strict');
fs.mkdirSync(outDir, { recursive: true });
const results = [];
for (const file of fs.readdirSync(inputDir).filter(f => f.endsWith('.bpmn'))) {
  const base = path.basename(file, '.bpmn');
  const result = await runVerifiedRender(fs.readFileSync(path.join(inputDir, file), 'utf8'), { strict });
  fs.writeFileSync(path.join(outDir, `${base}.report.json`), JSON.stringify(result.report, null, 2));
  fs.writeFileSync(path.join(outDir, `${base}.normalized.ir.json`), JSON.stringify(result.normalized, null, 2));
  fs.writeFileSync(path.join(outDir, `${base}.roundtrip.bpmn`), result.exported);
  results.push({ file, pass: result.report.pass, coverage: result.report.coverage.total, confidence: result.report.confidence });
}
const summary = {
  total: results.length,
  passed: results.filter(r => r.pass).length,
  failed: results.filter(r => !r.pass).length,
  strict,
  results
};
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
if (summary.failed > 0) process.exitCode = 2;
