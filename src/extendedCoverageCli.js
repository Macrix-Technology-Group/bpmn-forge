import fs from 'fs';
import { importExtendedBpmnXml } from './extendedBpmnImport.js';

const input = process.argv[2];
const output = process.argv[3] || 'output/extended_coverage.ir.json';

fs.mkdirSync(output.substring(0, output.lastIndexOf('/')) || '.', { recursive: true });

const ir = importExtendedBpmnXml(fs.readFileSync(input, 'utf8'));
fs.writeFileSync(output, JSON.stringify(ir, null, 2));

const report = {
  nodes: ir.process.nodes?.length || 0,
  edges: ir.process.edges?.length || 0,
  participants: ir.process.participants?.length || 0,
  lanes: (ir.process.participants || []).flatMap(p => p.lanes || []).length,
  dataObjects: ir.process.data?.objects?.length || 0,
  associations: ir.process.data?.associations?.length || 0,
  annotations: ir.process.data?.annotations?.length || 0,
  subprocesses: ir.process.subprocesses?.length || 0,
  diShapes: Object.keys(ir.process.di?.shapes || {}).length,
  diEdges: Object.keys(ir.process.di?.edges || {}).length
};
fs.writeFileSync(output.replace(/\.ir\.json$/, '.coverage.json'), JSON.stringify(report, null, 2));
console.log(`Wrote ${output}`);
