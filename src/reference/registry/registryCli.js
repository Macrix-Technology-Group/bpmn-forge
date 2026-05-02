import fs from 'fs';

const registry = JSON.parse(fs.readFileSync('src/reference/registry/bpmnElementRegistry.json', 'utf8'));
const categories = Object.entries(registry.categories).map(([name, elements]) => ({
  name,
  count: elements.length,
  elements
}));

const report = {
  version: registry.version,
  categoryCount: categories.length,
  totalElements: categories.reduce((sum, c) => sum + c.count, 0),
  categories
};

fs.mkdirSync('reports/reference', { recursive: true });
fs.writeFileSync('reports/reference/bpmn_element_registry_report.json', JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
