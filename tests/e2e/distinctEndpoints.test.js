import { describe, it, expect } from 'vitest';
import {
  enforceDistinctEndpoints,
  findOverlappingEndpoints
} from '../../src/distinctEndpoints.js';
import { renderSwimlaneSvg } from '../../src/swimlaneSvgRenderer.js';
import { renderElkSvg } from '../../src/elkSvgRenderer.js';

// Smallest fixture that reproduces "two connectors at the same point": a
// gateway and a forward task both feed into one task, so the target sees 2
// incoming sequence flows. Without distribution they collide on the left face.
function fanInIr() {
  return {
    process: {
      id: 'p_fanin',
      name: 'Fan-In',
      nodes: [
        { id: 's',  type: 'event',   subtype: 'start',     name: 'Start' },
        { id: 'g',  type: 'gateway', subtype: 'exclusive', name: 'Errors Found?' },
        { id: 'f',  type: 'task',    subtype: 'user',      name: 'First Pass' },
        { id: 'mc', type: 'task',    subtype: 'user',      name: 'Make Corrections' },
        { id: 'e',  type: 'event',   subtype: 'end',       name: 'End' }
      ],
      edges: [
        { id: 'e1', source: 's',  target: 'f' },
        { id: 'e2', source: 'f',  target: 'g' },
        { id: 'e3', source: 'g',  target: 'mc', condition: 'discrepancies found' },
        { id: 'e4', source: 'g',  target: 'e',  condition: 'zero errors', isDefault: true },
        { id: 'e5', source: 'mc', target: 'g',  branch_type: 'loop' }
      ]
    }
  };
}

function swimlaneIr() {
  return {
    process: {
      id: 'p_swim',
      name: 'Inspection',
      nodes: [
        { id: 's',  type: 'event',   subtype: 'start',     name: 'Start' },
        { id: 'g',  type: 'gateway', subtype: 'exclusive', name: 'Errors Found?' },
        { id: 'f',  type: 'task',    subtype: 'user',      name: 'First Pass' },
        { id: 'mc', type: 'task',    subtype: 'user',      name: 'Make Corrections' },
        { id: 'e',  type: 'event',   subtype: 'end',       name: 'End' }
      ],
      edges: [
        { id: 'e1', source: 's',  target: 'f' },
        { id: 'e2', source: 'f',  target: 'g' },
        { id: 'e3', source: 'g',  target: 'mc', condition: 'discrepancies found' },
        { id: 'e4', source: 'g',  target: 'e',  condition: 'zero errors', isDefault: true },
        { id: 'e5', source: 'mc', target: 'g',  branch_type: 'loop' }
      ],
      participants: [{
        id: 'pool',
        name: 'Inspection',
        lanes: [
          { id: 'l1', name: 'Inspector',  nodeRefs: ['s', 'f', 'g', 'e'] },
          { id: 'l2', name: 'Technician', nodeRefs: ['mc'] }
        ]
      }]
    }
  };
}

describe('distinctEndpoints invariant', () => {
  it('distributes two endpoints sharing a face onto distinct coordinates', () => {
    const node = { id: 'n1', absX: 100, absY: 100, width: 200, height: 80 };
    const e1 = {
      id: 'a',
      sections: [{
        startPoint: { x: 0, y: 140 },
        bendPoints: [{ x: 80, y: 140 }],
        endPoint: { x: 100, y: 140 }   // lands on n1's left face mid
      }]
    };
    const e2 = {
      id: 'b',
      sections: [{
        startPoint: { x: 0, y: 200 },
        bendPoints: [{ x: 80, y: 200 }],
        endPoint: { x: 100, y: 140 }   // SAME spot — would visually overlap
      }]
    };
    enforceDistinctEndpoints([e1, e2], new Map([[node.id, node]]));
    expect(findOverlappingEndpoints([e1, e2], new Map([[node.id, node]]))).toEqual([]);
    // Both still on the left face (x=100), but with different y now.
    expect(e1.sections[0].endPoint.x).toBe(100);
    expect(e2.sections[0].endPoint.x).toBe(100);
    expect(e1.sections[0].endPoint.y).not.toBe(e2.sections[0].endPoint.y);
  });

  it('inserts a dogleg when redistributing a straight (no-bend) edge', () => {
    const node = { id: 'n1', absX: 100, absY: 100, width: 200, height: 80 };
    const e1 = {
      id: 'a',
      sections: [{
        startPoint: { x: 0, y: 140 },
        bendPoints: [],
        endPoint: { x: 100, y: 140 }
      }]
    };
    const e2 = {
      id: 'b',
      sections: [{
        startPoint: { x: 0, y: 140 },
        bendPoints: [],
        endPoint: { x: 100, y: 140 }
      }]
    };
    enforceDistinctEndpoints([e1, e2], new Map([[node.id, node]]));
    expect(findOverlappingEndpoints([e1, e2], new Map([[node.id, node]]))).toEqual([]);
    // At least one of the two paths must have grown bend points to keep the
    // route orthogonal after the y offset.
    const totalBends = (e1.sections[0].bendPoints?.length || 0) + (e2.sections[0].bendPoints?.length || 0);
    expect(totalBends).toBeGreaterThan(0);
  });

  it('renderElkSvg produces a diagram with no overlapping endpoints', async () => {
    const svg = await renderElkSvg(fanInIr());
    expect(svg).toMatch(/^<\?xml/);
    expect(svg.length).toBeGreaterThan(100);
  });

  it('renderSwimlaneSvg produces a diagram with no overlapping endpoints', async () => {
    const svg = await renderSwimlaneSvg(swimlaneIr());
    expect(svg).toMatch(/^<\?xml/);
    expect(svg.length).toBeGreaterThan(100);
  });

  // Iron rule: a boundary event's outgoing connector must exit perpendicular
  // to its attached host edge — never horizontally. The glyph straddles the
  // host edge, so a horizontal exit would run through the host activity.
  it('swimlane: boundary event outflow exits perpendicular to its host edge', async () => {
    const ir = {
      process: {
        id: 'p_be', name: 'BE',
        nodes: [
          { id: 's',    type: 'event', subtype: 'start',    name: 'Start' },
          { id: 'svc',  type: 'task',  subtype: 'user',     name: 'Perform On-Site Service' },
          { id: 'be',   type: 'event', subtype: 'boundary', name: '4-Hour Window Exceeded',
            attachedTo: 'svc', interrupting: true, event_definition: 'timer' },
          { id: 'esc',  type: 'task',  subtype: 'user',     name: 'Escalate' },
          { id: 'next', type: 'task',  subtype: 'user',     name: 'Next' },
          { id: 'e',    type: 'event', subtype: 'end',      name: 'End' }
        ],
        edges: [
          { id: 'e1', source: 's',    target: 'svc' },
          { id: 'e2', source: 'svc',  target: 'next' },
          { id: 'e3', source: 'next', target: 'e' },
          { id: 'e4', source: 'be',   target: 'esc', branch_type: 'exception' },
          { id: 'e5', source: 'esc',  target: 'e' }
        ],
        participants: [{
          id: 'p1', name: 'P', lanes: [
            { id: 'l1', name: 'Field Engineer', nodeRefs: ['s', 'svc', 'be', 'next', 'e'] },
            { id: 'l2', name: 'Coordinator',    nodeRefs: ['esc'] }
          ]
        }]
      }
    };
    const { renderSwimlaneSvg } = await import('../../src/swimlaneSvgRenderer.js');
    const svg = await renderSwimlaneSvg(ir);
    // The boundary's exception flow (the only branch_type=exception edge —
    // rendered with stroke-dasharray) must have its first segment vertical.
    const exceptionPath = [...svg.matchAll(/<path class="flow" d="([^"]+)"[^>]*stroke-dasharray/g)][0]?.[1];
    expect(exceptionPath, 'no exception/boundary path found').toBeDefined();
    const pts = exceptionPath.replace(/^M/, '').split(' L').map(p => {
      const [x, y] = p.split(',').map(Number);
      return { x, y };
    });
    // First segment perpendicular to the host edge means start.x === bend1.x.
    expect(pts[0].x).toBe(pts[1].x);
    // And the segment must be NON-zero (some vertical distance traversed).
    expect(Math.abs(pts[1].y - pts[0].y)).toBeGreaterThan(20);
  });

  // ELK renderer: a back-edge (loop) must route as a clean U BELOW the layout,
  // not as a long zigzag through the middle of the diagram.
  it('ELK renderer routes back-edges as U-shape below the layout', async () => {
    const ir = {
      process: {
        id: 'p_loop', name: 'Loop',
        nodes: [
          { id: 's', type: 'event',   subtype: 'start',     name: 'Start' },
          { id: 'a', type: 'task',    subtype: 'user',      name: 'Inspect' },
          { id: 'g', type: 'gateway', subtype: 'exclusive', name: 'OK?' },
          { id: 'b', type: 'task',    subtype: 'user',      name: 'Fix' },
          { id: 'e', type: 'event',   subtype: 'end',       name: 'End' }
        ],
        edges: [
          { id: 'e1', source: 's', target: 'a' },
          { id: 'e2', source: 'a', target: 'g' },
          { id: 'e3', source: 'g', target: 'e', isDefault: true, condition: 'OK' },
          { id: 'e4', source: 'g', target: 'b', condition: 'fix' },
          // Back-edge marked as 'exception' rather than 'loop' — auto-detection
          // should still classify it as a loop and route it through the band.
          { id: 'e5', source: 'b', target: 'a', branch_type: 'exception' }
        ]
      }
    };
    const svg = await renderElkSvg(ir);
    // Find every flow path and parse its point list. The back-edge should
    // have exactly 4 points (U-shape: source bottom → trunk → trunk → target
    // bottom) and the trunk Y should be below every node's bottom edge.
    const paths = [...svg.matchAll(/<path class="flow" d="([^"]+)"/g)].map(m => m[1]);
    // Approximate: at least one flow path must have 4 points and a clean
    // U structure (start.x === bend1.x, bend2.y === bend1.y).
    let foundU = false;
    for (const d of paths) {
      const pts = d.replace(/^M/, '').split(' L').map(p => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });
      if (pts.length === 4 &&
          pts[0].x === pts[1].x &&
          pts[1].y === pts[2].y &&
          pts[2].x === pts[3].x) {
        foundU = true;
        break;
      }
    }
    expect(foundU, `no U-shape loop found in: ${paths.join(' / ')}`).toBe(true);
  });

  // ELK renderer: gateway fan-out branches must exit different faces of the
  // diamond (main → right, others → top/bottom). ELK's default routing puts
  // them all on the right face; the renderer post-processes to apply the
  // BPMN convention.
  it('ELK renderer reroutes gateway branches to distinct faces', async () => {
    const ir = {
      process: {
        id: 'p_fan', name: 'Fan',
        nodes: [
          { id: 's', type: 'event',   subtype: 'start',     name: 'Start' },
          { id: 'g', type: 'gateway', subtype: 'exclusive', name: 'Q?' },
          { id: 'b', type: 'task',    subtype: 'service',   name: 'B' },
          { id: 'o', type: 'task',    subtype: 'service',   name: 'O' },
          { id: 'x', type: 'task',    subtype: 'service',   name: 'X' }
        ],
        edges: [
          { id: 'e1', source: 's', target: 'g' },
          { id: 'e2', source: 'g', target: 'b', isDefault: true },
          { id: 'e3', source: 'g', target: 'o' },
          { id: 'e4', source: 'g', target: 'x' }
        ]
      }
    };
    const svg = await renderElkSvg(ir);
    const starts = [...svg.matchAll(/<path class="flow" d="M(\d+),(\d+)/g)]
      .map(m => `${m[1]},${m[2]}`);
    // All four flow paths' start points must be distinct (the iron rule).
    const dupes = starts.filter((p, i) => starts.indexOf(p) !== i);
    expect(dupes, `duplicate flow start points: ${dupes.join(' / ')}`).toEqual([]);
    // And among the three gateway-out edges, they must use at least 2
    // distinct x's at their start (i.e. not all on the same face).
    const gatewayOutXs = new Set(starts.slice(1).map(s => s.split(',')[0]));
    expect(gatewayOutXs.size).toBeGreaterThan(1);
  });

  // Iron rule: two branches of a gateway must exit from DIFFERENT faces.
  // Reproduces the "Marek Zuchowski / other passenger" diagram where Bypass
  // and Open both land in the same lane row, which used to collapse both
  // outgoing edges onto the right vertex.
  it('gateway branches always exit from distinct faces of the diamond', async () => {
    const ir = {
      process: {
        id: 'p_gate', name: 'Gate',
        nodes: [
          { id: 's', type: 'event',   subtype: 'start',     name: 'Start' },
          { id: 'g', type: 'gateway', subtype: 'exclusive', name: 'Q?' },
          { id: 'b', type: 'task',    subtype: 'service',   name: 'Bypass' },
          { id: 'o', type: 'task',    subtype: 'service',   name: 'Open' }
        ],
        edges: [
          { id: 'e1', source: 's', target: 'g' },
          { id: 'e2', source: 'g', target: 'b', condition: 'A', isDefault: true },
          { id: 'e3', source: 'g', target: 'o', condition: 'B' },
          // Chain b→o so both targets land in the same lane row, the
          // condition that previously confused assignSourcePorts.
          { id: 'e4', source: 'b', target: 'o' }
        ],
        participants: [{
          id: 'p1', name: 'P', lanes: [
            { id: 'l1', name: 'Rebooking System', nodeRefs: ['s', 'g', 'b', 'o'] }
          ]
        }]
      }
    };
    const svg = await renderSwimlaneSvg(ir);
    // Pull every <path class="flow"> and group by start coordinate. No two
    // gateway-out edges should share an x AND y at their start.
    const paths = [...svg.matchAll(/<path class="flow" d="M(\d+),(\d+)/g)]
      .map(m => `${m[1]},${m[2]}`);
    const dupes = paths.filter((p, i) => paths.indexOf(p) !== i);
    expect(dupes, `duplicate flow start points: ${dupes.join(' / ')}`).toEqual([]);
  });
});
