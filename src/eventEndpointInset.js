// Event glyphs draw their circle inset 5 pixels inside the layout bbox
// (`r = width/2 - 5` in svgPrimitives.drawNodeAt). ELK routes edge endpoints
// to the bbox edge, which is 5 pixels OUTSIDE the visible circle perimeter —
// leaving a 5-pixel gap between every arrow tip and the event glyph it
// touches. Reads as "loose ends" on every event.
//
// This pass runs after all routing and after enforceDistinctEndpoints. For
// each edge endpoint that lands on an event node's bbox edge, it moves the
// endpoint 5 px inward (toward the node center) and slides the adjacent
// bend point in parallel so the last segment stays straight.

import { nodeBox } from './nodeGeometry.js';

const EVENT_INSET = 5;
const FACE_TOL = 1.5;

function isEvent(node) {
  return node?.data?.type === 'event';
}

function detectFace(node, pt) {
  const b = nodeBox(node);
  const xInRange = pt.x >= b.x - FACE_TOL && pt.x <= b.x + b.width + FACE_TOL;
  const yInRange = pt.y >= b.y - FACE_TOL && pt.y <= b.y + b.height + FACE_TOL;
  if (Math.abs(pt.x - b.x) < FACE_TOL && yInRange) return 'left';
  if (Math.abs(pt.x - (b.x + b.width)) < FACE_TOL && yInRange) return 'right';
  if (Math.abs(pt.y - b.y) < FACE_TOL && xInRange) return 'top';
  if (Math.abs(pt.y - (b.y + b.height)) < FACE_TOL && xInRange) return 'bottom';
  return null;
}

function applyInset(pt, face) {
  if (face === 'left') return { x: pt.x + EVENT_INSET, y: pt.y };
  if (face === 'right') return { x: pt.x - EVENT_INSET, y: pt.y };
  if (face === 'top') return { x: pt.x, y: pt.y + EVENT_INSET };
  if (face === 'bottom') return { x: pt.x, y: pt.y - EVENT_INSET };
  return pt;
}

export function insetEventEndpoints(routedEdges, positioned) {
  const nodeList = positioned instanceof Map
    ? [...positioned.values()]
    : (Array.isArray(positioned) ? positioned : Object.values(positioned));
  const events = nodeList.filter(isEvent);
  if (events.length === 0) return;

  for (const edge of routedEdges) {
    const sec = edge?.sections?.[0];
    if (!sec) continue;
    const bends = sec.bendPoints || [];

    // Start endpoint
    for (const ev of events) {
      const face = detectFace(ev, sec.startPoint);
      if (!face) continue;
      const oldPt = { ...sec.startPoint };
      const moved = applyInset(sec.startPoint, face);
      sec.startPoint.x = moved.x;
      sec.startPoint.y = moved.y;
      // Slide adjacent bend along the same axis so the first segment stays
      // straight. (Path was orthogonal; first segment direction = perp to
      // the face.)
      if (bends.length > 0) {
        const adj = bends[0];
        if (face === 'left' || face === 'right') {
          if (Math.abs(adj.y - oldPt.y) < 1) adj.y = moved.y;
        } else {
          if (Math.abs(adj.x - oldPt.x) < 1) adj.x = moved.x;
        }
      }
      break;
    }

    // End endpoint
    for (const ev of events) {
      const face = detectFace(ev, sec.endPoint);
      if (!face) continue;
      const oldPt = { ...sec.endPoint };
      const moved = applyInset(sec.endPoint, face);
      sec.endPoint.x = moved.x;
      sec.endPoint.y = moved.y;
      if (bends.length > 0) {
        const adj = bends[bends.length - 1];
        if (face === 'left' || face === 'right') {
          if (Math.abs(adj.y - oldPt.y) < 1) adj.y = moved.y;
        } else {
          if (Math.abs(adj.x - oldPt.x) < 1) adj.x = moved.x;
        }
      }
      break;
    }
  }
}
