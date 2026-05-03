import ELK from 'elkjs/lib/elk.bundled.js';
import { irToElkGraph, nodeSize, collectBoundaryChains } from './irToElkGraph.js';
import { drawNodeAt, drawEdge, svgDocument } from './svgPrimitives.js';
import { enforceDistinctEndpoints, findOverlappingEndpoints } from './distinctEndpoints.js';
import { detectLoopEdges } from './loopDetection.js';
import { classifyGatewayBranches } from './gatewayPorts.js';
import { placeEdgeLabel } from './labelEngine.js';
import { insetEventEndpoints } from './eventEndpointInset.js';
import { boundaryAttachPoint, indexBoundariesByEdge } from './boundaryPlacement.js';
import { nodeBox } from './nodeGeometry.js';

const HANDLER_VERTICAL_OFFSET = 130;  // vertical gap between boundary and first chained node
const CHAIN_STEP = 110;               // vertical gap between successive chained nodes
// Boundary label clearance rule: right edge of the label must sit at least
// LABEL_TRUNK_CLEARANCE pixels left of the outflow trunk (which runs at the
// glyph's center). The trunk is at cx; the glyph's left edge is at cx-28; so
// gap-from-glyph-left = LABEL_TRUNK_CLEARANCE - 28. With 60px trunk clearance
// the label still hugs the symbol (~32px from glyph left) without the trunk
// visually crowding the text.
const LABEL_TRUNK_CLEARANCE = 60;
const BOUNDARY_LABEL_GLYPH_MARGIN_X = LABEL_TRUNK_CLEARANCE - 28;
const BOUNDARY_LABEL_GLYPH_MARGIN_Y = 8;

// Wraps the shared boundary placement rule for the ELK renderer's coord shape.
// The ELK path additionally tracks label-anchor positions so the boundary
// label clears its host's left edge — see BOUNDARY_LABEL_* constants above.
function placeBoundaries(boundaryNodes, layoutChildrenById) {
  const indexed = indexBoundariesByEdge(boundaryNodes);
  const size = nodeSize({ type: 'event' });
  const placed = [];
  for (const b of boundaryNodes) {
    const meta = indexed.get(b.id);
    if (!meta) continue;
    const host = layoutChildrenById.get(meta.hostId);
    if (!host) continue;
    const { cx, cy, edge } = boundaryAttachPoint(nodeBox(host), b, meta.idxOnEdge);
    const glyphLeft = cx - size.width / 2;
    const glyphTop = cy - size.height / 2;
    const glyphBottom = cy + size.height / 2;
    placed.push({
      id: b.id,
      x: glyphLeft,
      y: glyphTop,
      width: size.width,
      height: size.height,
      data: b,
      _edge: edge,
      _labelAnchorX: glyphLeft - BOUNDARY_LABEL_GLYPH_MARGIN_X,
      _labelAnchorY: edge === 'top'
        ? glyphTop - BOUNDARY_LABEL_GLYPH_MARGIN_Y - 11
        : glyphBottom + BOUNDARY_LABEL_GLYPH_MARGIN_Y + 3
    });
  }
  return placed;
}

// Walk the chain starting from a boundary event and lay each chained node out
// in a straight line away from the host: directly above (top boundary) or
// below (bottom boundary), spaced by CHAIN_STEP. Each chained node is centered
// on the boundary's column, so the connecting edges are clean verticals.
function placeBoundaryChains(boundaryNodes, allNodes, allEdges, boundaryPositions) {
  const nodeById = new Map(allNodes.map(n => [n.id, n]));
  const boundaryById = new Map(boundaryNodes.map(b => [b.id, b]));
  const { chainNodeIds, chainEdgeIds, chainHeads } = collectBoundaryChains(allNodes, allEdges, boundaryById);
  const outBySource = new Map();
  for (const e of allEdges) {
    if (!outBySource.has(e.source)) outBySource.set(e.source, []);
    outBySource.get(e.source).push(e);
  }
  const placed = new Map(); // nodeId → positioned node
  for (const b of boundaryNodes) {
    const heads = chainHeads.get(b.id) || [];
    const bp = boundaryPositions.get(b.id);
    if (!bp || !heads.length) continue;
    const isTop = bp._edge === 'top';
    const direction = isTop ? -1 : 1;
    const boundaryCx = bp.x + bp.width / 2;
    const exitY = isTop ? bp.y : bp.y + bp.height;
    // Place chain nodes on the boundary's column (no lateral offset) so the
    // outflow edge is a single straight vertical line. The boundary's label
    // sits to the side, leaving the column clear for the trunk.
    const handlerCx = boundaryCx;
    let depth = 0;
    let frontier = heads.map(eId => allEdges.find(e => e.id === eId)?.target).filter(Boolean);
    while (frontier.length) {
      depth += 1;
      const nextFrontier = [];
      for (const id of frontier) {
        if (placed.has(id)) continue;
        if (!chainNodeIds.has(id)) continue;
        const node = nodeById.get(id);
        if (!node) continue;
        const size = nodeSize(node);
        const stepSpan = HANDLER_VERTICAL_OFFSET + (depth - 1) * CHAIN_STEP;
        const cy = exitY + direction * stepSpan;
        placed.set(id, {
          id,
          x: handlerCx - size.width / 2,
          y: cy - size.height / 2,
          width: size.width,
          height: size.height,
          data: node,
          _chainDirection: isTop ? 'above' : 'below',
          _boundaryId: b.id
        });
        for (const e of outBySource.get(id) || []) {
          if (chainEdgeIds.has(e.id) && chainNodeIds.has(e.target)) {
            nextFrontier.push(e.target);
          }
        }
      }
      frontier = nextFrontier;
    }
  }
  return { placedChainNodes: [...placed.values()], chainEdgeIds };
}

// Override the start point of an edge that originally exited a boundary event.
// The edge in the ELK layout starts at the host (because we rewrote the source
// in irToElkGraph). We replace that with: exit the boundary perpendicular to
// its host edge, run a short trunk in that direction, then bend horizontally
// toward the target.
function rerouteBoundaryEdge(edge, boundaryPos) {
  const section = edge.sections?.[0];
  if (!section) return edge;
  const cx = boundaryPos.x + boundaryPos.width / 2;
  const isTop = boundaryPos._edge === 'top';
  const exitY = isTop ? boundaryPos.y : boundaryPos.y + boundaryPos.height;
  const startPoint = { x: cx, y: exitY };
  const endPoint = section.endPoint;
  const trunkLen = 30;
  const trunkY = isTop ? exitY - trunkLen : exitY + trunkLen;
  const bend = (Math.abs(cx - endPoint.x) > 4)
    ? [{ x: cx, y: trunkY }, { x: endPoint.x, y: trunkY }]
    : [];
  return {
    ...edge,
    sections: [{ startPoint, bendPoints: bend, endPoint }]
  };
}

// Build edge geometry for chain edges (boundary→handler, handler→handler) that
// were excluded from ELK. Each connects two nodes in a vertical column above
// or below the host activity, so the path is a straight vertical drop.
function buildChainEdges(allEdges, chainEdgeIds, boundaryPositions, chainPositionsById) {
  return allEdges
    .filter(e => chainEdgeIds.has(e.id))
    .map(e => {
      const src = boundaryPositions.get(e.source) || chainPositionsById.get(e.source);
      const tgt = chainPositionsById.get(e.target);
      if (!src || !tgt) return null;
      const sCx = src.x + src.width / 2;
      const tCx = tgt.x + tgt.width / 2;
      const isFromBoundary = boundaryPositions.has(e.source);
      const isTop = isFromBoundary
        ? src._edge === 'top'
        : src._chainDirection === 'above';
      const startY = isFromBoundary
        ? (isTop ? src.y : src.y + src.height)
        : (isTop ? src.y : src.y + src.height);
      const endY = isTop ? tgt.y + tgt.height : tgt.y;
      const startPoint = { x: sCx, y: startY };
      const endPoint = { x: tCx, y: endY };
      const bend = (Math.abs(sCx - tCx) > 4)
        ? [{ x: sCx, y: (startY + endY) / 2 }, { x: tCx, y: (startY + endY) / 2 }]
        : [];
      return {
        id: e.id,
        sections: [{ startPoint, bendPoints: bend, endPoint }],
        data: e
      };
    })
    .filter(Boolean);
}

// Rewrites the geometry of every gateway-out edge so the BPMN port convention
// (main → right, others → top/bottom) holds in the ELK path too. ELK by
// default routes all fan-out branches off the source's right face — fine for
// general orthogonal layout, but it means a 3-way exclusive split looks like
// a fan radiating from one vertex, which obscures which branch is the
// continuing flow. We apply the shared classifyGatewayBranches rule and
// rewrite the path: keep ELK's endPoint where the target sits, but replace
// the start + bend list with a clean orthogonal route from the chosen face.
function rerouteElkGatewayBranches(shiftedEdges, shiftedNodes) {
  const byId = new Map(shiftedNodes.map(n => [n.id, n]));
  const outBySource = new Map();
  for (const e of shiftedEdges) {
    // Loop edges are routed by routeElkLoopEdges and shouldn't be reclassified.
    if (e.data?._isLoop) continue;
    const sId = e.data?.source;
    if (!sId) continue;
    if (!outBySource.has(sId)) outBySource.set(sId, []);
    outBySource.get(sId).push(e);
  }
  for (const [sId, outs] of outBySource) {
    const s = byId.get(sId);
    if (!s || s.data?.type !== 'gateway' || outs.length < 2) continue;
    const sCx = s.x + s.width / 2;
    const sCy = s.y + s.height / 2;
    const branches = outs.map(e => ({
      id: e.id,
      data: e.data,
      targetCenterY: e.sections?.[0]?.endPoint?.y ?? sCy
    }));
    const portByBranch = classifyGatewayBranches(branches, sCy);
    for (const e of outs) {
      const port = portByBranch.get(e.id);
      const sec = e.sections?.[0];
      if (!sec || port === 'right') continue;
      const tx = sec.endPoint.x;
      const ty = sec.endPoint.y;
      const startY = port === 'top' ? s.y : s.y + s.height;
      sec.startPoint = { x: sCx, y: startY };
      // Orthogonal route: drop/rise to the target's row, then over to target.
      // If column-aligned, no horizontal segment is needed.
      sec.bendPoints = Math.abs(sCx - tx) < 4 ? [] : [{ x: sCx, y: ty }];
    }
  }
}

// Route loops as U-shapes BELOW the main DAG layout. Each loop exits the
// source's bottom face and enters the target's bottom face, with a horizontal
// trunk in the band between the layout's bottom edge and the bottom padding.
// Multiple loops stagger their trunk Y so they don't overlap.
//
// Operates on POST-shift, post-bounds-known coordinates: every node already
// has its final (x,y) in the rendered scene, and `loopBandY` is the y of the
// first trunk; subsequent loops drop by `loopBandStep`.
function routeElkLoopEdges(loopEdges, allRenderedNodes, loopBandY, loopBandStep = 16) {
  const byId = new Map(allRenderedNodes.map(n => [n.id, n]));
  return loopEdges.map((edge, i) => {
    const s = byId.get(edge.source);
    const t = byId.get(edge.target);
    if (!s || !t) return null;
    const sCx = s.x + s.width / 2;
    const tCx = t.x + t.width / 2;
    const trunkY = loopBandY + i * loopBandStep;
    return {
      id: edge.id,
      sections: [{
        startPoint: { x: sCx, y: s.y + s.height },
        bendPoints: [
          { x: sCx, y: trunkY },
          { x: tCx, y: trunkY }
        ],
        endPoint: { x: tCx, y: t.y + t.height }
      }],
      data: { ...edge, _isLoop: true }
    };
  }).filter(Boolean);
}

export async function renderElkSvg(ir, options = {}) {
  const elk = new ELK();
  // Loop edges are excluded from ELK so it sees a clean DAG. The shared
  // detector catches both `branch_type='loop'` and any unmarked back-edge.
  const allEdges = ir.process?.edges || [];
  const loopEdgeIds = detectLoopEdges(ir);
  const dagEdges = allEdges.filter(e => !loopEdgeIds.has(e.id));
  const dagIr = { ...ir, process: { ...ir.process, edges: dagEdges } };
  const graph = irToElkGraph(dagIr, options);
  const layout = await elk.layout(graph);

  const layoutChildren = layout.children || [];
  const layoutEdges = layout.edges || [];
  const layoutChildrenById = new Map(layoutChildren.map(c => [c.id, c]));

  const allNodes = ir.process?.nodes || [];
  const loopEdges = allEdges.filter(e => loopEdgeIds.has(e.id));
  const boundaryNodes = allNodes.filter(n => n.subtype === 'boundary' && n.attachedTo);
  const placedBoundaries = placeBoundaries(boundaryNodes, layoutChildrenById);
  const boundaryPositions = new Map(placedBoundaries.map(b => [b.id, b]));
  const chainPositionsById = new Map();
  const { placedChainNodes, chainEdgeIds } = placeBoundaryChains(
    boundaryNodes, allNodes, allEdges, boundaryPositions
  );
  for (const c of placedChainNodes) chainPositionsById.set(c.id, c);

  const reRoutedLayoutEdges = layoutEdges.map(e => {
    const bid = e.data?._boundarySourceId;
    if (!bid) return e;
    const bp = boundaryPositions.get(bid);
    if (!bp) return e;
    return rerouteBoundaryEdge(e, bp);
  });

  const chainEdges = buildChainEdges(allEdges, chainEdgeIds, boundaryPositions, chainPositionsById);

  const allRenderedNodes = [...layoutChildren, ...placedBoundaries, ...placedChainNodes];
  const allRenderedEdges = [...reRoutedLayoutEdges, ...chainEdges];

  // Boundary handler chains are placed above/below the host, so they can land
  // at negative y or below the layout's reported maxY. Compute the true bounds
  // across everything we'll render and translate the whole scene so origin sits
  // at (paddingX, paddingY). Reserve extra headroom for chain nodes that label
  // upward — their text sits above the glyph.
  const labelHeadroom = 36;
  const padX = 70;
  const padY = 70;
  const minY = Math.min(0, ...allRenderedNodes.map(n =>
    n._chainDirection === 'above' ? n.y - labelHeadroom : n.y
  ));
  const minX = Math.min(0, ...allRenderedNodes.map(n => n.x));
  const dx = padX - minX;
  const dy = padY - minY;

  const shift = (n) => ({ ...n, x: n.x + dx, y: n.y + dy });
  const shiftEdge = (e) => ({
    ...e,
    sections: e.sections?.map(s => ({
      startPoint: { x: s.startPoint.x + dx, y: s.startPoint.y + dy },
      endPoint: { x: s.endPoint.x + dx, y: s.endPoint.y + dy },
      bendPoints: (s.bendPoints || []).map(p => ({ x: p.x + dx, y: p.y + dy }))
    }))
  });
  const shiftedNodes = allRenderedNodes.map(shift);
  const shiftedEdges = allRenderedEdges.map(shiftEdge);

  // Loop edges route as U-shapes through a band BELOW the rendered DAG.
  // Compute the band's top Y from the lowest non-chain node bottom.
  const layoutMaxY = Math.max(0, ...shiftedNodes.map(n =>
    n._chainDirection === 'below' ? n.y + n.height + labelHeadroom : n.y + n.height
  ));
  const loopBandTop = layoutMaxY + 24;
  const loopBandStep = 16;
  const routedLoopEdges = routeElkLoopEdges(loopEdges, shiftedNodes, loopBandTop, loopBandStep);

  const allShiftedEdges = [...shiftedEdges, ...routedLoopEdges];

  // Edge labels must clear every node glyph AND every already-placed edge
  // label. Pre-place iteratively, longest-first, accumulating each placed
  // label's rect as an obstacle for the next.
  const labelObstacles = shiftedNodes.map(n => ({ x: n.x, y: n.y, w: n.width, h: n.height }));
  const labellableEdges = allShiftedEdges.filter(e => e.data?.condition);
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

  // BPMN port convention: rewrite gateway-out edges so main exits right and
  // every other branch exits top or bottom. Runs BEFORE enforceDistinctEndpoints
  // so its retro-distribution sees the post-reroute geometry.
  rerouteElkGatewayBranches(allShiftedEdges, shiftedNodes);

  // IRON RULE: no two connectors may share an attach point on a node.
  // Distribute endpoints across each node face, then assert no overlaps remain.
  enforceDistinctEndpoints(allShiftedEdges, shiftedNodes);
  const overlaps = findOverlappingEndpoints(allShiftedEdges, shiftedNodes);
  if (overlaps.length > 0) {
    throw new Error(
      `Render invariant violated: ${overlaps.length} connector endpoint(s) overlap. ` +
      `Sample: ${JSON.stringify(overlaps[0])}`
    );
  }

  // Event glyphs are inset 5 px inside their bbox; move endpoints touching
  // events inward so the arrow tip lands on the visible circle perimeter.
  insetEventEndpoints(allShiftedEdges, shiftedNodes);

  const maxX = Math.max(...shiftedNodes.map(n => n.x + n.width)) + padX;
  const loopBandBottom = routedLoopEdges.length > 0
    ? loopBandTop + (routedLoopEdges.length - 1) * loopBandStep + 16
    : 0;
  const maxY = Math.max(layoutMaxY, loopBandBottom) + padY;

  // Label position rules:
  //   - Boundary events label to the LEFT — keeps the column clear so the
  //     outflow can run as a straight vertical between boundary and handler.
  //     The anchor is overridden to the HOST's outer corner (top-left for a
  //     top-edge boundary, bottom-left for a bottom-edge boundary) so the
  //     label clears the host rectangle entirely.
  //   - Boundary handler chain nodes label OUTWARD — above for an upward
  //     chain, below (the default) for a downward chain.
  const body = `${allShiftedEdges.map(drawEdge).join('\n')}
${shiftedNodes.map(n => {
  let labelPosition;
  if (n._edge === 'top' || n._edge === 'bottom') labelPosition = 'left';
  else if (n._chainDirection === 'above') labelPosition = 'above';
  const labelAnchorX = n._labelAnchorX !== undefined ? n._labelAnchorX + dx : undefined;
  const labelAnchorY = n._labelAnchorY !== undefined ? n._labelAnchorY + dy : undefined;
  return drawNodeAt({
    absX: n.x, absY: n.y, width: n.width, height: n.height, data: n.data,
    labelPosition, labelAnchorX, labelAnchorY
  });
}).join('\n')}`;

  return svgDocument({
    width: maxX,
    height: maxY,
    body,
    processName: ir.process?.name,
    prompt: ir._meta?.prompt
  });
}
