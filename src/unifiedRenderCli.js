import fs from 'fs';
import { normalizeIr } from './normalizer.js';
import { renderUnifiedSvg } from './unifiedRenderer.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/unified.svg';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = normalizeIr(JSON.parse(fs.readFileSync(input, 'utf8')));
const result = await renderUnifiedSvg(ir);

fs.writeFileSync(output, result.svg);
fs.writeFileSync(output.replace(/\.svg$/, '.render.json'), JSON.stringify({ renderer: result.mode }, null, 2));

console.log(`Wrote ${output}`);
