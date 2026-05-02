import fs from 'fs';

const model = JSON.parse(fs.readFileSync('src/reference/semantics/events/eventSemanticsModel.json', 'utf8'));
const schema = JSON.parse(fs.readFileSync('schemas/reference/bpmn-event-state.schema.json', 'utf8'));

const report = {
  version: model.version,
  eventTypes: Object.keys(model.eventDefinitions || {}),
  semanticEventCount: (model.semanticEvents || []).length,
  schemaTitle: schema.title,
  supportLevel: model.supportLevelV28
};

fs.mkdirSync('reports/reference', { recursive: true });
fs.writeFileSync('reports/reference/event_semantics_model_report.json', JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
