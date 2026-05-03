import fs from 'fs';
import { normalizeIr } from './normalizer.js';
import { renderUnifiedSvg } from './unifiedRenderer.js';
import { verifyIr } from './pipeline.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/diagram.svg';
fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });
const result = verifyIr(normalizeIr(JSON.parse(fs.readFileSync(input, 'utf8'))));
const rendered = await renderUnifiedSvg(result.normalized);
fs.writeFileSync(output, rendered.svg);
fs.writeFileSync(output.replace(/\.svg$/, '.report.json'), JSON.stringify(result.report, null, 2));
console.log(`Wrote ${output}`);
