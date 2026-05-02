import fs from 'fs';
import { normalizeIr } from './normalizer.js';
import { exportBpmnXmlWithDi } from './bpmndiExporter.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/with-di.bpmn';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = normalizeIr(JSON.parse(fs.readFileSync(input, 'utf8')));
fs.writeFileSync(output, exportBpmnXmlWithDi(ir));

console.log(`Wrote ${output}`);
