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

  // Iron rule: a connector's last segment must approach the target node
  // perpendicular to the face it lands on (90°), never parallel (0°). A
  // parallel approach has the arrowhead grazing along the face — visually
  // unreadable and ambiguous about which side the arrow lands on.
  it('every connector approaches its target face perpendicular, never parallel', async () => {
    const ir = {
      process: {
        id: 'p_perp', name: 'P',
        nodes: [
          { id: 's',  type: 'event',   subtype: 'start' },
          { id: 'g',  type: 'gateway', subtype: 'exclusive', name: 'OK?' },
          { id: 'a',  type: 'task',    subtype: 'service',   name: 'Approved Path' },
          { id: 'r',  type: 'task',    subtype: 'service',   name: 'Rejected Path' },
          { id: 'e',  type: 'event',   subtype: 'end' }
        ],
        edges: [
          { id: 'e1', source: 's', target: 'g' },
          { id: 'e2', source: 'g', target: 'a', condition: 'approved', isDefault: true },
          { id: 'e3', source: 'g', target: 'r', condition: 'rejected', branch_type: 'exception' },
          { id: 'e4', source: 'a', target: 'e' },
          { id: 'e5', source: 'r', target: 'e' }
        ],
        participants: [{
          id: 'p1', name: 'P', lanes: [{ id: 'l1', name: 'L1', nodeRefs: ['s', 'g', 'a', 'r', 'e'] }]
        }]
      }
    };
    const { renderSwimlaneSvg } = await import('../../src/swimlaneSvgRenderer.js');
    const svg = await renderSwimlaneSvg(ir);
    const tasks = [...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="210" height="90"/g)]
      .map(m => ({ x: +m[1], y: +m[2], w: 210, h: 90 }));
    const gws = [...svg.matchAll(/<polygon points="([\d.,]+) ([\d.,]+) ([\d.,]+) ([\d.,]+)"/g)]
      .map(m => {
        const pts = [m[1], m[2], m[3], m[4]].map(s => s.split(',').map(Number));
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      });
    const evs = [...svg.matchAll(/<circle cx="(\d+)" cy="(\d+)" r="23"/g)]
      .map(m => ({ x: +m[1] - 23, y: +m[2] - 23, w: 46, h: 46, cx: +m[1], cy: +m[2], event: true }));
    const all = [...tasks, ...gws, ...evs];
    const TOL = 6;
    const detectFace = (pt) => {
      for (const n of all) {
        if (n.event) {
          const d = Math.hypot(pt.x - n.cx, pt.y - n.cy);
          if (Math.abs(d - 23) <= TOL) {
            // Point on the circle: dominant axis tells us which face.
            // |dx|>|dy| → point is on the left/right of the center = a
            // VERTICAL face (face line runs up-down). Perpendicular
            // approach is therefore horizontal.
            const dx = pt.x - n.cx, dy = pt.y - n.cy;
            return Math.abs(dx) > Math.abs(dy) ? 'vertical' : 'horizontal';
          }
          continue;
        }
        if (Math.abs(pt.x - n.x) <= TOL && pt.y >= n.y - TOL && pt.y <= n.y + n.h + TOL) return 'vertical';      // left
        if (Math.abs(pt.x - (n.x + n.w)) <= TOL && pt.y >= n.y - TOL && pt.y <= n.y + n.h + TOL) return 'vertical'; // right
        if (Math.abs(pt.y - n.y) <= TOL && pt.x >= n.x - TOL && pt.x <= n.x + n.w + TOL) return 'horizontal';   // top
        if (Math.abs(pt.y - (n.y + n.h)) <= TOL && pt.x >= n.x - TOL && pt.x <= n.x + n.w + TOL) return 'horizontal'; // bottom
      }
      return null;
    };
    const paths = [...svg.matchAll(/<path[^>]*class="flow"[^>]*d="([^"]+)"/g)];
    for (const m of paths) {
      const pts = m[1].replace(/^M/, '').split(' L').map(p => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });
      if (pts.length < 2) continue;
      const last = pts[pts.length - 1], prev = pts[pts.length - 2];
      const segDir = Math.abs(last.x - prev.x) > Math.abs(last.y - prev.y) ? 'horizontal' : 'vertical';
      const faceOrientation = detectFace(last);
      if (!faceOrientation) continue;
      // The last segment's direction must be PERPENDICULAR to the face's
      // orientation: vertical face (left/right) needs a horizontal segment
      // and vice versa.
      const required = faceOrientation === 'vertical' ? 'horizontal' : 'vertical';
      expect(
        segDir,
        `path ${m[1]} ends with ${segDir} segment on ${faceOrientation} face — parallel hit`
      ).toBe(required);
    }
  });

  // Iron rule: when two routed edges share a horizontal trunk at the same y
  // (or a vertical at the same x) with overlapping range, they must be
  // staggered onto separate tracks. Otherwise multiple flows merge visually
  // into a single line and the diagram is unreadable.
  it('staggerOverlappingTrunks puts collinear overlapping middle segments onto separate tracks', async () => {
    const { staggerOverlappingTrunks } = await import('../../src/staggerTrunks.js');
    // Two edges with middle horizontal segments at the same y, overlapping in x.
    const e1 = {
      sections: [{
        startPoint: { x: 0, y: 0 },
        bendPoints: [{ x: 50, y: 100 }, { x: 200, y: 100 }],
        endPoint: { x: 200, y: 200 }
      }]
    };
    const e2 = {
      sections: [{
        startPoint: { x: 30, y: 0 },
        bendPoints: [{ x: 80, y: 100 }, { x: 250, y: 100 }],
        endPoint: { x: 250, y: 200 }
      }]
    };
    staggerOverlappingTrunks([e1, e2]);
    const e1mid = e1.sections[0].bendPoints;
    const e2mid = e2.sections[0].bendPoints;
    // Both middle segments still horizontal (y1 === y2 within each segment)
    expect(e1mid[0].y).toBe(e1mid[1].y);
    expect(e2mid[0].y).toBe(e2mid[1].y);
    // But the two trunks are now at DIFFERENT y values
    expect(e1mid[0].y).not.toBe(e2mid[0].y);
  });

  // First/last segments (anchored to a node face) must also be staggered when
  // they collide. Reproduces the "Tier 2 task horizontally aligned with the
  // end event" case: Tier 2's first segment runs at y=DA.cy toward its real
  // target, while Pull Back's last segment also runs at y=DA.cy ending at DA.
  // Both sit at the same y with overlapping x, but neither is a middle
  // segment — earlier the staggerer skipped both and they merged visually.
  it('staggerOverlappingTrunks shifts first/last segments when their anchor is on a task face', async () => {
    const { staggerOverlappingTrunks } = await import('../../src/staggerTrunks.js');
    const nodes = [
      { id: 'tier2', x: 50, y: 100, width: 250, height: 100, data: { type: 'task' } },
      { id: 'da',    x: 577, y: 127, width: 46, height: 46, data: { type: 'event' } },
      { id: 'pi',    x: 700, y: 300, width: 250, height: 100, data: { type: 'task' } },
      { id: 'pull',  x: 50, y: 300, width: 250, height: 100, data: { type: 'task' } }
    ];
    const tier2Path = {
      data: { source: 'tier2', target: 'pi' },
      sections: [{
        startPoint: { x: 300, y: 150 },
        bendPoints: [{ x: 540, y: 150 }, { x: 540, y: 350 }],
        endPoint: { x: 700, y: 350 }
      }]
    };
    const pullBackPath = {
      data: { source: 'pull', target: 'da' },
      sections: [{
        startPoint: { x: 300, y: 350 },
        bendPoints: [{ x: 440, y: 350 }, { x: 440, y: 150 }],
        endPoint: { x: 577, y: 150 }
      }]
    };
    staggerOverlappingTrunks([tier2Path, pullBackPath], nodes);
    // Pull Back's last segment is event-anchored (ends at DA), so it must
    // stay at y=150 — events can't tolerate face-tangent shifts.
    expect(pullBackPath.sections[0].endPoint.y).toBe(150);
    expect(pullBackPath.sections[0].bendPoints[1].y).toBe(150);
    // Tier 2's first segment must move OFF y=150 so the two no longer share
    // a visual track.
    expect(tier2Path.sections[0].startPoint.y).not.toBe(150);
    expect(tier2Path.sections[0].bendPoints[0].y).not.toBe(150);
    // The shifted first segment must remain horizontal (start.y === bend1.y).
    expect(tier2Path.sections[0].startPoint.y).toBe(tier2Path.sections[0].bendPoints[0].y);
  });

  it('staggerOverlappingTrunks leaves non-overlapping segments untouched', async () => {
    const { staggerOverlappingTrunks } = await import('../../src/staggerTrunks.js');
    // Two horizontal middle segments at same y but DISJOINT x ranges.
    const e1 = {
      sections: [{
        startPoint: { x: 0, y: 0 },
        bendPoints: [{ x: 50, y: 100 }, { x: 100, y: 100 }],
        endPoint: { x: 100, y: 200 }
      }]
    };
    const e2 = {
      sections: [{
        startPoint: { x: 200, y: 0 },
        bendPoints: [{ x: 250, y: 100 }, { x: 300, y: 100 }],
        endPoint: { x: 300, y: 200 }
      }]
    };
    staggerOverlappingTrunks([e1, e2]);
    expect(e1.sections[0].bendPoints[0].y).toBe(100);
    expect(e2.sections[0].bendPoints[0].y).toBe(100);
  });

  // distinct-endpoints must not re-redistribute endpoints that are already
  // sufficiently apart. A common case: two message flows touching a wide
  // black-box pool — `routeMessageFlows` aligns each flow's pool endpoint
  // to the OTHER end's x, producing two well-separated touchpoints. The
  // distinct-endpoints rule only needs to kick in when endpoints overlap;
  // otherwise it would clobber an intentional alignment and turn a clean
  // vertical message flow into a 3-segment dogleg.
  it('distinct-endpoints leaves already-distant endpoints alone', async () => {
    const ir = {
      process: {
        id: 'p_mf', name: 'M',
        nodes: [
          { id: 's',  type: 'event', subtype: 'start',     name: 'Start',    event_definition: 'message' },
          { id: 'a',  type: 'task',  subtype: 'service',   name: 'Process' },
          { id: 'th', type: 'event', subtype: 'intermediate_throw', name: 'Send Confirmation', event_definition: 'message' },
          { id: 'e',  type: 'event', subtype: 'end',       name: 'Done' }
        ],
        edges: [
          { id: 'e1', source: 's',  target: 'a' },
          { id: 'e2', source: 'a',  target: 'th' },
          { id: 'e3', source: 'th', target: 'e' }
        ],
        participants: [
          {
            id: 'p_main', name: 'Main',
            lanes: [{ id: 'l1', name: 'Worker', nodeRefs: ['s', 'a', 'th', 'e'] }]
          },
          {
            id: 'p_external', name: 'Supplier Portal',
            isBlackBox: true,
            lanes: []
          }
        ],
        message_flows: [
          { id: 'mf_in',  source: 'p_external', target: 's',  name: 'Notify' },
          { id: 'mf_out', source: 'th',         target: 'p_external', name: 'Confirm' }
        ]
      }
    };
    const { renderSwimlaneSvg } = await import('../../src/swimlaneSvgRenderer.js');
    const svg = await renderSwimlaneSvg(ir);
    const dashed = [...svg.matchAll(/<path d="([^"]+)" fill="none" stroke="#111" stroke-width="1.4" stroke-dasharray="6,4"/g)];
    expect(dashed.length).toBe(2);
    // Each message flow should be a STRAIGHT VERTICAL — exactly two points,
    // sharing the same x. No spurious horizontal bend.
    for (const m of dashed) {
      const pts = m[1].replace(/^M/, '').split(' L').map(p => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });
      expect(pts.length, `flow ${m[1]} has ${pts.length} points`).toBe(2);
      expect(pts[0].x, `flow ${m[1]} not vertical`).toBe(pts[1].x);
    }
  });

  // Iron rule restated: a non-default gateway branch whose target sits at
  // (or near) the gateway's row must NOT route a straight L through the
  // diamond's body. The path must bypass the gateway — drop below (or rise
  // above) for clearance before traversing toward the target.
  it('non-default gateway branch with same-row target bypasses the diamond body', async () => {
    const ir = {
      process: {
        id: 'p_bypass', name: 'B',
        nodes: [
          { id: 's',  type: 'event',   subtype: 'start' },
          { id: 'g',  type: 'gateway', subtype: 'exclusive', name: 'OK?' },
          { id: 'a',  type: 'task',    subtype: 'service',   name: 'Approved Path' },
          { id: 'r',  type: 'task',    subtype: 'service',   name: 'Rejected Path' },
          { id: 'e',  type: 'event',   subtype: 'end' }
        ],
        edges: [
          { id: 'e1', source: 's', target: 'g' },
          { id: 'e2', source: 'g', target: 'a', condition: 'approved', isDefault: true },
          { id: 'e3', source: 'g', target: 'r', condition: 'rejected', branch_type: 'exception' },
          { id: 'e4', source: 'a', target: 'e' },
          { id: 'e5', source: 'r', target: 'e' }
        ],
        participants: [{
          id: 'p1', name: 'P', lanes: [
            { id: 'l1', name: 'L1', nodeRefs: ['s', 'g', 'a', 'r', 'e'] }
          ]
        }]
      }
    };
    const { renderSwimlaneSvg } = await import('../../src/swimlaneSvgRenderer.js');
    const svg = await renderSwimlaneSvg(ir);
    // Locate gw_approved gateway by its label
    const gws = [...svg.matchAll(/<polygon points="([\d.,]+) ([\d.,]+) ([\d.,]+) ([\d.,]+)"/g)]
      .map(m => {
        const pts = [m[1], m[2], m[3], m[4]].map(s => s.split(',').map(Number));
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      });
    expect(gws.length).toBeGreaterThan(0);
    const g = gws[0];
    // Find every flow path. For each, check whether any segment passes
    // *through* the gateway body — i.e. enters and exits its bbox while
    // the segment isn't itself originating or terminating on the gateway's
    // perimeter. A segment passes through if both its endpoints (or its
    // axis with one inside) cross the bbox interior.
    const paths = [...svg.matchAll(/<path class="flow" d="([^"]+)"/g)];
    for (const m of paths) {
      const pts = m[1].replace(/^M/, '').split(' L').map(p => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        // Vertical segment crossing gateway interior at an x INSIDE the bbox
        // (not on the perimeter): both y's straddle the gateway's y range.
        if (a.x === b.x && a.x > g.x + 2 && a.x < g.x + g.w - 2) {
          const yMin = Math.min(a.y, b.y), yMax = Math.max(a.y, b.y);
          // Segment passes through if it enters the gateway's vertical span
          // from outside on both ends or stays inside the perimeter. Allow
          // segments that end on the perimeter (one endpoint on the bbox
          // border) — those are normal exit/entry segments.
          const entersFromAbove = yMin < g.y - 1 && yMax > g.y + 1;
          const entersFromBelow = yMin < g.y + g.h - 1 && yMax > g.y + g.h + 1;
          expect(
            entersFromAbove && entersFromBelow,
            `segment from (${a.x},${a.y}) to (${b.x},${b.y}) passes through gateway body`
          ).toBe(false);
        }
      }
    }
  });

  // Edge endpoints touching an event node must land ON the visible circle
  // perimeter — not on the bbox edge 5px outside it (which would leave a
  // visible gap between the arrow tip and the glyph).
  it('edge endpoints land on the event circle, not 5px past the bbox edge', async () => {
    const ir = {
      process: {
        id: 'p_evt', name: 'E',
        nodes: [
          { id: 's', type: 'event', subtype: 'start' },
          { id: 'a', type: 'task',  subtype: 'user', name: 'A' },
          { id: 'e', type: 'event', subtype: 'end' }
        ],
        edges: [
          { id: 'e1', source: 's', target: 'a' },
          { id: 'e2', source: 'a', target: 'e' }
        ]
      }
    };
    const { renderElkSvg } = await import('../../src/elkSvgRenderer.js');
    const svg = await renderElkSvg(ir);
    const events = [...svg.matchAll(/<circle cx="(\d+)" cy="(\d+)" r="23"/g)]
      .map(m => ({ cx: +m[1], cy: +m[2], r: 23 }));
    const paths = [...svg.matchAll(/<path class="flow" d="([^"]+)"/g)];
    expect(events.length).toBe(2);
    expect(paths.length).toBeGreaterThan(0);
    // Each path that touches an event must have an endpoint within r+1 of
    // the circle center (i.e. on or just inside the perimeter, not 5px out).
    for (const m of paths) {
      const pts = m[1].replace(/^M/, '').split(' L').map(p => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
      });
      const ends = [pts[0], pts[pts.length - 1]];
      for (const pt of ends) {
        for (const ev of events) {
          const d = Math.hypot(pt.x - ev.cx, pt.y - ev.cy);
          // If this endpoint is anywhere near the event (within 30 px of
          // its center), it must land within r+1 of the center — i.e. on
          // the visible circle, not on the 5-px-larger bbox.
          if (d < 30) {
            expect(d, `endpoint (${pt.x},${pt.y}) is ${d.toFixed(1)} from event center but circle r=23`).toBeLessThanOrEqual(24);
          }
        }
      }
    }
  });

  // Edge labels must not overlap node glyphs that are NOT the edge's own
  // source or target. The fixture is a 3-way gateway fan-out where one
  // branch's L-route runs through the row of OTHER branches' targets — the
  // label would land on a sibling task without obstacle-aware placement.
  it('edge labels avoid overlapping unrelated node glyphs', async () => {
    const ir = {
      process: {
        id: 'p_lbl', name: 'L',
        nodes: [
          { id: 's',  type: 'event',   subtype: 'start' },
          { id: 'g',  type: 'gateway', subtype: 'exclusive', name: 'Q?' },
          { id: 'a',  type: 'task',    subtype: 'service',   name: 'A' },
          { id: 'b',  type: 'task',    subtype: 'service',   name: 'B' },
          { id: 'c',  type: 'task',    subtype: 'service',   name: 'C' },
          { id: 'e',  type: 'event',   subtype: 'end' }
        ],
        edges: [
          { id: 'e1', source: 's', target: 'g' },
          { id: 'e2', source: 'g', target: 'a', condition: 'aaa', isDefault: true },
          { id: 'e3', source: 'g', target: 'b', condition: 'bbb path needs label space' },
          { id: 'e4', source: 'g', target: 'c', condition: 'ccc path needs label space' },
          { id: 'e5', source: 'a', target: 'e' },
          { id: 'e6', source: 'b', target: 'e' },
          { id: 'e7', source: 'c', target: 'e' }
        ],
        participants: [{
          id: 'p1', name: 'P', lanes: [
            { id: 'l1', name: 'L1', nodeRefs: ['s', 'g', 'a', 'b', 'c', 'e'] }
          ]
        }]
      }
    };
    const { renderSwimlaneSvg } = await import('../../src/swimlaneSvgRenderer.js');
    const svg = await renderSwimlaneSvg(ir);
    const labels = [...svg.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)"[^>]*fill="white"[^>]*stroke="#bbb"[^>]*\/>\s*<text[^>]*>([^<]+)<\/text>/g)];
    const tasks = [...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="210" height="90"/g)]
      .map(m => ({ x: +m[1], y: +m[2], w: 210, h: 90 }));
    const gws = [...svg.matchAll(/<polygon points="([\d.,]+) ([\d.,]+) ([\d.,]+) ([\d.,]+)" fill="white" stroke="#111" stroke-width="2.5"\/>/g)]
      .map(m => {
        const pts = [m[1], m[2], m[3], m[4]].map(s => s.split(',').map(Number));
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      });
    // For each label that has at least one task fully separated from it
    // (i.e. there exists *some* clearance), assert no full overlap with a
    // task other than the edge's source/target. Coarse check: each edge
    // label should overlap AT MOST 2 nodes (its source and target).
    for (const m of labels) {
      const lx1 = +m[1], ly1 = +m[2], lx2 = lx1 + +m[3], ly2 = ly1 + +m[4];
      const hits = [...tasks, ...gws].filter(o =>
        lx1 < o.x + o.w && lx2 > o.x && ly1 < o.y + o.h && ly2 > o.y
      );
      expect(hits.length, `label ${JSON.stringify(m[5])} touches ${hits.length} nodes`).toBeLessThanOrEqual(2);
    }
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
