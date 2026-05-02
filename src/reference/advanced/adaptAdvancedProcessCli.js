import fs from 'fs';
import { adaptAdvancedBpmn } from './advancedProcessAdapter.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/advanced_process_model.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const model = adaptAdvancedBpmn(fs.readFileSync(input, 'utf8'));
fs.writeFileSync(output, JSON.stringify(model, null, 2));

console.log(`Wrote ${output}`);
