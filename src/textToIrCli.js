import fs from 'fs';
import { textToIr } from './textToIrParser.js';
import { textToIrWithLlm } from './textToIrLlmParser.js';
import { normalizeIr } from './normalizer.js';
const input = process.argv[2], output = process.argv[3] || 'output/text.ir.json';
const useLlm = process.argv.includes('--llm'), noFallback = process.argv.includes('--no-fallback');
fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });
const text = fs.readFileSync(input, 'utf8');
let ir, report = { parser: useLlm ? 'llm' : 'rule', fallbackUsed:false, ok:true, errors:[] };
if (useLlm) {
  try { ir = await textToIrWithLlm(text); }
  catch(e) {
    report.errors.push(e.message);
    if (noFallback) { fs.writeFileSync(output.replace(/\.json$/,'.report.json'), JSON.stringify(report,null,2)); process.exit(2); }
    ir = normalizeIr(textToIr(text)); report.parser='rule'; report.fallbackUsed=true;
  }
} else ir = normalizeIr(textToIr(text));
fs.writeFileSync(output, JSON.stringify(ir,null,2));
fs.writeFileSync(output.replace(/\.json$/,'.report.json'), JSON.stringify(report,null,2));
console.log(`Wrote ${output}`);
