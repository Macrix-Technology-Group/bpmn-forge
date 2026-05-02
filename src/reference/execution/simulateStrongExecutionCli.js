import fs from 'fs';
import { importUnifiedBpmnXml } from '../../unifiedBpmnImporter.js';
import { adaptIrToReferenceModelV26 } from '../model/referenceModelV26Adapter.js';
import { validateReferenceModelV26 } from '../model/referenceModelV26Validator.js';
import { validateExecutionSemanticsReadiness } from './executionSemanticsValidator.js';
import { simulateStrongExecution } from './strongExecutionSimulator.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/strong_execution_simulation.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = importUnifiedBpmnXml(fs.readFileSync(input, 'utf8'));
const model = adaptIrToReferenceModelV26(ir);
const modelValidation = validateReferenceModelV26(model);
const executionValidation = validateExecutionSemanticsReadiness(model);
const state = modelValidation.ok && executionValidation.ok ? simulateStrongExecution(model) : null;

fs.writeFileSync(output, JSON.stringify({ modelValidation, executionValidation, state }, null, 2));
console.log(`Wrote ${output}`);

if (!modelValidation.ok || !executionValidation.ok) process.exitCode = 2;
