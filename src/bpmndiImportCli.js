import fs from 'fs';
import { importExtendedBpmnXml } from './extendedBpmnImport.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/imported_with_di.ir.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = importExtendedBpmnXml(fs.readFileSync(input, 'utf8'));
fs.writeFileSync(output, JSON.stringify(ir, null, 2));

console.log(`Wrote ${output}`);
