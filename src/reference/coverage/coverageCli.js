import fs from 'fs';

const matrix = JSON.parse(fs.readFileSync('src/reference/coverage/bpmnCoverageMatrix.json', 'utf8'));
const elements = Object.entries(matrix.elements);

const dimensions = ['parser', 'exporter', 'renderer', 'semantics', 'tests'];
const summary = {};
for (const dim of dimensions) {
  summary[dim] = {
    supported: elements.filter(([, v]) => v[dim] === 'supported').length,
    partial: elements.filter(([, v]) => v[dim] === 'partial').length,
    missing: elements.filter(([, v]) => v[dim] === 'missing').length,
    not_applicable: elements.filter(([, v]) => v[dim] === 'not_applicable').length
  };
}

const report = {
  version: matrix.version,
  totalElements: elements.length,
  summary,
  missingSemantics: elements.filter(([, v]) => v.semantics === 'missing').map(([k]) => k),
  missingParser: elements.filter(([, v]) => v.parser === 'missing').map(([k]) => k)
};

fs.mkdirSync('reports/reference', { recursive: true });
fs.writeFileSync('reports/reference/bpmn_coverage_report.json', JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
