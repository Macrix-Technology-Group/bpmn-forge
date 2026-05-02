import fs from 'fs';
import { importExtendedBpmnXml } from './extendedBpmnImport.js';
import { renderSwimlaneSvg } from './swimlaneSvgRenderer.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/swimlanes.svg';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = importExtendedBpmnXml(fs.readFileSync(input, 'utf8'));
fs.writeFileSync(output, await renderSwimlaneSvg(ir));

console.log(`Wrote ${output}`);
