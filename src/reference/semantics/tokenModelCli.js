import fs from 'fs';

const model = JSON.parse(fs.readFileSync('src/reference/semantics/tokenModel.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('schemas/reference/bpmn-token-state.schema.json', 'utf8'));

const report = {
  version: model.version,
  model: model.model,
  entityCount: Object.keys(model.entities || {}).length,
  supportedSemantics: Object.keys(model.supportedSemanticsV27 || {}),
  unsupportedOrPartial: model.unsupportedOrPartial,
  schemaTitle: schema.title
};

fs.mkdirSync('reports/reference', { recursive: true });
fs.writeFileSync('reports/reference/token_model_report.json', JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
