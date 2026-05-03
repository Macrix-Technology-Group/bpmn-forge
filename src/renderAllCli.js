import fs from 'fs';
import path from 'path';
import { runVerifiedRender } from './pipeline.js';

const inputDir = process.argv[2] || 'tests/bpmn';
const outDir = process.argv[3] || 'output';
fs.mkdirSync(outDir, { recursive: true });
const summary = [];
for (const file of fs.readdirSync(inputDir).filter(f => f.endsWith('.bpmn'))) {
  const base = path.basename(file, '.bpmn');
  const result = await runVerifiedRender(fs.readFileSync(path.join(inputDir, file), 'utf8'));
  fs.writeFileSync(path.join(outDir, `${base}.svg`), result.svg);
  fs.writeFileSync(path.join(outDir, `${base}.report.json`), JSON.stringify(result.report, null, 2));
  summary.push({ file, pass: result.report.pass, coverage: result.report.coverage.total, confidence: result.report.confidence });
}
fs.writeFileSync(path.join(outDir, 'render-summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
