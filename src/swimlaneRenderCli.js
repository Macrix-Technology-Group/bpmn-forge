import fs from 'fs';
import { normalizeIr } from './normalizer.js';
import { renderSwimlaneSvg } from './swimlaneSvgRenderer.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/swimlanes.svg';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = normalizeIr(JSON.parse(fs.readFileSync(input, 'utf8')));
fs.writeFileSync(output, await renderSwimlaneSvg(ir));

console.log(`Wrote ${output}`);
