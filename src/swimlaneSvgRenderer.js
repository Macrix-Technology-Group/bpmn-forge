import ELK from 'elkjs/lib/elk.bundled.js';
import { irToElkGraph } from './irToElkGraph.js';
import { renderElkSvg } from './elkSvgRenderer.js';
import { esc, drawNodeAt, drawEdge, drawMessageFlow, drawDataObject, drawDataAssociation, drawGroupBox, svgDocument, DATA_OBJECT_WIDTH, DATA_OBJECT_HEIGHT, GROUP_PADDING } from './svgPrimitives.js';
import { enforceDistinctEndpoints, findOverlappingEndpoints } from './distinctEndpoints.js';
import { detectLoopEdges } from './loopDetection.js';
import { placeEdgeLabel } from './labelEngine.js';
import { insetEventEndpoints } from './eventEndpointInset.js';
import { staggerOverlappingTrunks } from './staggerTrunks.js';
import { classifyGatewayBranches } from './gatewayPorts.js';
import { boundaryAttachPoint, indexBoundariesByEdge } from './boundaryPlacement.js';
import { nodeBox } from './nodeGeometry.js';

const LANE_STYLES = `.lane-label{font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-anchor:middle;fill:#444}
.blackbox-label{font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-anchor:middle;fill:#444}`;
const ROW_HEIGHT = 130;
const LANE_PADDING = 24;
const LANE_HEADER = 60;
const TOP_PAD = 30;
const RIGHT_PAD = 60;
const BLACKBOX_HEIGHT_MIN = 120; // minimum height — must accommodate the rotated pool-name label
const BLACKBOX_GAP = 80;         // vertical gap between the regular pool and the first black-box pool — sized to give message-flow envelope labels and arrowheads breathing room
const DATA_BAND_PAD = 18;       // padding inside the data-object band
const DATA_LABEL_HEIGHT = 18;   // space the label occupies below the page icon
// Horizontal gap between adjacent columns. Sized to fit edge labels, the source-side
// trunk for fan-out edges, and arrowheads with a margin. Each column's actual width
// is computed from the widest node it contains.
const COLUMN_GAP = 70;

// Reorder lanes within a single participant so that, for each loop edge S→T,
// S's lane is above T's lane. Score each lane by (loop sources here) − (loop targets here);
// sort descending. Stable for ties — preserves the LLM's input order when no loops disagree.
function reorderLanesByLoops(participantLanes, allEdges) {
  if (!participantLanes || participantLanes.length <= 1) return participantLanes;
  const nodeToLaneId = new Map();
  for (const lane of participantLanes) {
    for (const ref of lane.nodeRefs || []) nodeToLaneId.set(ref, lane.id);
  }
  const score = new Map(participantLanes.map(l => [l.id, 0]));
  for (const e of (allEdges || [])) {
    if (e.branch_type !== 'loop') continue;
    const sl = nodeToLaneId.get(e.source);
    const tl = nodeToLaneId.get(e.target);
    if (sl && tl && sl !== tl) {
      score.set(sl, score.get(sl) + 1);
      score.set(tl, score.get(tl) - 1);
    }
  }
  // Stable sort: keep original index as a secondary key.
  const indexed = participantLanes.map((l, i) => ({ l, i, s: score.get(l.id) || 0 }));
  indexed.sort((a, b) => (b.s - a.s) || (a.i - b.i));
  return indexed.map(x => x.l);
}

function buildLaneIndex(ir) {
  const participants = ir.process.participants || [];
  const allEdges = ir.process.edges || [];
  const lanes = [];
  const participantRanges = [];
  const blackBoxPools = [];
  participants.forEach((p, pIdx) => {
    // Black-box pool: external participant exposed only by message flows. No
    // internal sequence flow, no lanes — just a labeled rectangle. Triggered
    // either by an explicit `isBlackBox: true` flag or by a participant whose
    // every lane is empty (legacy authoring shape).
    const lanesForP = p.lanes || [];
    const allEmpty = lanesForP.length === 0
      || lanesForP.every(l => !(l.nodeRefs || []).length);
    if (p.isBlackBox || allEmpty) {
      blackBoxPools.push({ id: p.id, name: p.name, idx: pIdx });
      return;
    }
    const start = lanes.length;
    const ordered = reorderLanesByLoops(lanesForP, allEdges);
    ordered.forEach(l => {
      lanes.push({ ...l, participantName: p.name, participantId: p.id, participantIdx: pIdx });
    });
    if (lanes.length > start) participantRanges.push({ id: p.id, name: p.name, idx: pIdx, firstLane: start, lastLane: lanes.length - 1 });
  });
  const nodeToLaneIdx = new Map();
  lanes.forEach((lane, idx) => {
    for (const ref of lane.nodeRefs || []) nodeToLaneIdx.set(ref, idx);
  });
  const hasMultiplePools = participantRanges.length + blackBoxPools.length > 1;
  return { lanes, nodeToLaneIdx, participantRanges, blackBoxPools, hasMultiplePools };
}

function groupByColumn(elkChildren) {
  const colKeys = [...new Set(elkChildren.map(n => Math.round(n.x)))].sort((a, b) => a - b);
  const colIdxByX = new Map(colKeys.map((x, i) => [x, i]));
  return { colKeys, colIdxByX };
}

// Place each node at a (lane, column, row-within-lane) cell.
//
// Constraints:
//   1. Each node's column ≥ max(sequence-flow-predecessor columns) + 1 (topological order).
//   2. For each message_flow source→target, the target column must be ≥ source column —
//      so paired send/receive events line up vertically across lanes (BPMN convention).
//      When this isn't true after the topological pass, shift the target plus all its
//      sequence-flow descendants right by the deficit.
//   3. Multiple same-lane nodes in the same column are stacked vertically by row index
//      (gateway siblings live in the same column at different rows).
function placeNodes(elkChildren, edges, messageFlows, nodeToLaneIdx, colIdxByX, laneCount) {
  const incoming = new Map(elkChildren.map(n => [n.id, []]));
  const successors = new Map(elkChildren.map(n => [n.id, []]));
  for (const e of edges) {
    const tgt = e.targets?.[0];
    const src = e.sources?.[0];
    if (incoming.has(tgt) && src) incoming.get(tgt).push(src);
    if (successors.has(src) && tgt) successors.get(src).push(tgt);
  }
  const sorted = [...elkChildren].sort((a, b) => (a.x - b.x) || a.id.localeCompare(b.id));

  const colByNode = new Map();
  for (const n of sorted) {
    let colIdx = colIdxByX.get(Math.round(n.x)) ?? 0;
    for (const predId of incoming.get(n.id) || []) {
      const predCol = colByNode.get(predId);
      if (predCol !== undefined && predCol >= colIdx) colIdx = predCol + 1;
    }
    colByNode.set(n.id, colIdx);
  }

  // Align message-flow target chains rightward — but each node shifts at most ONCE,
  // so cycles in the message-flow graph (e.g. retry loops) can't blow up column counts.
  // First-encountered alignment wins; later cyclic MFs may stay slightly misaligned.
  if (messageFlows && messageFlows.length > 0) {
    const everShifted = new Set();
    const sortedMfs = [...messageFlows].sort((a, b) => {
      const sa = colByNode.get(a.source) ?? 0;
      const sb = colByNode.get(b.source) ?? 0;
      return sa - sb;
    });
    for (const mf of sortedMfs) {
      const srcCol = colByNode.get(mf.source);
      const tgtCol = colByNode.get(mf.target);
      if (srcCol === undefined || tgtCol === undefined) continue;
      if (tgtCol < srcCol) {
        const shift = srcCol - tgtCol;
        const visited = new Set();
        const queue = [mf.target];
        while (queue.length) {
          const id = queue.shift();
          if (visited.has(id)) continue;
          visited.add(id);
          if (!everShifted.has(id)) {
            everShifted.add(id);
            const cur = colByNode.get(id);
            if (cur !== undefined) colByNode.set(id, cur + shift);
            for (const next of successors.get(id) || []) queue.push(next);
          }
        }
      }
    }
  }

  // Vertical detour rule: a node with exactly one cross-lane DAG predecessor and zero
  // DAG successors aligns with its predecessor's column. This pulls dead-end side
  // branches (e.g. a one-step exception that loops back) into the same column as the
  // gateway/task that triggered them — making the cross-lane edge a clean vertical.
  {
    const dagIn = new Map();
    const dagOut = new Map();
    for (const e of edges) {
      if (e.data?.branch_type === 'loop') continue;
      const src = e.sources?.[0], tgt = e.targets?.[0];
      if (!src || !tgt) continue;
      if (!dagIn.has(tgt)) dagIn.set(tgt, []);
      dagIn.get(tgt).push(src);
      if (!dagOut.has(src)) dagOut.set(src, []);
      dagOut.get(src).push(tgt);
    }
    for (const n of elkChildren) {
      const ins = dagIn.get(n.id) || [];
      const outs = dagOut.get(n.id) || [];
      if (ins.length !== 1 || outs.length !== 0) continue;
      const myLane = nodeToLaneIdx.get(n.id);
      const srcLane = nodeToLaneIdx.get(ins[0]);
      if (myLane === undefined || srcLane === undefined || myLane === srcLane) continue;
      const srcCol = colByNode.get(ins[0]);
      if (srcCol !== undefined) colByNode.set(n.id, srcCol);
    }
  }

  let maxCol = 0;
  for (const col of colByNode.values()) if (col > maxCol) maxCol = col;

  const cellMembers = new Map();
  for (const n of sorted) {
    // Boundary events overlay their host and don't get their own column.
    if (n.data?.subtype === 'boundary' && n.data?.attachedTo) continue;
    const laneIdx = nodeToLaneIdx.get(n.id) ?? 0;
    const col = colByNode.get(n.id);
    const key = `${laneIdx}:${col}`;
    if (!cellMembers.has(key)) cellMembers.set(key, []);
    cellMembers.get(key).push(n.id);
  }

  const placement = new Map();
  const stackByLane = new Array(laneCount).fill(1);
  for (const [key, members] of cellMembers) {
    const [laneIdx] = key.split(':').map(Number);
    if (members.length > stackByLane[laneIdx]) stackByLane[laneIdx] = members.length;
    members.forEach((id, idx) => {
      const [li, col] = key.split(':').map(Number);
      placement.set(id, { laneIdx: li, colIdx: col, rowInLane: idx });
    });
  }

  // Each column's width is the widest node it contains.
  const columnMaxWidth = new Map();
  for (const n of sorted) {
    if (n.data?.subtype === 'boundary' && n.data?.attachedTo) continue;
    const col = colByNode.get(n.id);
    if (col === undefined) continue;
    const w = n.width || 0;
    if (!columnMaxWidth.has(col) || columnMaxWidth.get(col) < w) columnMaxWidth.set(col, w);
  }

  return { placement, maxCol, stackByLane, columnMaxWidth };
}

function laneTopY(laneIdx, laneHeights) {
  let y = TOP_PAD;
  for (let i = 0; i < laneIdx; i++) y += laneHeights[i];
  return y;
}

function buildPositionedNodes(elkChildren, placement, stackByLane, columnMaxWidth, maxCol) {
  const laneHeights = stackByLane.map(stack => stack * ROW_HEIGHT + LANE_PADDING * 2);
  // Build cumulative left-X for each column, sized to fit its widest content.
  const columnLeftX = new Map();
  let cursor = LANE_HEADER + 30;
  for (let col = 0; col <= maxCol; col++) {
    columnLeftX.set(col, cursor);
    cursor += (columnMaxWidth.get(col) || 0) + COLUMN_GAP;
  }
  const contentRight = cursor - COLUMN_GAP;

  const result = new Map();
  const boundaryDeferred = [];
  for (const n of elkChildren) {
    if (n.data?.subtype === 'boundary' && n.data?.attachedTo) {
      boundaryDeferred.push(n);
      continue;
    }
    const p = placement.get(n.id);
    if (!p) continue;
    const { laneIdx, colIdx, rowInLane } = p;
    const colW = columnMaxWidth.get(colIdx) || n.width;
    const x = columnLeftX.get(colIdx) + (colW - n.width) / 2;
    const stackCount = stackByLane[laneIdx];
    const usableHeight = laneHeights[laneIdx] - LANE_PADDING * 2;
    const slotHeight = usableHeight / stackCount;
    const slotTop = laneTopY(laneIdx, laneHeights) + LANE_PADDING + rowInLane * slotHeight;
    const y = slotTop + (slotHeight - n.height) / 2;
    result.set(n.id, {
      id: n.id, absX: x, absY: y,
      width: n.width, height: n.height, data: n.data,
      laneIdx, colIdx, rowInLane
    });
  }
  // Boundary placement uses the shared BPMN convention from boundaryPlacement.js:
  // interrupting boundaries on the host's bottom edge, non-interrupting on the
  // top edge, staggered from center. Same rule the ELK renderer applies.
  const indexed = indexBoundariesByEdge(boundaryDeferred.map(n => n.data));
  for (const n of boundaryDeferred) {
    const host = result.get(n.data.attachedTo);
    if (!host) continue;
    const meta = indexed.get(n.id);
    if (!meta) continue;
    const hostBox = { x: host.absX, y: host.absY, width: host.width, height: host.height };
    const { cx, cy, edge } = boundaryAttachPoint(hostBox, n.data, meta.idxOnEdge);
    result.set(n.id, {
      id: n.id,
      absX: cx - n.width / 2,
      absY: cy - n.height / 2,
      width: n.width, height: n.height, data: n.data,
      laneIdx: host.laneIdx, colIdx: host.colIdx, rowInLane: host.rowInLane,
      isBoundary: true,
      _edge: edge
    });
  }
  return { positioned: result, laneHeights, contentRight };
}

// Wraps the shared classifyGatewayBranches rule for the swimlane renderer's
// edge shape (edges carry `sources`/`targets` arrays plus `data`). Non-gateway
// sources and single-fan sources exit right by default. Boundary events are
// the exception: they exit perpendicular to the host edge they ride on (the
// glyph straddles that edge, so going right would have the connector run
// horizontally through the host activity). _edge='top' → exit UP, _edge=
// 'bottom' → exit DOWN. Same convention the ELK renderer applies via
// rerouteBoundaryEdge.
function assignSourcePorts(edges, positioned) {
  const outBySource = new Map();
  for (const e of edges) {
    const sid = e.sources?.[0] || e.source;
    if (!sid) continue;
    if (!outBySource.has(sid)) outBySource.set(sid, []);
    outBySource.get(sid).push(e);
  }
  const portByEdge = new Map();
  for (const [sid, outs] of outBySource) {
    const s = positioned.get(sid);
    if (s?.data?.subtype === 'boundary') {
      const port = s._edge === 'top' ? 'top' : 'bottom';
      for (const e of outs) portByEdge.set(e.id, port);
      continue;
    }
    if (!s || s.data?.type !== 'gateway' || outs.length < 2) {
      for (const e of outs) portByEdge.set(e.id, 'right');
      continue;
    }
    const sy = s.absY + s.height / 2;
    const branches = outs.map(e => {
      const t = positioned.get(e.targets?.[0] || e.target);
      return {
        id: e.id,
        data: e.data,
        targetCenterY: t ? t.absY + t.height / 2 : sy
      };
    });
    const portByBranch = classifyGatewayBranches(branches, sy);
    for (const [id, port] of portByBranch) portByEdge.set(id, port);
  }
  return portByEdge;
}

function startPointFor(s, side) {
  const cx = s.absX + s.width / 2;
  const cy = s.absY + s.height / 2;
  if (side === 'right') return { x: s.absX + s.width, y: cy };
  if (side === 'bottom') return { x: cx, y: s.absY + s.height };
  if (side === 'top') return { x: cx, y: s.absY };
  return { x: s.absX, y: cy };
}

// Orthogonal edge routing.
//   - Same lane, same Y, no blocker → direct horizontal.
//   - Same lane, same Y, blocker between → rise to lane top, traverse, drop in.
//   - Cross-lane / different-Y → orthogonal bend; trunk geometry depends on the source port.
//     Right exit: trunk staggered near the source-X side.
//     Bottom/top exit: trunk is the source center-X going straight down/up to target row,
//       then across — no extra bend needed near source.
function routeEdges(edges, positioned, laneHeights) {
  const allNodes = [...positioned.values()];
  const fanIndexBySource = new Map();
  const portByEdge = assignSourcePorts(edges, positioned);

  function sameRowBlocker(s, t) {
    const lo = Math.min(s.absX + s.width, t.absX);
    const hi = Math.max(s.absX, t.absX + t.width);
    return allNodes.some(n =>
      n !== s && n !== t &&
      n.laneIdx === s.laneIdx &&
      Math.abs((n.absY + n.height / 2) - (s.absY + s.height / 2)) < 4 &&
      n.absX + n.width > lo && n.absX < hi
    );
  }

  return (edges || []).map(e => {
    const s = positioned.get(e.sources?.[0] || e.source);
    const t = positioned.get(e.targets?.[0] || e.target);
    if (!s || !t) return null;
    const port = portByEdge.get(e.id) || 'right';
    const start = startPointFor(s, port);
    const sx = start.x;
    const sy = start.y;
    let tx = t.absX;
    let ty = t.absY + t.height / 2;

    // For a cross-lane edge whose source exits top/bottom and lands in the same column,
    // the target should be entered from the matching side (its top or bottom face),
    // not its left edge — so the path is a clean straight vertical.
    const targetCx = t.absX + t.width / 2;
    if ((port === 'top' || port === 'bottom') && Math.abs(sx - targetCx) < 40) {
      tx = targetCx;
      ty = port === 'top' ? t.absY + t.height : t.absY;
    }

    const sid = e.sources?.[0] || e.source;
    const fanIdx = fanIndexBySource.get(sid) || 0;
    fanIndexBySource.set(sid, fanIdx + 1);

    let bend = [];

    if (port === 'bottom' || port === 'top') {
      if (Math.abs(sx - tx) < 4) {
        // Already aligned in X — straight vertical
      } else if (port === 'bottom' && ty < (s.absY + s.height + 4)) {
        // Target sits at or above the gateway's row, but we're exiting
        // bottom (right was taken by the default branch). A simple L-route
        // would drop down then back up THROUGH the gateway body. Bypass
        // BELOW the gateway and approach the target's BOTTOM face going
        // UP — a perpendicular meeting with a meaningful (~30-px) approach
        // distance, never a parallel graze of the left edge.
        const clearY = s.absY + s.height + 30;
        const targetCx = t.absX + t.width / 2;
        bend = [
          { x: sx, y: clearY },
          { x: targetCx, y: clearY }
        ];
        tx = targetCx;
        ty = t.absY + t.height; // target bottom-center
      } else if (port === 'top' && ty > (s.absY - 4)) {
        // Symmetric: bypass above the gateway, approach target's TOP face
        // going DOWN.
        const clearY = s.absY - 30;
        const targetCx = t.absX + t.width / 2;
        bend = [
          { x: sx, y: clearY },
          { x: targetCx, y: clearY }
        ];
        tx = targetCx;
        ty = t.absY; // target top-center
      } else {
        bend = [{ x: sx, y: ty }];
      }
    } else {
      // Right exit
      const sameLane = s.laneIdx === t.laneIdx;
      const sameY = Math.abs(sy - ty) < 4;
      if (sameLane && sameY) {
        if (sameRowBlocker(s, t)) {
          // Trunk sits inside the lane band with enough clearance from the
          // lane top that the edge label (which floats 12px above a horizontal
          // segment, with a background rect spanning ±14 around its centre →
          // rect top is segment.y - 26) doesn't straddle the lane separator
          // line. Inset 32 gives the label rect 6px of headroom below the
          // separator.
          const trunkY = laneTopY(s.laneIdx, laneHeights) + 32;
          const sBend = sx + 22 + fanIdx * 30;
          const tBend = tx - 22;
          bend = [
            { x: sBend, y: sy },
            { x: sBend, y: trunkY },
            { x: tBend, y: trunkY },
            { x: tBend, y: ty }
          ];
        }
      } else {
        const trunkX = Math.min(sx + 30 + fanIdx * 36, tx - 22);
        bend = [
          { x: trunkX, y: sy },
          { x: trunkX, y: ty }
        ];
      }
    }

    return {
      id: e.id,
      sections: [{ startPoint: { x: sx, y: sy }, bendPoints: bend, endPoint: { x: tx, y: ty } }],
      data: e.data
    };
  }).filter(Boolean);
}

// Loop edges (branch_type === 'loop' OR auto-detected back edges). Two strategies:
//   - Cross-lane loops: exit perpendicular to lane direction (top or bottom
//     face), with a horizontal trunk in the lane-gap. The exit face is
//     normally the one FACING the target's lane (top if target is above,
//     bottom if below) — but FLIPS when that face is occupied by the
//     source's own label. This avoids the loop trunk drawing through the
//     source's label box.
//   - Same-lane loops: route up over the diagram with a four-bend U (we can't
//     traverse the same lane horizontally without passing through other nodes).
function routeLoopEdges(loopEdges, positioned, laneHeights, laneCount) {
  const half = laneCount / 2;
  return (loopEdges || []).map((e, idx) => {
    const s = positioned.get(e.source);
    const t = positioned.get(e.target);
    if (!s || !t) return null;
    const sCx = s.absX + s.width / 2;
    const tCx = t.absX + t.width / 2;

    if (s.laneIdx !== t.laneIdx) {
      const sourceAbove = s.laneIdx < t.laneIdx;
      // Default exit: the face facing the target's lane.
      let exitFromTop = !sourceAbove;
      // Source label face (matches the rule in renderSwimlaneSvg):
      // top-half lanes label ABOVE the node, bottom-half label BELOW.
      const sourceLabelAbove = s.laneIdx < half;
      // If the default exit face is also the label face, flip the loop to
      // the OPPOSITE face. The trunk then runs through the other lane gap,
      // and the loop traverses extra lanes vertically inside the target's
      // column (which is task-free by construction since target sits there).
      if (exitFromTop && sourceLabelAbove) exitFromTop = false;
      else if (!exitFromTop && !sourceLabelAbove) exitFromTop = true;

      const exitX = sCx;
      const exitY = exitFromTop ? s.absY : s.absY + s.height;
      const enterX = tCx;
      const enterY = sourceAbove ? t.absY : t.absY + t.height;

      const sourceLaneTop = laneTopY(s.laneIdx, laneHeights);
      const sourceLaneBottom = sourceLaneTop + laneHeights[s.laneIdx];
      const TRUNK_INSET = 14;
      const trunkY = exitFromTop
        ? sourceLaneTop - TRUNK_INSET
        : sourceLaneBottom + TRUNK_INSET;

      return {
        id: e.id,
        sections: [{
          startPoint: { x: exitX, y: exitY },
          bendPoints: [
            { x: exitX, y: trunkY },
            { x: enterX, y: trunkY }
          ],
          endPoint: { x: enterX, y: enterY }
        }],
        data: { ...e, _isLoop: true }
      };
    }

    // Same-lane loop: route as a U BELOW the cycle, through the source lane's
    // bottom padding. Exit source's bottom-center → drop into the band →
    // traverse horizontally → rise into target's bottom-center. Keeps the
    // trunk inside the lane band so the loop reads as part of the same swim
    // line, instead of escaping to the top of the canvas.
    const sourceLaneBottom = laneTopY(s.laneIdx, laneHeights) + laneHeights[s.laneIdx];
    const trunkY = sourceLaneBottom - 12 - idx * 8;
    return {
      id: e.id,
      sections: [{
        startPoint: { x: sCx, y: s.absY + s.height },
        bendPoints: [
          { x: sCx, y: trunkY },
          { x: tCx, y: trunkY }
        ],
        endPoint: { x: tCx, y: t.absY + t.height }
      }],
      data: { ...e, _isLoop: true }
    };
  }).filter(Boolean);
}

// Cross-pool message flows. Source and target are typically in different lanes.
// Route vertically from the source's bottom (if source is above target) or top (otherwise),
// to the target's matching face. Horizontal bend in the middle when X positions differ.
//
// Black-box pool rule: a black-box pool spans the full diagram width, so its
// connection point on the boundary is a free choice. Slide the connection X
// to match the OTHER endpoint's column → the message flow becomes a clean
// straight vertical with zero bends.
//
// Envelope placement rule: if the path crosses one of the named `gapZones`
// (e.g. the empty band between regular lanes and a black-box pool), the
// envelope label is anchored to that gap's vertical center on whatever
// segment of the path is inside the gap. Otherwise it falls back to the
// path's longest-segment midpoint inside drawMessageFlow.
function routeMessageFlows(messageFlows, positioned, gapZones = []) {
  return (messageFlows || []).map(mf => {
    const s = positioned.get(mf.source);
    const t = positioned.get(mf.target);
    if (!s || !t) return null;

    const sourceIsBlackBox = s.data?.type === 'blackbox';
    const targetIsBlackBox = t.data?.type === 'blackbox';
    let sCx = s.absX + s.width / 2;
    const sCy = s.absY + s.height / 2;
    let tCx = t.absX + t.width / 2;
    const tCy = t.absY + t.height / 2;
    if (targetIsBlackBox && !sourceIsBlackBox) tCx = sCx;
    else if (sourceIsBlackBox && !targetIsBlackBox) sCx = tCx;

    let startPoint, endPoint;
    if (sCy < tCy - 4) {
      // source above target → exit bottom of source, enter top of target
      startPoint = { x: sCx, y: s.absY + s.height };
      endPoint = { x: tCx, y: t.absY };
    } else if (sCy > tCy + 4) {
      // source below target → exit top of source, enter bottom of target
      startPoint = { x: sCx, y: s.absY };
      endPoint = { x: tCx, y: t.absY + t.height };
    } else if (s.absX < t.absX) {
      startPoint = { x: s.absX + s.width, y: sCy };
      endPoint = { x: t.absX, y: tCy };
    } else {
      startPoint = { x: s.absX, y: sCy };
      endPoint = { x: t.absX + t.width, y: tCy };
    }

    let bend = [];
    if (Math.abs(startPoint.x - endPoint.x) > 4 && Math.abs(startPoint.y - endPoint.y) > 4) {
      // Place the horizontal bend close to the TARGET so the long vertical leaves the source
      // and crosses the lane gap perpendicular to the swim line — not running parallel along it.
      const goingDown = endPoint.y > startPoint.y;
      const targetMargin = 28;
      const bendY = goingDown ? endPoint.y - targetMargin : endPoint.y + targetMargin;
      bend = [
        { x: startPoint.x, y: bendY },
        { x: endPoint.x, y: bendY }
      ];
    }
    // Find the path's intersection with any gap zone, and if found, anchor
    // the envelope at the gap's mid-Y on whichever segment crosses it.
    const points = [startPoint, ...bend, endPoint];
    let envelopePos = null;
    outer: for (const zone of gapZones) {
      const zoneMidY = (zone.yStart + zone.yEnd) / 2;
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i], b = points[i + 1];
        const yMin = Math.min(a.y, b.y);
        const yMax = Math.max(a.y, b.y);
        if (a.x === b.x && yMin <= zoneMidY && yMax >= zoneMidY) {
          // Vertical segment crossing the gap — anchor envelope on it.
          envelopePos = { x: a.x, y: zoneMidY };
          break outer;
        }
        if (a.y === b.y && a.y >= zone.yStart && a.y <= zone.yEnd) {
          // Horizontal segment lying inside the gap — anchor at its midpoint.
          envelopePos = { x: (a.x + b.x) / 2, y: a.y };
          break outer;
        }
      }
    }

    return {
      id: mf.id,
      sections: [{ startPoint, bendPoints: bend, endPoint }],
      data: envelopePos ? { ...mf, _envelopePos: envelopePos } : mf
    };
  }).filter(Boolean);
}

function drawLaneBand(lane, idx, width, laneHeights) {
  const y = laneTopY(idx, laneHeights);
  const h = laneHeights[idx];
  const labelCx = 30;
  const labelCy = y + h / 2;
  return `<g>
<rect x="0" y="${y}" width="${width}" height="${h}" fill="${idx % 2 === 0 ? '#fafafa' : '#f3f5f7'}" stroke="#bbb" stroke-width="1.2"/>
<rect x="0" y="${y}" width="${LANE_HEADER}" height="${h}" fill="#eef0f3" stroke="#bbb" stroke-width="1.2"/>
<text x="${labelCx}" y="${labelCy}" class="lane-label" transform="rotate(-90 ${labelCx} ${labelCy})">${esc(lane.name)}</text>
</g>`;
}

function drawPoolBorder(participant, width, laneHeights) {
  const y = laneTopY(participant.firstLane, laneHeights);
  const lastY = laneTopY(participant.lastLane, laneHeights) + laneHeights[participant.lastLane];
  const h = lastY - y;
  return `<rect x="0" y="${y}" width="${width}" height="${h}" fill="none" stroke="#111" stroke-width="2.5"/>`;
}

// Place data objects in a dedicated "data band" above the regular lanes.
// Each data object aligns its X with its FARTHEST associated task (the one
// with the greatest absY — i.e. deepest down the diagram from the data
// band). That task's association line becomes a long clean vertical; the
// closer task's line bends as a short L instead of overlapping the long
// vertical's column. Tie or no associations → center horizontally.
//
// Why farthest, not "consumer": the bent line's risk is its FINAL segment
// — the one approaching the data anchor. If that segment is long, it is
// likely to overlap any other line that uses the data anchor's column.
// Aligning with the farthest task collapses the long segment to a clean
// straight line, eliminating the overlap risk.
function placeDataObjects(dataObjects, dataAssociations, positioned, totalWidth) {
  if (!dataObjects || !dataObjects.length) return { placed: new Map(), bandHeight: 0 };
  const placed = new Map();
  for (const d of dataObjects) {
    const associatedTaskIds = [];
    for (const a of (dataAssociations || [])) {
      if (a.source === d.id) associatedTaskIds.push(a.target);
      else if (a.target === d.id) associatedTaskIds.push(a.source);
    }
    let primaryTask = null;
    let maxY = -Infinity;
    for (const id of associatedTaskIds) {
      const t = positioned.get(id);
      if (t && t.absY > maxY) { maxY = t.absY; primaryTask = t; }
    }
    const cx = primaryTask
      ? primaryTask.absX + primaryTask.width / 2
      : totalWidth / 2;
    placed.set(d.id, { id: d.id, name: d.name, cx });
  }
  const bandHeight = DATA_BAND_PAD * 2 + DATA_OBJECT_HEIGHT + DATA_LABEL_HEIGHT;
  return { placed, bandHeight };
}

// Render a black-box pool as a single labeled rectangle. The label sits in
// the dedicated lane-header strip on the left so the pool reads consistently
// with the regular lane bands, even though the body of the pool is empty.
function drawBlackBoxPool(pool, x, y, width, height) {
  const labelCx = 30;
  const labelCy = y + height / 2;
  return `<g>
<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="white" stroke="#111" stroke-width="2.5"/>
<rect x="${x}" y="${y}" width="${LANE_HEADER}" height="${height}" fill="#eef0f3" stroke="#bbb" stroke-width="1.2"/>
<text x="${labelCx}" y="${labelCy}" class="blackbox-label" transform="rotate(-90 ${labelCx} ${labelCy})">${esc(pool.name)}</text>
</g>`;
}

export async function renderSwimlaneSvg(ir) {
  const participants = ir.process?.participants || [];
  const hasLanes = participants.some(p => (p.lanes || []).some(l => (l.nodeRefs || []).length > 0));
  if (!hasLanes) return await renderElkSvg(ir);

  const { lanes, nodeToLaneIdx, participantRanges, blackBoxPools, hasMultiplePools } = buildLaneIndex(ir);

  // Loop edges are excluded from ELK's input so it sees a DAG and can lay it
  // out cleanly. We route loop edges separately as backwards U-shapes after
  // the main layout. Loop detection lives in ./loopDetection.js so the rule
  // is shared across renderers.
  const allEdges = ir.process?.edges || [];
  const loopEdgeIds = detectLoopEdges(ir);
  const loopEdges = allEdges.filter(e => loopEdgeIds.has(e.id));
  const dagEdges = allEdges.filter(e => !loopEdgeIds.has(e.id));
  const dagIr = { ...ir, process: { ...ir.process, edges: dagEdges } };

  const elk = new ELK();
  const flatLayout = await elk.layout(irToElkGraph(dagIr, { stripBoundaries: false }));
  const children = flatLayout.children || [];
  const edges = flatLayout.edges || [];

  const { colIdxByX } = groupByColumn(children);
  const { placement, maxCol, stackByLane, columnMaxWidth } = placeNodes(
    children, edges, ir.process.message_flows, nodeToLaneIdx, colIdxByX, lanes.length
  );
  const { positioned, laneHeights, contentRight } = buildPositionedNodes(
    children, placement, stackByLane, columnMaxWidth, maxCol
  );
  const routedEdges = routeEdges(edges, positioned, laneHeights);

  const totalWidth = contentRight + RIGHT_PAD;
  const lanesHeight = laneHeights.reduce((a, b) => a + b, 0);
  // Each black-box pool's height is sized so its rotated name label fits.
  // The label is drawn rotated -90° in the pool's lane-header strip, so
  // its visual height equals the text width: ~9 px per character + padding.
  const blackBoxHeight = (pool) =>
    Math.max(BLACKBOX_HEIGHT_MIN, (pool.name?.length || 0) * 9 + 32);
  const blackBoxHeights = blackBoxPools.map(blackBoxHeight);
  const blackBoxBlockHeight = blackBoxPools.length
    ? BLACKBOX_GAP + blackBoxHeights.reduce((a, b) => a + b, 0)
    : 0;
  // Data-object band sits ABOVE the lanes — keep the data shapes visually
  // separate from the work-flow shapes and lets the dotted association
  // lines drop down cleanly into each task.
  const dataObjects = ir.process?.data_objects || [];
  const dataAssociations = ir.process?.data_associations || [];
  const { placed: placedDataObjects, bandHeight: dataBandHeight } =
    placeDataObjects(dataObjects, dataAssociations, positioned, totalWidth);
  const dataBandY = TOP_PAD;
  const lanesY = TOP_PAD + dataBandHeight;
  const totalHeight = lanesY + lanesHeight + blackBoxBlockHeight + TOP_PAD;

  // Synthesize positioned "nodes" for each black-box pool so message-flow
  // routing can target them by participant ID. Each pool's connection point
  // is its own bounding box's center. NOTE: black-box positions are
  // expressed in the SHIFTED coordinate space (post-data-band), since they
  // share the diagram-content `<g transform>`.
  const blackBoxPositions = new Map();
  let blackBoxYCursor = TOP_PAD + lanesHeight + BLACKBOX_GAP;
  blackBoxPools.forEach((pool, i) => {
    const h = blackBoxHeights[i];
    blackBoxPositions.set(pool.id, {
      id: pool.id,
      absX: 0, absY: blackBoxYCursor,
      width: totalWidth, height: h,
      laneIdx: lanes.length + i,
      data: { type: 'blackbox', name: pool.name }
    });
    blackBoxYCursor += h;
  });

  const laneSvg = lanes.map((lane, idx) => drawLaneBand(lane, idx, totalWidth, laneHeights)).join('\n');
  const blackBoxSvg = blackBoxPools.map((pool, i) => {
    const pos = blackBoxPositions.get(pool.id);
    return drawBlackBoxPool(pool, 0, pos.absY, totalWidth, pos.height);
  }).join('\n');
  const poolSvg = hasMultiplePools
    ? participantRanges.map(p => drawPoolBorder(p, totalWidth, laneHeights)).join('\n')
    : '';
  const routedLoopEdges = routeLoopEdges(loopEdges, positioned, laneHeights, lanes.length);

  // Message flow source/target may be a NODE id or a PARTICIPANT id (when the
  // other end is a black-box pool). Resolve both kinds before routing.
  const positionedForMf = new Map(positioned);
  for (const [id, pos] of blackBoxPositions) positionedForMf.set(id, pos);

  // Route message flows up-front (label-placement collision check needs the
  // resolved segments).
  const gapZones = [];
  if (blackBoxPools.length) {
    gapZones.push({ yStart: TOP_PAD + lanesHeight, yEnd: TOP_PAD + lanesHeight + BLACKBOX_GAP });
  }
  const routedMessageFlows = routeMessageFlows(ir.process.message_flows, positionedForMf, gapZones);

  // IRON RULE: no two connectors may share an attach point on a node. Run a
  // single distribution pass over EVERY incident connector (sequence flows,
  // loops, message flows) so per-face buckets see the full set and spread
  // them along the face. Black-box pool positions are included so message
  // flows entering a pool are also distinguished. Then assert the invariant —
  // any remaining duplicate is a render bug, not a warning.
  enforceDistinctEndpoints(
    [...routedEdges, ...routedLoopEdges, ...routedMessageFlows],
    positionedForMf
  );
  const overlaps = findOverlappingEndpoints(
    [...routedEdges, ...routedLoopEdges, ...routedMessageFlows],
    positionedForMf
  );
  if (overlaps.length > 0) {
    throw new Error(
      `Render invariant violated: ${overlaps.length} connector endpoint(s) overlap. ` +
      `Sample: ${JSON.stringify(overlaps[0])}`
    );
  }

  // Event glyphs render with a 5px inset inside their bbox. Move endpoints
  // touching event nodes inward by 5 px so the arrow tip lands on the
  // visible circle, not on the (invisible) bbox edge 5 px outside it.
  insetEventEndpoints(
    [...routedEdges, ...routedLoopEdges, ...routedMessageFlows],
    positionedForMf
  );

  // Iron rule: collinear overlapping trunks must be drawn as separate lines.
  // Two horizontal segments at the same y with overlapping x ranges (or two
  // vertical segments at the same x with overlapping y ranges) get
  // staggered perpendicular to the segment so each one renders on its own
  // track. Loop edges already self-stagger by index, so they're skipped.
  staggerOverlappingTrunks(
    [...routedEdges, ...routedLoopEdges, ...routedMessageFlows]
  );

  // Edge labels must clear EVERY node glyph AND every already-placed edge
  // label. We pre-place labels iteratively, longest-first (the long ones
  // have the least flexibility, so they go first), accumulating each placed
  // label's rect into the obstacle list for subsequent labels. drawEdge
  // reads `edge._label` if set and skips its own placement step.
  const labelObstacles = [...positioned.values()].map(n => ({
    x: n.absX, y: n.absY, w: n.width, h: n.height
  }));
  const labellableEdges = [...routedEdges, ...routedLoopEdges].filter(e => e.data?.condition);
  labellableEdges.sort((a, b) => (b.data.condition.length - a.data.condition.length));
  const placedLabelRects = [];
  for (const e of labellableEdges) {
    e._obstacles = [...labelObstacles, ...placedLabelRects];
    const sec = e.sections?.[0];
    if (!sec) continue;
    const pts = [sec.startPoint, ...(sec.bendPoints || []), sec.endPoint];
    const label = placeEdgeLabel({ ...e.data, _obstacles: e._obstacles }, pts);
    if (!label) continue;
    e._label = label;
    placedLabelRects.push({
      x: label.x - label.backgroundWidth / 2,
      y: label.y - 14,
      w: label.backgroundWidth,
      h: label.backgroundHeight
    });
  }

  const edgeSvg = [...routedEdges, ...routedLoopEdges].map(drawEdge).join('\n');
  const messageFlowSvg = routedMessageFlows.map(drawMessageFlow).join('\n');

  // Track which faces of each node are USED by connectors. The label can
  // then be placed on a free face — never on a face that already has a
  // vertical connector running through its column.
  const half = lanes.length / 2;
  const blockedFaces = new Map();
  const blockFace = (id, face) => {
    if (!id || !positioned.has(id)) return;
    if (!blockedFaces.has(id)) blockedFaces.set(id, new Set());
    blockedFaces.get(id).add(face);
  };
  // Message flows: vertical connector exits source's bottom (if source above
  // target) or top (if below), and enters target's matching opposite face.
  for (const mf of (ir.process?.message_flows || [])) {
    const s = positionedForMf.get(mf.source);
    const t = positionedForMf.get(mf.target);
    if (!s || !t) continue;
    const sCy = s.absY + s.height / 2;
    const tCy = t.absY + t.height / 2;
    if (sCy < tCy - 4) { blockFace(mf.source, 'bottom'); blockFace(mf.target, 'top'); }
    else if (sCy > tCy + 4) { blockFace(mf.source, 'top'); blockFace(mf.target, 'bottom'); }
  }
  // Data associations: data objects sit ABOVE the lanes, so the task end
  // always uses its TOP face — regardless of association direction.
  for (const a of (ir.process?.data_associations || [])) {
    if (placedDataObjects.has(a.source)) blockFace(a.target, 'top');
    else if (placedDataObjects.has(a.target)) blockFace(a.source, 'top');
  }
  // Loop edges: must replicate the exit-face logic from routeLoopEdges so
  // label decisions stay in sync with the actual rendered geometry.
  for (const e of loopEdges) {
    const s = positioned.get(e.source);
    const t = positioned.get(e.target);
    if (!s || !t || s.laneIdx === t.laneIdx) continue;
    const sourceAbove = s.laneIdx < t.laneIdx;
    let exitFromTop = !sourceAbove;
    const sourceLabelAbove = s.laneIdx < half;
    if (exitFromTop && sourceLabelAbove) exitFromTop = false;
    else if (!exitFromTop && !sourceLabelAbove) exitFromTop = true;
    blockFace(e.source, exitFromTop ? 'top' : 'bottom');
    blockFace(e.target, sourceAbove ? 'top' : 'bottom');
  }

  // Label position rules (events/gateways only — tasks have internal labels):
  //   1. Free face wins (above if bottom blocked, below if top blocked).
  //   2. Both top AND bottom blocked → fall back to a SIDE label so the
  //      label clears the vertical connector column entirely. Pick the side
  //      with more diagram space (whichever side the node is closer to).
  //   3. Neither blocked → existing lane-half rule (top-half labels above,
  //      bottom-half labels below).
  // Collect OBSTACLES the label must clear. Three kinds:
  //   1. Other node bboxes (hard — must never overlap)
  //   2. Routed connector segments (sequence flows, message flows, loop
  //      edges) — labels mustn't sit ON A LINE
  //   3. Optional: group-box borders. Skipped here because group borders
  //      are dashed-dotted annotations and a label crossing them reads
  //      cleanly enough; treating them as hard obstacles makes member
  //      labels impossible to place.
  const otherNodeBoxes = (ownId) => [...positioned.values()]
    .filter(o => o.id !== ownId)
    .map(o => ({ x: o.absX, y: o.absY, w: o.width, h: o.height }));
  // Flatten all routed sections to a list of orthogonal segments.
  const flowSegments = [];
  const collectSegs = (routed) => {
    for (const r of routed) {
      const sec = r.sections?.[0];
      if (!sec) continue;
      const pts = [sec.startPoint, ...(sec.bendPoints || []), sec.endPoint];
      for (let i = 0; i < pts.length - 1; i++) {
        flowSegments.push([pts[i], pts[i + 1]]);
      }
    }
  };
  collectSegs(routedEdges);
  collectSegs(routedLoopEdges);
  collectSegs(routedMessageFlows);

  const labelBBox = (n, position, name) => {
    const lines = (name || '').split(/\s+/);
    const longest = Math.max(...lines.map(w => w.length), 6);
    const w = longest * 7 + 6;
    const h = 28;
    const cx = n.absX + n.width / 2;
    const cy = n.absY + n.height / 2;
    const m = 8;
    switch (position) {
      case 'above': return { x: cx - w/2, y: n.absY - 6 - h, w, h };
      case 'below': return { x: cx - w/2, y: n.absY + n.height + 4, w, h };
      case 'left':  return { x: n.absX - m - w, y: cy - h/2, w, h };
      case 'right': return { x: n.absX + n.width + m, y: cy - h/2, w, h };
      // Diagonals tightly hug the glyph corner (label's opposite corner at
      // glyph corner). Adjacent-task corner overlap is tolerated by the
      // collision check; only flow segments and canvas bounds are hard.
      case 'nw':    return { x: n.absX - m - w, y: n.absY - 6 - h, w, h };
      case 'ne':    return { x: n.absX + n.width + m, y: n.absY - 6 - h, w, h };
      case 'sw':    return { x: n.absX - m - w, y: n.absY + n.height + 4, w, h };
      case 'se':    return { x: n.absX + n.width + m, y: n.absY + n.height + 4, w, h };
    }
  };
  const bboxOverlaps = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y;
  const segHitsBBox = (seg, bb) => {
    const [p, q] = seg;
    if (p.x === q.x) {
      const yMin = Math.min(p.y, q.y), yMax = Math.max(p.y, q.y);
      return p.x > bb.x && p.x < bb.x + bb.w && yMin < bb.y + bb.h && yMax > bb.y;
    }
    if (p.y === q.y) {
      const xMin = Math.min(p.x, q.x), xMax = Math.max(p.x, q.x);
      return p.y > bb.y && p.y < bb.y + bb.h && xMin < bb.x + bb.w && xMax > bb.x;
    }
    return false;
  };

  const nodeSvg = [...positioned.values()].map(n => {
    const blocked = blockedFaces.get(n.id);
    const top = blocked?.has('top'), bot = blocked?.has('bottom');
    // Cardinals first, diagonals as fallback. Per user rule: when N/E/S/W
    // are all blocked, try NW, SW, NE, SE in that order.
    //
    // Boundary events are special: the glyph straddles its host's edge and
    // its outflow trunk runs perpendicular to that edge through the glyph's
    // column. Both 'above' and 'below' would either land inside the host or
    // collide with the trunk, so the label must go to a SIDE. Prefer the
    // outward diagonal (sw for bottom-edge boundary, nw for top-edge) so the
    // label hugs the glyph corner instead of straddling the trunk column.
    const candidates = [];
    if (n.data?.subtype === 'boundary') {
      if (n._edge === 'bottom') candidates.push('sw', 'left', 'se', 'right');
      else candidates.push('nw', 'left', 'ne', 'right');
    } else {
      if (!top) candidates.push('above');
      if (!bot) candidates.push('below');
      candidates.push('right', 'left', 'nw', 'sw', 'ne', 'se');
    }
    const others = otherNodeBoxes(n.id);
    let labelPosition;
    for (const c of candidates) {
      const bb = labelBBox(n, c, n.data?.name);
      if (bb.x < 4 || bb.x + bb.w > totalWidth - 4) continue;
      const isDiagonal = c === 'nw' || c === 'ne' || c === 'sw' || c === 'se';
      // Cardinal positions: hard task-overlap rejection (these positions
      // straddle a face fully). Diagonal positions: tolerate adjacent-task
      // CORNER overlap so the label can hug its glyph as tightly as
      // possible per BPMN convention. Flow segments and canvas bounds
      // remain hard for both.
      if (!isDiagonal && others.some(o => bboxOverlaps(bb, o))) continue;
      if (flowSegments.some(s => segHitsBBox(s, bb))) continue;
      labelPosition = c;
      break;
    }
    if (!labelPosition) labelPosition = n.laneIdx < half ? 'above' : 'below';
    return drawNodeAt({ ...n, labelPosition });
  }).join('\n');

  // Data objects: render in a fixed band at the top of the diagram, with
  // dotted association lines that drop down into the SHIFTED diagram body.
  // Distribute each data object's X horizontally; if multiple coincide,
  // nudge them apart so labels don't overlap.
  let dataObjectsSvg = '';
  let dataAssociationsSvg = '';
  if (placedDataObjects.size > 0) {
    const sorted = [...placedDataObjects.values()].sort((a, b) => a.cx - b.cx);
    const minSpacing = DATA_OBJECT_WIDTH + 60;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].cx - sorted[i - 1].cx < minSpacing) {
        sorted[i].cx = sorted[i - 1].cx + minSpacing;
      }
    }
    // Label sits ABOVE the glyph, so the glyph itself starts below the
    // top padding PLUS the label gutter — leaving the column below the
    // glyph free for the association trunk.
    const dataObjectY = dataBandY + DATA_BAND_PAD + DATA_LABEL_HEIGHT;
    // Each data object exposes three potential anchor points: bottom, left,
    // right. The bottom anchor is reserved for the ALIGNED (vertical) task
    // — its connector is a clean straight vertical. Non-aligned tasks
    // attach to the left or right anchor depending on which side of the
    // data object their column is on. This guarantees the same data object
    // never has two connectors meeting at the same point.
    const dataLayout = new Map();
    dataObjectsSvg = sorted.map(d => {
      const x = d.cx - DATA_OBJECT_WIDTH / 2;
      const y = dataObjectY;
      dataLayout.set(d.id, {
        cx: d.cx,
        bottom: { x: d.cx, y: y + DATA_OBJECT_HEIGHT },
        left:   { x: x, y: y + DATA_OBJECT_HEIGHT / 2 },
        right:  { x: x + DATA_OBJECT_WIDTH, y: y + DATA_OBJECT_HEIGHT / 2 }
      });
      return drawDataObject(x, y, d.name);
    }).join('\n');
    const assocPaths = [];
    for (const a of dataAssociations) {
      const fromData = dataLayout.has(a.source);
      const dataId = fromData ? a.source : a.target;
      const taskId = fromData ? a.target : a.source;
      const layout = dataLayout.get(dataId);
      const task = positioned.get(taskId);
      if (!layout || !task) continue;
      const taskTopX = task.absX + task.width / 2;
      const taskTopY = task.absY + dataBandHeight;
      // Side selection: bottom if vertically aligned, otherwise the side
      // facing the task.
      const dx = taskTopX - layout.cx;
      let anchor, side;
      if (Math.abs(dx) < 2) { anchor = layout.bottom; side = 'bottom'; }
      else if (dx < 0)      { anchor = layout.left;   side = 'left'; }
      else                  { anchor = layout.right;  side = 'right'; }
      // Routing: bottom anchor → straight vertical. Side anchor → L-route
      // whose vertical leg is in the task's column (never the data column).
      let points;
      if (side === 'bottom') {
        points = fromData
          ? [anchor, { x: taskTopX, y: taskTopY }]
          : [{ x: taskTopX, y: taskTopY }, anchor];
      } else {
        // L-route: horizontal at anchor Y (data band level), vertical at
        // task X. Direction depends on whether we start at data or task.
        points = fromData
          ? [anchor, { x: taskTopX, y: anchor.y }, { x: taskTopX, y: taskTopY }]
          : [{ x: taskTopX, y: taskTopY }, { x: taskTopX, y: anchor.y }, anchor];
      }
      assocPaths.push(drawDataAssociation(points));
    }
    dataAssociationsSvg = assocPaths.join('\n');
  }

  // Group boxes: dashed-dotted rectangles around named subsets of nodes.
  // Bounding box computed from member nodes with GROUP_PADDING. Drawn AFTER
  // the lanes (so the lane fill doesn't overpaint the dashed border) but
  // BEFORE the nodes (so glyphs sit on top). Layout is pure annotation —
  // groups don't shift any layout.
  const groups = ir.process?.groups || [];
  const groupSvg = groups.map(g => {
    const refs = (g.nodeRefs || []).map(id => positioned.get(id)).filter(Boolean);
    if (!refs.length) return '';
    const minX = Math.min(...refs.map(n => n.absX)) - GROUP_PADDING;
    const maxX = Math.max(...refs.map(n => n.absX + n.width)) + GROUP_PADDING;
    const minY = Math.min(...refs.map(n => n.absY)) - GROUP_PADDING;
    const maxY = Math.max(...refs.map(n => n.absY + n.height)) + GROUP_PADDING;
    return drawGroupBox(minX, minY, maxX - minX, maxY - minY, g.name);
  }).filter(Boolean).join('\n');

  // Diagram body (lanes, edges, nodes, message flows, black-box pools) gets
  // shifted down to make room for the data band above. Group boxes are
  // drawn between lanes and edges so they sit behind the work-flow shapes.
  const body = `${dataObjectsSvg}
<g transform="translate(0,${dataBandHeight})">
${laneSvg}
${blackBoxSvg}
${poolSvg}
${groupSvg}
${edgeSvg}
${nodeSvg}
${messageFlowSvg}
</g>
${dataAssociationsSvg}`;

  return svgDocument({
    width: totalWidth,
    height: totalHeight,
    body,
    extraStyles: LANE_STYLES,
    processName: ir.process?.name,
    prompt: ir._meta?.prompt
  });
}
