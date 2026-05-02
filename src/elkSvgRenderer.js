import ELK from 'elkjs/lib/elk.bundled.js';
import { irToElkGraph, nodeSize, collectBoundaryChains } from './irToElkGraph.js';
import { drawNodeAt, drawEdge, svgDocument } from './svgPrimitives.js';

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

// Boundary events ride on their host's edge. The IR signal `interrupting`
// picks which edge: interrupting boundaries sit on the BOTTOM, non-interrupting
// boundaries sit on the TOP. A single boundary on an edge sits at the host's
// horizontal CENTER so its outflow can run as a clean straight vertical to a
// handler placed in the same column. Multiple boundaries on the same edge
// stagger left/right from center to keep them visually grouped on that edge.
function placeBoundaries(boundaryNodes, layoutChildrenById) {
  const groups = new Map();
  for (const b of boundaryNodes) {
    const host = layoutChildrenById.get(b.attachedTo);
    if (!host) continue;
    const edgeName = b.interrupting === false ? 'top' : 'bottom';
    const key = `${b.attachedTo}:${edgeName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }
  const placed = [];
  const size = nodeSize({ type: 'event' });
  const stagger = 36;
  for (const [key, group] of groups) {
    const [hostId, edgeName] = key.split(':');
    const host = layoutChildrenById.get(hostId);
    const hostCx = host.x + host.width / 2;
    group.forEach((b, i) => {
      // Stagger from center: 0 → host center, 1 → +stagger, 2 → -stagger, ...
      const slot = i === 0 ? 0 : (i % 2 === 1 ? Math.ceil(i / 2) : -Math.ceil(i / 2));
      const cx = hostCx + slot * stagger;
      const cy = edgeName === 'top' ? host.y : host.y + host.height;
      const glyphLeft = cx - size.width / 2;
      const glyphTop = cy - size.height / 2;
      const glyphBottom = cy + size.height / 2;
      // NW (top boundary) / SW (bottom boundary) corner placement: label
      // sits diagonally up-left or down-left of the glyph. Anchor the
      // RIGHT edge of the label to the host's outer left edge (not the
      // glyph's own left, which sits inside the host) so the label's
      // X column is well clear of the outflow trunk that runs at the
      // glyph's center. Two-line side labels straddle anchorY by
      // ±(lineHeight/2 + 4); pre-bias so the whole block sits fully
      // above (top) or below (bottom) the glyph.
      placed.push({
        id: b.id,
        x: glyphLeft,
        y: glyphTop,
        width: size.width,
        height: size.height,
        data: b,
        _edge: edgeName,
        _labelAnchorX: glyphLeft - BOUNDARY_LABEL_GLYPH_MARGIN_X,
        _labelAnchorY: edgeName === 'top'
          ? glyphTop - BOUNDARY_LABEL_GLYPH_MARGIN_Y - 11
          : glyphBottom + BOUNDARY_LABEL_GLYPH_MARGIN_Y + 3
      });
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

export async function renderElkSvg(ir, options = {}) {
  const elk = new ELK();
  const graph = irToElkGraph(ir, options);
  const layout = await elk.layout(graph);

  const layoutChildren = layout.children || [];
  const layoutEdges = layout.edges || [];
  const layoutChildrenById = new Map(layoutChildren.map(c => [c.id, c]));

  const allNodes = ir.process?.nodes || [];
  const allEdges = ir.process?.edges || [];
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

  const maxX = Math.max(...shiftedNodes.map(n => n.x + n.width)) + padX;
  const maxY = Math.max(...shiftedNodes.map(n =>
    n._chainDirection === 'below' ? n.y + n.height + labelHeadroom : n.y + n.height
  )) + padY;

  // Label position rules:
  //   - Boundary events label to the LEFT — keeps the column clear so the
  //     outflow can run as a straight vertical between boundary and handler.
  //     The anchor is overridden to the HOST's outer corner (top-left for a
  //     top-edge boundary, bottom-left for a bottom-edge boundary) so the
  //     label clears the host rectangle entirely.
  //   - Boundary handler chain nodes label OUTWARD — above for an upward
  //     chain, below (the default) for a downward chain.
  const body = `${shiftedEdges.map(drawEdge).join('\n')}
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
