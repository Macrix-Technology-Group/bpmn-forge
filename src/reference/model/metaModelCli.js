import fs from 'fs';

const meta = JSON.parse(fs.readFileSync('src/reference/model/bpmnReferenceMetaModel.json', 'utf8'));
const report = {
  version: meta.version,
  abstractTypeCount: Object.keys(meta.abstractTypes || {}).length,
  concreteTypeCount: Object.keys(meta.concreteTypes || {}).length,
  eventDefinitionCount: (meta.eventDefinitions || []).length,
  validationRuleCount: (meta.validationRules || []).length,
  concreteTypes: Object.keys(meta.concreteTypes || {})
};

fs.mkdirSync('reports/reference', { recursive: true });
fs.writeFileSync('reports/reference/metamodel_report.json', JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
