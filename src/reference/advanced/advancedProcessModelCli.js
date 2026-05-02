import fs from 'fs';

const model = JSON.parse(fs.readFileSync('src/reference/advanced/advancedProcessTypesModel.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('schemas/reference/bpmn-advanced-process-types.schema.json', 'utf8'));

const report = {
  version: model.version,
  processTypes: Object.keys(model.processTypes || {}),
  schemaTitle: schema.title
};

fs.mkdirSync('reports/reference', { recursive: true });
fs.writeFileSync('reports/reference/advanced_process_model_report.json', JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
