// Validates an IR against the structural rules of well-formed BPMN.
//
// Errors (blocking — IR is malformed and downstream tools would silently misbehave):
//   - Missing process / missing node id / missing node type
//   - Duplicate node id
//   - Edge references a non-existent source or target
//   - Boundary event without `attachedTo`, with any incoming sequence flow,
//     or with more than one outgoing sequence flow
//   - Implicit FORK: a non-gateway node with more than one OUTGOING sequence
//     flow. Splits must go through a gateway — a task with two outgoing arrows
//     is parallel-by-default in the BPMN spec but ambiguous in practice.
//   - Implicit MERGE INTO WORK: a task / subprocess / start event /
//     intermediate event with more than one INCOMING sequence flow. Merges
//     must go through a converging gateway.
//   - Start event with any incoming sequence flow (it's the source of work,
//     never a target).
//   - End event with any outgoing sequence flow (it's a sink).
//
// Warnings (non-blocking — flagged but acceptable):
//   - No start / end event
//   - End event with multiple incoming sequence flows. Strictly speaking
//     this is also an implicit XOR-merge, but multiple flows landing on a
//     single end event is so widely used in real BPMN (and supported by
//     every tool we've imported from) that we accept it. The prompt-side
//     guidance still recommends a single end event with a converging
//     gateway when it matters semantically.

export function validateIr(ir) {
  const errors = [];
  const warnings = [];
  const p = ir?.process;
  if (!p) return { ok: false, errors: ['Missing process'], warnings };

  const nodeIds = new Set();
  const nodeById = new Map();
  for (const n of p.nodes || []) {
    if (!n.id) errors.push('Node missing id');
    if (!n.type) errors.push(`Node ${n.id || '?'} missing type`);
    if (n.id && nodeIds.has(n.id)) errors.push(`Duplicate node id: ${n.id}`);
    if (n.id) {
      nodeIds.add(n.id);
      nodeById.set(n.id, n);
    }
    if (n.type === 'event' && n.subtype === 'boundary' && !n.attachedTo) {
      errors.push(`Boundary event ${n.id} missing attachedTo`);
    }
  }

  const inDeg = new Map();
  const outDeg = new Map();
  for (const e of p.edges || []) {
    if (!nodeIds.has(e.source)) errors.push(`Edge ${e.id} source missing: ${e.source}`);
    if (!nodeIds.has(e.target)) errors.push(`Edge ${e.id} target missing: ${e.target}`);
    inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
    outDeg.set(e.source, (outDeg.get(e.source) || 0) + 1);
  }

  for (const n of p.nodes || []) {
    if (!n.id) continue;
    const i = inDeg.get(n.id) || 0;
    const o = outDeg.get(n.id) || 0;

    if (n.type === 'gateway') continue; // gateways may fan in/out freely

    if (n.subtype === 'boundary') {
      if (i > 0) errors.push(`Boundary event ${n.id} has incoming sequence flow (${i}); boundary events are triggered by events on their host, not by sequence flow`);
      if (o > 1) errors.push(`Boundary event ${n.id} has ${o} outgoing sequence flows; boundary events have at most one`);
      continue;
    }

    if (n.type === 'event' && n.subtype === 'start') {
      if (i > 0) errors.push(`Start event ${n.id} has incoming sequence flow (${i}); start events are the source of work, never a target`);
      if (o > 1) errors.push(`Start event ${n.id} has ${o} outgoing sequence flows; insert a gateway to split`);
      continue;
    }

    if (n.type === 'event' && n.subtype === 'end') {
      if (o > 0) errors.push(`End event ${n.id} has outgoing sequence flow (${o}); end events are sinks`);
      if (i > 1) warnings.push(`End event ${n.id} has ${i} incoming sequence flows (implicit XOR-merge). Acceptable BPMN pattern, but consider a converging gateway if semantics matter`);
      continue;
    }

    // Tasks, subprocesses, intermediate events: strict 1-in / 1-out.
    if (o > 1) {
      errors.push(`${describe(n)} ${n.id} has ${o} outgoing sequence flows (implicit fork). Insert a gateway to split into multiple paths`);
    }
    if (i > 1) {
      errors.push(`${describe(n)} ${n.id} has ${i} incoming sequence flows (implicit merge). Insert a converging gateway to merge multiple paths`);
    }
  }

  if (!(p.nodes || []).some(n => n.type === 'event' && n.subtype === 'start')) warnings.push('No start event');
  if (!(p.nodes || []).some(n => n.type === 'event' && n.subtype === 'end')) warnings.push('No end event');
  return { ok: errors.length === 0, errors, warnings };
}

function describe(n) {
  if (n.type === 'task') return 'Task';
  if (n.type === 'subprocess') return 'Subprocess';
  if (n.type === 'event') return `${n.subtype || 'Intermediate'} event`;
  return n.type;
}
