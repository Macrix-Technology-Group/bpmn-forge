import fs from 'fs';
import { normalizeIr } from './normalizer.js';
import { renderUnifiedSvg } from './unifiedRenderer.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/semantic.svg';
fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });
const rendered = await renderUnifiedSvg(normalizeIr(JSON.parse(fs.readFileSync(input, 'utf8'))));
fs.writeFileSync(output, rendered.svg);
console.log(`Wrote ${output}`);
