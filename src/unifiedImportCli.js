import fs from 'fs';
import { importUnifiedBpmnXml } from './unifiedBpmnImporter.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/unified_import.ir.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = importUnifiedBpmnXml(fs.readFileSync(input, 'utf8'));
fs.writeFileSync(output, JSON.stringify(ir, null, 2));

console.log(`Wrote ${output}`);
