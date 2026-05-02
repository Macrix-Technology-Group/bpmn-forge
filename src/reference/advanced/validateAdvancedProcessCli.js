import fs from 'fs';
import { adaptAdvancedBpmn } from './advancedProcessAdapter.js';
import { validateAdvancedProcessModel } from './advancedProcessValidator.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/advanced_process_validation.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const model = adaptAdvancedBpmn(fs.readFileSync(input, 'utf8'));
const validation = validateAdvancedProcessModel(model);

fs.writeFileSync(output, JSON.stringify(validation, null, 2));
console.log(`Wrote ${output}`);

if (!validation.ok) process.exitCode = 2;
