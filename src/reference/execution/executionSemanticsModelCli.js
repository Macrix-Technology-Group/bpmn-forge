import fs from 'fs';

const model = JSON.parse(fs.readFileSync('src/reference/execution/executionSemanticsModel.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('schemas/reference/bpmn-execution-state.schema.json', 'utf8'));

const report = {
  version: model.version,
  model: model.model,
  semantics: Object.keys(model.semantics || {}),
  schemaTitle: schema.title,
  supportLevel: model.supportLevelV31
};

fs.mkdirSync('reports/reference', { recursive: true });
fs.writeFileSync('reports/reference/execution_semantics_model_report.json', JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
