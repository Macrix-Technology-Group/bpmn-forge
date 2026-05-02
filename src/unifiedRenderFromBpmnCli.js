import fs from 'fs';
import { importUnifiedBpmnXml } from './unifiedBpmnImporter.js';
import { renderUnifiedSvg } from './unifiedRenderer.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/unified.svg';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = importUnifiedBpmnXml(fs.readFileSync(input, 'utf8'));
const result = await renderUnifiedSvg(ir);

fs.writeFileSync(output, result.svg);
fs.writeFileSync(output.replace(/\.svg$/, '.ir.json'), JSON.stringify(ir, null, 2));
fs.writeFileSync(output.replace(/\.svg$/, '.render.json'), JSON.stringify({ renderer: result.mode, importer: ir.meta?.importer }, null, 2));

console.log(`Wrote ${output}`);
