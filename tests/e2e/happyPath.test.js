import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { importBpmnXml } from '../../src/bpmnXmlImporter.js';
import { adaptIrToReferenceModelV26 } from '../../src/reference/model/referenceModelV26Adapter.js';
import { validateExecutionSemanticsReadiness } from '../../src/reference/execution/executionSemanticsValidator.js';
import { simulateStrongExecutionFromIr } from '../../src/reference/execution/strongExecutionSimulator.js';
import { runVerifiedRender } from '../../src/pipeline.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE = path.join(__dirname, '..', 'bpmn', 'inbound_we.bpmn');

describe('end-to-end happy path: inbound_we.bpmn', () => {
  const xml = fs.readFileSync(SAMPLE, 'utf8');

  it('imports BPMN XML into IR with nodes and edges', () => {
    const ir = importBpmnXml(xml);
    expect(ir.process).toBeDefined();
    expect(ir.process.nodes.length).toBeGreaterThan(0);
    expect(ir.process.edges.length).toBeGreaterThan(0);
  });

  it('adapts IR to a Reference Model v26 that passes execution-readiness validation', () => {
    const ir = importBpmnXml(xml);
    const refModel = adaptIrToReferenceModelV26(ir);
    expect(refModel.modelType).toBe('BPMN_REFERENCE_MODEL');
    const validation = validateExecutionSemanticsReadiness(refModel);
    expect(validation.ok, JSON.stringify(validation.errors)).toBe(true);
  });

  it('runs strong execution and reaches a clean terminal state', () => {
    const ir = importBpmnXml(xml);
    const state = simulateStrongExecutionFromIr(ir);

    expect(state.trace.length).toBeGreaterThan(0);

    const errorIncidents = (state.incidents || []).filter(i => i.severity === 'error');
    expect(errorIncidents, JSON.stringify(errorIncidents)).toEqual([]);

    const consumed = state.tokens.filter(t => t.state === 'consumed');
    expect(consumed.length).toBeGreaterThan(0);
  });

  it('renders verified SVG from BPMN XML', async () => {
    const result = await runVerifiedRender(xml);
    expect(result.svg).toMatch(/^<\?xml/);
    expect(result.svg.length).toBeGreaterThan(100);
    expect(result.report.validation1.ok).toBe(true);
    expect(['elk', 'swimlanes']).toContain(result.renderMode);
  });
});
