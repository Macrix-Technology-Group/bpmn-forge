import fs from 'fs';
import { importUnifiedBpmnXml } from '../../unifiedBpmnImporter.js';
import { parseCompleteBpmndi } from './completeDiParser.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/complete_di_import.ir.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const xml = fs.readFileSync(input, 'utf8');
const ir = importUnifiedBpmnXml(xml);
ir.process.completeDi = parseCompleteBpmndi(xml);

fs.writeFileSync(output, JSON.stringify(ir, null, 2));

console.log(`Wrote ${output}`);
