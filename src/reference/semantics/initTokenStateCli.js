import fs from 'fs';
import { normalizeIr } from '../../normalizer.js';
import { adaptIrToReferenceModelV26 } from '../model/referenceModelV26Adapter.js';
import { createInitialTokenState, resetTokenCounter } from './tokenState.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/token_state.initial.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

resetTokenCounter();
const ir = normalizeIr(JSON.parse(fs.readFileSync(input, 'utf8')));
const model = adaptIrToReferenceModelV26(ir);
const state = createInitialTokenState(model);

fs.writeFileSync(output, JSON.stringify(state, null, 2));
console.log(`Wrote ${output}`);
