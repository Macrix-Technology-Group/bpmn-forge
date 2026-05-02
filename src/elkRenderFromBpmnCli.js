import fs from 'fs';
import { importBpmnXml } from './bpmnXmlImporter.js';
import { normalizeIr } from './normalizer.js';
import { renderElkSvg } from './elkSvgRenderer.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/diagram.elk.svg';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = normalizeIr(importBpmnXml(fs.readFileSync(input, 'utf8')));
const svg = await renderElkSvg(ir);

fs.writeFileSync(output, svg);
console.log(`Wrote ${output}`);
