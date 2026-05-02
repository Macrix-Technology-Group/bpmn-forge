import fs from 'fs';

const model = JSON.parse(fs.readFileSync('src/reference/di/bpmndiCompletionModel.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('schemas/reference/bpmndi-complete.schema.json', 'utf8'));

const report = {
  version: model.version,
  compatibilityTarget: model.compatibilityTarget,
  elements: Object.keys(model.elements || {}),
  schemaTitle: schema.title
};

fs.mkdirSync('reports/reference', { recursive: true });
fs.writeFileSync('reports/reference/bpmndi_completion_model_report.json', JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
