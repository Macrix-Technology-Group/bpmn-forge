import { exportBpmnXml, esc } from '../../bpmnXmlExporter.js';
import { buildCompleteDi } from './completeDiBuilder.js';

function boundsXml(bounds) {
  return `<dc:Bounds x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" />`;
}

function labelXml(label) {
  if (!label?.bounds) return '';
  return `
          <bpmndi:BPMNLabel>
            ${boundsXml(label.bounds)}
          </bpmndi:BPMNLabel>`;
}

function shapeXml(shape, label) {
  return `      <bpmndi:BPMNShape id="${esc(shape.id)}" bpmnElement="${esc(shape.bpmnElement)}">
        ${boundsXml(shape.bounds)}${labelXml(label)}
      </bpmndi:BPMNShape>`;
}

function edgeXml(edge, label) {
  const waypoints = (edge.waypoints || []).map(p => `        <di:waypoint x="${p.x}" y="${p.y}" />`).join('\n');
  return `      <bpmndi:BPMNEdge id="${esc(edge.id)}" bpmnElement="${esc(edge.bpmnElement)}">
${waypoints}${labelXml(label)}
      </bpmndi:BPMNEdge>`;
}

export function exportBpmnXmlWithCompleteDi(ir) {
  const baseXml = exportBpmnXml(ir);
  const di = buildCompleteDi(ir);
  const diagram = di.diagrams[0];

  const shapes = Object.entries(di.shapes).map(([key, shape]) => shapeXml(shape, di.labels[key])).join('\n');
  const edges = Object.entries(di.edges).map(([key, edge]) => edgeXml(edge, di.labels[key])).join('\n');

  const diXml = `
  <bpmndi:BPMNDiagram id="${esc(diagram.id)}">
    <bpmndi:BPMNPlane id="${esc(diagram.plane.id)}" bpmnElement="${esc(diagram.plane.bpmnElement)}">
${shapes}
${edges}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>`;

  return baseXml
    .replace('<bpmn:definitions ', '<bpmn:definitions xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" ')
    .replace('</bpmn:definitions>', `${diXml}\n</bpmn:definitions>`);
}
