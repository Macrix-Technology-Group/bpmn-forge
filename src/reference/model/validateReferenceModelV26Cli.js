import fs from 'fs';
import { normalizeIr } from '../../normalizer.js';
import { adaptIrToReferenceModelV26 } from './referenceModelV26Adapter.js';
import { validateReferenceModelV26 } from './referenceModelV26Validator.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/reference_validation_v26.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = normalizeIr(JSON.parse(fs.readFileSync(input, 'utf8')));
const model = adaptIrToReferenceModelV26(ir);
const validation = validateReferenceModelV26(model);

fs.writeFileSync(output, JSON.stringify(validation, null, 2));
console.log(`Wrote ${output}`);

if (!validation.ok) process.exitCode = 2;
