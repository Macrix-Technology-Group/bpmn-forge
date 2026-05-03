import { describe, it, expect, vi } from 'vitest';
import { validateIr } from '../../src/validator.js';

describe('validateIr structural rules', () => {
  // Reproduces the "Escalate to Senior Agent" screenshot: a task with two
  // outgoing sequence flows and another with two incoming, no gateways.
  it('rejects implicit fork from a task and implicit merge into a task', () => {
    const ir = {
      process: {
        id: 'p', name: 'P',
        nodes: [
          { id: 's',     type: 'event', subtype: 'start', name: 'Start' },
          { id: 'esc',   type: 'task',  subtype: 'service', name: 'Escalate' },
          { id: 'pass',  type: 'task',  subtype: 'service', name: 'Issue Pass' },
          { id: 'conf',  type: 'task',  subtype: 'user',    name: 'Confirm Itinerary' },
          { id: 'alt',   type: 'task',  subtype: 'user',    name: 'Select Alt Flight' },
          { id: 'e',     type: 'event', subtype: 'end',     name: 'End' }
        ],
        edges: [
          { id: 'e1', source: 's',    target: 'esc' },
          // Implicit fork from `esc` (two outgoing edges, no gateway)
          { id: 'e2', source: 'esc',  target: 'pass' },
          { id: 'e3', source: 'esc',  target: 'alt' },
          // Implicit merge into `alt` (two incoming edges)
          { id: 'e4', source: 'conf', target: 'alt' },
          { id: 'e5', source: 'pass', target: 'e' },
          { id: 'e6', source: 'alt',  target: 'e' }
        ]
      }
    };
    const r = validateIr(ir);
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => /esc.*outgoing.*implicit fork/i.test(e))).toBe(true);
    expect(r.errors.some(e => /alt.*incoming.*implicit merge/i.test(e))).toBe(true);
  });

  it('accepts gateways with multiple incoming or outgoing flows', () => {
    const ir = {
      process: {
        id: 'p', name: 'P',
        nodes: [
          { id: 's',  type: 'event',   subtype: 'start' },
          { id: 'g1', type: 'gateway', subtype: 'exclusive' },
          { id: 'a',  type: 'task',    subtype: 'user' },
          { id: 'b',  type: 'task',    subtype: 'user' },
          { id: 'g2', type: 'gateway', subtype: 'exclusive' },
          { id: 'e',  type: 'event',   subtype: 'end' }
        ],
        edges: [
          { id: 'x1', source: 's',  target: 'g1' },
          { id: 'x2', source: 'g1', target: 'a',  isDefault: true },
          { id: 'x3', source: 'g1', target: 'b' },
          { id: 'x4', source: 'a',  target: 'g2' },
          { id: 'x5', source: 'b',  target: 'g2' },
          { id: 'x6', source: 'g2', target: 'e' }
        ]
      }
    };
    expect(validateIr(ir).ok).toBe(true);
  });

  it('warns (not errors) on multiple incoming flows to an end event', () => {
    const ir = {
      process: {
        id: 'p', name: 'P',
        nodes: [
          { id: 's', type: 'event', subtype: 'start' },
          { id: 'g', type: 'gateway', subtype: 'exclusive' },
          { id: 'a', type: 'task', subtype: 'user' },
          { id: 'b', type: 'task', subtype: 'user' },
          { id: 'e', type: 'event', subtype: 'end' }
        ],
        edges: [
          { id: 'e1', source: 's', target: 'g' },
          { id: 'e2', source: 'g', target: 'a', isDefault: true },
          { id: 'e3', source: 'g', target: 'b' },
          { id: 'e4', source: 'a', target: 'e' },
          { id: 'e5', source: 'b', target: 'e' }
        ]
      }
    };
    const r = validateIr(ir);
    expect(r.ok).toBe(true);
    expect(r.warnings.some(w => /end event.*incoming/i.test(w))).toBe(true);
  });

  it('rejects a start event with incoming flow and an end event with outgoing flow', () => {
    const ir = {
      process: {
        id: 'p', name: 'P',
        nodes: [
          { id: 's', type: 'event', subtype: 'start' },
          { id: 'a', type: 'task', subtype: 'user' },
          { id: 'e', type: 'event', subtype: 'end' }
        ],
        edges: [
          { id: 'e1', source: 'a', target: 's' },
          { id: 'e2', source: 's', target: 'a' },
          { id: 'e3', source: 'a', target: 'e' },
          { id: 'e4', source: 'e', target: 'a' }
        ]
      }
    };
    const r = validateIr(ir);
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => /Start event.*incoming/i.test(e))).toBe(true);
    expect(r.errors.some(e => /End event.*outgoing/i.test(e))).toBe(true);
  });

  it('rejects boundary events with incoming flows or multiple outgoing', () => {
    const ir = {
      process: {
        id: 'p', name: 'P',
        nodes: [
          { id: 's',   type: 'event',   subtype: 'start' },
          { id: 'g',   type: 'gateway', subtype: 'exclusive' },
          { id: 't',   type: 'task',    subtype: 'user' },
          { id: 'be',  type: 'event',   subtype: 'boundary', attachedTo: 't' },
          { id: 'h1',  type: 'task',    subtype: 'service' },
          { id: 'h2',  type: 'task',    subtype: 'service' },
          { id: 'e',   type: 'event',   subtype: 'end' }
        ],
        edges: [
          { id: 'e1', source: 's',  target: 't' },
          { id: 'e2', source: 't',  target: 'e' },
          // boundary getting an incoming flow (illegal)
          { id: 'e3', source: 'g',  target: 'be' },
          // boundary fanning out to two handlers (illegal)
          { id: 'e4', source: 'be', target: 'h1' },
          { id: 'e5', source: 'be', target: 'h2' },
          { id: 'e6', source: 'h1', target: 'e' },
          { id: 'e7', source: 'h2', target: 'e' }
        ]
      }
    };
    const r = validateIr(ir);
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => /Boundary event be.*incoming/i.test(e))).toBe(true);
    expect(r.errors.some(e => /Boundary event be.*outgoing/i.test(e))).toBe(true);
  });
});

// Exercise the repair-loop control flow without making real API calls.
// We mock generateIrFromPromptLlm: the first call returns an IR with an
// implicit fork; the second call (the repair) returns a fixed IR.
describe('textToIrWithLlm repair round-trip', () => {
  it('retries with errors when the first IR is structurally invalid', async () => {
    const calls = [];
    vi.doMock('../../src/nl/llmPromptGenerator.js', () => ({
      generateIrFromPromptLlm: async (_text, options) => {
        calls.push(options || {});
        if (!options?.repair) {
          // First call: bad IR with an implicit fork.
          return {
            ir: {
              process: {
                id: 'p', name: 'P',
                nodes: [
                  { id: 's', type: 'event', subtype: 'start' },
                  { id: 'a', type: 'task', subtype: 'user' },
                  { id: 'b', type: 'task', subtype: 'user' },
                  { id: 'c', type: 'task', subtype: 'user' },
                  { id: 'e', type: 'event', subtype: 'end' }
                ],
                edges: [
                  { id: 'e1', source: 's', target: 'a' },
                  { id: 'e2', source: 'a', target: 'b' },
                  { id: 'e3', source: 'a', target: 'c' }, // implicit fork
                  { id: 'e4', source: 'b', target: 'e' },
                  { id: 'e5', source: 'c', target: 'e' }
                ]
              }
            }
          };
        }
        // Repair call: well-formed IR.
        return {
          ir: {
            process: {
              id: 'p', name: 'P',
              nodes: [
                { id: 's', type: 'event', subtype: 'start' },
                { id: 'a', type: 'task', subtype: 'user' },
                { id: 'g', type: 'gateway', subtype: 'parallel' },
                { id: 'b', type: 'task', subtype: 'user' },
                { id: 'c', type: 'task', subtype: 'user' },
                { id: 'e', type: 'event', subtype: 'end' }
              ],
              edges: [
                { id: 'e1', source: 's', target: 'a' },
                { id: 'e2', source: 'a', target: 'g' },
                { id: 'e3', source: 'g', target: 'b' },
                { id: 'e4', source: 'g', target: 'c' },
                { id: 'e5', source: 'b', target: 'e' },
                { id: 'e6', source: 'c', target: 'e' }
              ]
            }
          }
        };
      }
    }));
    const { textToIrWithLlm } = await import('../../src/textToIrLlmParser.js');
    const ir = await textToIrWithLlm('whatever');
    expect(calls).toHaveLength(2);
    expect(calls[0].repair).toBeUndefined();
    expect(calls[1].repair).toBeDefined();
    expect(calls[1].repair.errors.some(e => /implicit fork/i.test(e))).toBe(true);
    expect(ir.process.nodes.some(n => n.type === 'gateway')).toBe(true);
    vi.doUnmock('../../src/nl/llmPromptGenerator.js');
  });
});
