import fs from 'fs';
import { importUnifiedBpmnXml } from '../../../unifiedBpmnImporter.js';
import { adaptIrToReferenceModelV26 } from '../../model/referenceModelV26Adapter.js';
import { validateReferenceModelV26 } from '../../model/referenceModelV26Validator.js';
import { validateEventSemantics } from './eventSemantics.js';
import { simulateEventAwareTokenFlow } from './eventAwareTokenSimulator.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/event_semantics_simulation_from_xml.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = importUnifiedBpmnXml(fs.readFileSync(input, 'utf8'));
const model = adaptIrToReferenceModelV26(ir);
const modelValidation = validateReferenceModelV26(model);
const eventValidation = validateEventSemantics(model);
const simulation = modelValidation.ok && eventValidation.ok ? simulateEventAwareTokenFlow(model) : null;

fs.writeFileSync(output, JSON.stringify({ modelValidation, eventValidation, simulation }, null, 2));
console.log(`Wrote ${output}`);

if (!modelValidation.ok || !eventValidation.ok) process.exitCode = 2;
