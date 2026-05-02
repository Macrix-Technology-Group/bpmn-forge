import fs from 'fs';
import { normalizeIr } from '../../normalizer.js';
import { adaptIrToReferenceModel } from './referenceModelAdapter.js';
import { validateReferenceModel } from './validateReferenceModel.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/reference_validation.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = normalizeIr(JSON.parse(fs.readFileSync(input, 'utf8')));
const model = adaptIrToReferenceModel(ir);
const validation = validateReferenceModel(model);

fs.writeFileSync(output, JSON.stringify(validation, null, 2));
console.log(`Wrote ${output}`);

if (!validation.ok) process.exitCode = 2;
