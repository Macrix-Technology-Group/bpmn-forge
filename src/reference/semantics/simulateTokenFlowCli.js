import fs from 'fs';
import { normalizeIr } from '../../normalizer.js';
import { adaptIrToReferenceModelV26 } from '../model/referenceModelV26Adapter.js';
import { validateReferenceModelV26 } from '../model/referenceModelV26Validator.js';
import { simulateTokenFlow } from './tokenSimulator.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/token_simulation.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = normalizeIr(JSON.parse(fs.readFileSync(input, 'utf8')));
const model = adaptIrToReferenceModelV26(ir);
const validation = validateReferenceModelV26(model);
const state = validation.ok ? simulateTokenFlow(model) : null;

fs.writeFileSync(output, JSON.stringify({ validation, state }, null, 2));
console.log(`Wrote ${output}`);

if (!validation.ok) process.exitCode = 2;
