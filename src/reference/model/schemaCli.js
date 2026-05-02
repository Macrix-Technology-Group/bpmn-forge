import fs from 'fs';

const schema = JSON.parse(fs.readFileSync('schemas/reference/bpmn-reference-model.schema.json', 'utf8'));
const report = {
  title: schema.title,
  id: schema.$id,
  required: schema.required,
  topLevelProperties: Object.keys(schema.properties || {})
};

fs.mkdirSync('reports/reference', { recursive: true });
fs.writeFileSync('reports/reference/schema_report.json', JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
