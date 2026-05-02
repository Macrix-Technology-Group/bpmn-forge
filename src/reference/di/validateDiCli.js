import fs from 'fs';
import { importUnifiedBpmnXml } from '../../unifiedBpmnImporter.js';
import { parseCompleteBpmndi } from './completeDiParser.js';
import { buildCompleteDi } from './completeDiBuilder.js';
import { validateCompleteDi } from './diValidator.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/di_validation.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const xml = fs.readFileSync(input, 'utf8');
const ir = importUnifiedBpmnXml(xml);
const parsed = parseCompleteBpmndi(xml);
const di = (parsed.diagrams?.length || Object.keys(parsed.shapes || {}).length) ? parsed : buildCompleteDi(ir);
const validation = validateCompleteDi(ir, di);

fs.writeFileSync(output, JSON.stringify(validation, null, 2));
console.log(`Wrote ${output}`);

if (!validation.ok) process.exitCode = 2;
