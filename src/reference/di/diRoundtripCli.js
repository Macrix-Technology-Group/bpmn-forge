import fs from 'fs';
import { importUnifiedBpmnXml } from '../../unifiedBpmnImporter.js';
import { parseCompleteBpmndi } from './completeDiParser.js';
import { exportBpmnXmlWithCompleteDi } from './completeBpmndiXml.js';
import { validateCompleteDi } from './diValidator.js';

const input = process.argv[2];
const outputBase = process.argv[3] || 'output/di_roundtrip';

fs.mkdirSync(outputBase.substring(0, outputBase.lastIndexOf('/')) || '.', { recursive: true });

const xml = fs.readFileSync(input, 'utf8');
const ir = importUnifiedBpmnXml(xml);
const importedDi = parseCompleteBpmndi(xml);
const exportedXml = exportBpmnXmlWithCompleteDi(ir);
const reimportedDi = parseCompleteBpmndi(exportedXml);
const validation = validateCompleteDi(ir, reimportedDi);

fs.writeFileSync(`${outputBase}.imported-di.json`, JSON.stringify(importedDi, null, 2));
fs.writeFileSync(`${outputBase}.exported.bpmn`, exportedXml);
fs.writeFileSync(`${outputBase}.reimported-di.json`, JSON.stringify(reimportedDi, null, 2));
fs.writeFileSync(`${outputBase}.validation.json`, JSON.stringify(validation, null, 2));

console.log(`Wrote ${outputBase}.*`);

if (!validation.ok) process.exitCode = 2;
