import { placeEdgeLabel } from './labelEngine.js';

export function esc(v) {
  return String(v ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

// ---------------------------------------------------------------------------
// Event glyphs (the small icon inside the event circle).
// Throw events render their glyph filled (black); catch events render outline only.
// ---------------------------------------------------------------------------

function isThrowEvent(node) {
  return node.subtype === 'intermediate_throw' || (node.subtype === 'end' && node.event_definition);
}

export function eventIcon(node, cx, cy) {
  const d = node.event_definition;
  if (!d) return '';
  const throwSide = isThrowEvent(node);

  if (d === 'message') {
    if (throwSide) {
      return `<rect x="${cx-12}" y="${cy-8}" width="24" height="16" fill="#111" stroke="#111" stroke-width="1.2"/>
<path d="M${cx-10},${cy-6} L${cx},${cy+2} L${cx+10},${cy-6}" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return `<rect x="${cx-12}" y="${cy-8}" width="24" height="16" fill="white" stroke="#111" stroke-width="1.4"/>
<path d="M${cx-12},${cy-8} L${cx},${cy+1} L${cx+12},${cy-8}" fill="none" stroke="#111" stroke-width="1.4"/>`;
  }
  if (d === 'timer') {
    return `<circle cx="${cx}" cy="${cy}" r="11" fill="none" stroke="#111"/><path d="M${cx},${cy} L${cx},${cy-7} M${cx},${cy} L${cx+6},${cy+3}" stroke="#111" stroke-width="1.2"/>`;
  }
  if (d === 'terminate') {
    return `<circle cx="${cx}" cy="${cy}" r="12" fill="#111"/>`;
  }
  if (d === 'signal') {
    const fill = throwSide ? '#111' : 'none';
    return `<polygon points="${cx},${cy-10} ${cx+9},${cy+6} ${cx-9},${cy+6}" fill="${fill}" stroke="#111" stroke-width="1.4"/>`;
  }
  if (d === 'error') {
    const fill = throwSide ? '#111' : 'none';
    return `<path d="M${cx-9},${cy+8} L${cx-3},${cy-7} L${cx+1},${cy+1} L${cx+9},${cy-8}" fill="${fill}" stroke="#111" stroke-width="1.6" stroke-linejoin="miter"/>`;
  }
  if (d === 'escalation') {
    const fill = throwSide ? '#111' : 'none';
    return `<path d="M${cx},${cy-10} L${cx+8},${cy+7} L${cx},${cy+2} L${cx-8},${cy+7} Z" fill="${fill}" stroke="#111" stroke-width="1.4"/>`;
  }
  if (d === 'cancel') {
    const fill = throwSide ? '#111' : 'none';
    const stroke = throwSide ? 'white' : '#111';
    return `<path d="M${cx-8},${cy-8} L${cx+8},${cy+8} M${cx+8},${cy-8} L${cx-8},${cy+8}" stroke="${stroke}" stroke-width="${throwSide ? 2 : 2.5}"/>` +
      (throwSide ? `<circle cx="${cx}" cy="${cy}" r="11" fill="#111" stroke="none" opacity="0.0"/>` : '');
  }
  if (d === 'compensation') {
    const fill = throwSide ? '#111' : 'none';
    return `<path d="M${cx-8},${cy} L${cx-1},${cy-6} L${cx-1},${cy+6} Z M${cx-1},${cy} L${cx+8},${cy-6} L${cx+8},${cy+6} Z" fill="${fill}" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/>`;
  }
  if (d === 'conditional') {
    return `<rect x="${cx-8}" y="${cy-8}" width="16" height="16" fill="none" stroke="#111" stroke-width="1.4"/>
<path d="M${cx-5},${cy-4} h10 M${cx-5},${cy} h10 M${cx-5},${cy+4} h6" stroke="#111" stroke-width="1"/>`;
  }
  if (d === 'link') {
    const fill = throwSide ? '#111' : 'none';
    return `<path d="M${cx-9},${cy-4} h10 v-3 l8,7 l-8,7 v-3 h-10 z" fill="${fill}" stroke="#111" stroke-width="1.4" stroke-linejoin="miter"/>`;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Gateway markers — drawn as proper SVG glyphs (paths/circles/polygons), not
// text characters. Each subtype renders the BPMN-spec glyph at the diamond's
// center. Sizes are calibrated for an 88×88 gateway diamond.
// ---------------------------------------------------------------------------

function pentagonPath(cx, cy, r) {
  // Regular pentagon, point up. Vertices at angles 270°, 342°, 54°, 126°, 198°.
  const pts = [
    [cx, cy - r],
    [cx + r * Math.sin(72 * Math.PI / 180),  cy - r * Math.cos(72 * Math.PI / 180)],
    [cx + r * Math.sin(144 * Math.PI / 180), cy - r * Math.cos(144 * Math.PI / 180)],
    [cx - r * Math.sin(144 * Math.PI / 180), cy - r * Math.cos(144 * Math.PI / 180)],
    [cx - r * Math.sin(72 * Math.PI / 180),  cy - r * Math.cos(72 * Math.PI / 180)]
  ];
  return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
}

export function gatewayMarker(subtype, cx, cy) {
  if (subtype === 'parallel') {
    return `<path d="M${cx-14},${cy} L${cx+14},${cy} M${cx},${cy-14} L${cx},${cy+14}" stroke="#111" stroke-width="4" stroke-linecap="round"/>`;
  }
  if (subtype === 'inclusive') {
    return `<circle cx="${cx}" cy="${cy}" r="13" fill="none" stroke="#111" stroke-width="3"/>`;
  }
  if (subtype === 'complex') {
    return `<path d="M${cx-13},${cy} L${cx+13},${cy} M${cx},${cy-13} L${cx},${cy+13} M${cx-9},${cy-9} L${cx+9},${cy+9} M${cx+9},${cy-9} L${cx-9},${cy+9}" stroke="#111" stroke-width="3" stroke-linecap="round"/>`;
  }
  if (subtype === 'event_based') {
    // Single-line outer circle with a pentagon inside: catching-event marker
    // tucked into a gateway diamond.
    return `<circle cx="${cx}" cy="${cy}" r="14" fill="none" stroke="#111" stroke-width="1.5"/>
<polygon points="${pentagonPath(cx, cy, 8)}" fill="none" stroke="#111" stroke-width="1.5"/>`;
  }
  if (subtype === 'instantiating_event_based_exclusive') {
    // Double-line outer circle (two concentric rings) with a pentagon inside:
    // marks an event-based gateway that *spawns* the process instance on the
    // first triggering event.
    return `<circle cx="${cx}" cy="${cy}" r="14" fill="none" stroke="#111" stroke-width="1.5"/>
<circle cx="${cx}" cy="${cy}" r="11" fill="none" stroke="#111" stroke-width="1.5"/>
<polygon points="${pentagonPath(cx, cy, 7)}" fill="none" stroke="#111" stroke-width="1.5"/>`;
  }
  if (subtype === 'instantiating_event_based_parallel') {
    // Single-line circle with a + inside: parallel-instantiating event
    // gateway. Spawns instance on EVERY incoming event, not just the first.
    return `<circle cx="${cx}" cy="${cy}" r="14" fill="none" stroke="#111" stroke-width="1.5"/>
<path d="M${cx-9},${cy} L${cx+9},${cy} M${cx},${cy-9} L${cx},${cy+9}" stroke="#111" stroke-width="2.5" stroke-linecap="round"/>`;
  }
  // exclusive (default): bold X
  return `<path d="M${cx-12},${cy-12} L${cx+12},${cy+12} M${cx+12},${cy-12} L${cx-12},${cy+12}" stroke="#111" stroke-width="4" stroke-linecap="round"/>`;
}

// ---------------------------------------------------------------------------
// Task subtype markers (top-left interior of task rectangle)
// ---------------------------------------------------------------------------

export function taskMarker(node, x, y) {
  if (node.subtype === 'user') {
    return `<circle cx="${x+22}" cy="${y+18}" r="6" fill="none" stroke="#111"/><path d="M${x+13},${y+38} q9,-12 18,0" fill="none" stroke="#111"/>`;
  }
  if (node.subtype === 'service') {
    // Gear: 8-toothed cog with center hole. Polygon alternates between an
    // outer radius (tooth tip) and an inner radius (tooth base).
    const cx = x + 22, cy = y + 22;
    const teeth = 8;
    const rOuter = 9, rInner = 6;
    const pts = [];
    for (let i = 0; i < teeth * 2; i++) {
      const angle = (i / (teeth * 2)) * 2 * Math.PI - Math.PI / 2;
      const r = i % 2 === 0 ? rOuter : rInner;
      pts.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="white" stroke="#111" stroke-width="1.2"/>
<circle cx="${cx}" cy="${cy}" r="3" fill="white" stroke="#111" stroke-width="1.2"/>`;
  }
  if (node.subtype === 'send') {
    return `<rect x="${x+12}" y="${y+12}" width="22" height="14" fill="#111" stroke="#111" stroke-width="1.2"/>
<path d="M${x+14},${y+14} L${x+23},${y+20} L${x+32},${y+14}" fill="none" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (node.subtype === 'receive') {
    return `<rect x="${x+12}" y="${y+12}" width="22" height="14" fill="white" stroke="#111" stroke-width="1.2"/>
<path d="M${x+12},${y+12} L${x+23},${y+20} L${x+34},${y+12}" fill="none" stroke="#111" stroke-width="1.2"/>`;
  }
  if (node.subtype === 'script') {
    // Scroll: rectangle with curled/rolled top and bottom edges, plus three
    // short horizontal lines inside (representing text on the scroll).
    return `<path d="M${x+14},${y+14} q2,-3 4,0 q2,3 4,0 q2,-3 4,0 q2,3 4,0 L${x+30},${y+28} q-2,3 -4,0 q-2,-3 -4,0 q-2,3 -4,0 q-2,-3 -4,0 Z" fill="white" stroke="#111" stroke-width="1.2"/>
<path d="M${x+17},${y+18} h8 M${x+17},${y+22} h8 M${x+17},${y+26} h5" stroke="#111" stroke-width="0.8"/>`;
  }
  if (node.subtype === 'manual') {
    // Open palm: rectangular hand with four finger ridges along the top.
    // Stylized but immediately readable as a hand.
    return `<path d="M${x+14},${y+26} L${x+14},${y+19} L${x+16},${y+19} L${x+16},${y+14} L${x+18},${y+14} L${x+18},${y+19} L${x+19},${y+19} L${x+19},${y+13} L${x+21},${y+13} L${x+21},${y+19} L${x+22},${y+19} L${x+22},${y+14} L${x+24},${y+14} L${x+24},${y+19} L${x+25},${y+19} L${x+25},${y+16} L${x+27},${y+16} L${x+27},${y+24} Q${x+27},${y+26} ${x+25},${y+26} Z" fill="white" stroke="#111" stroke-width="1.2"/>`;
  }
  if (node.subtype === 'business_rule') {
    return `<rect x="${x+12}" y="${y+12}" width="22" height="14" fill="none" stroke="#111" stroke-width="1.2"/><path d="M${x+12},${y+18} h22 M${x+19},${y+12} v14" stroke="#111" stroke-width="1"/>`;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Activity / sub-process bottom-center markers (loop, multi-instance, ad-hoc, +)
// ---------------------------------------------------------------------------

export function activityMarkers(node, x, y, w, h) {
  const parts = [];
  const baseY = y + h - 14;
  let cx = x + w / 2;
  // count markers so they can be placed side-by-side
  const flags = [];
  if (node.marker === 'loop') flags.push('loop');
  if (node.marker === 'multi_instance_parallel') flags.push('mip');
  if (node.marker === 'multi_instance_sequential') flags.push('mis');
  if (node.is_ad_hoc) flags.push('adhoc');
  if (node.is_for_compensation) flags.push('comp');
  if (node.type === 'subprocess') flags.push('plus');
  const total = flags.length;
  if (!total) return '';
  const step = 18;
  let cursor = cx - (total - 1) * step / 2;
  for (const f of flags) {
    const fx = cursor;
    cursor += step;
    if (f === 'plus') {
      parts.push(`<rect x="${fx-7}" y="${baseY-5}" width="14" height="14" fill="white" stroke="#111" stroke-width="1.2"/>
<path d="M${fx-4},${baseY+2} h8 M${fx},${baseY-2} v8" stroke="#111" stroke-width="1.5"/>`);
    } else if (f === 'loop') {
      parts.push(`<path d="M${fx-7},${baseY+5} a7,5 0 1,1 14,0 a7,5 0 0,1 -3.5,4.3" fill="none" stroke="#111" stroke-width="1.4"/>
<path d="M${fx+4},${baseY+10} l-2,-3 l4,-1" fill="none" stroke="#111" stroke-width="1.4" stroke-linejoin="miter"/>`);
    } else if (f === 'mip') {
      parts.push(`<path d="M${fx-5},${baseY-2} v12 M${fx},${baseY-2} v12 M${fx+5},${baseY-2} v12" stroke="#111" stroke-width="1.6"/>`);
    } else if (f === 'mis') {
      parts.push(`<path d="M${fx-7},${baseY-1} h14 M${fx-7},${baseY+4} h14 M${fx-7},${baseY+9} h14" stroke="#111" stroke-width="1.4"/>`);
    } else if (f === 'adhoc') {
      parts.push(`<path d="M${fx-7},${baseY+5} q4,-6 7,0 t7,0" fill="none" stroke="#111" stroke-width="1.4"/>`);
    } else if (f === 'comp') {
      parts.push(`<path d="M${fx-8},${baseY+5} L${fx-1},${baseY-1} L${fx-1},${baseY+11} Z M${fx-1},${baseY+5} L${fx+8},${baseY-1} L${fx+8},${baseY+11} Z" fill="#111" stroke="#111" stroke-linejoin="round"/>`);
    }
  }
  return parts.join('');
}

// ---------------------------------------------------------------------------
// Data object glyph (page icon) and data association line
// ---------------------------------------------------------------------------

export const DATA_OBJECT_WIDTH = 50;
export const DATA_OBJECT_HEIGHT = 64;

export function drawDataObject(absX, absY, name) {
  const w = DATA_OBJECT_WIDTH, h = DATA_OBJECT_HEIGHT;
  const fold = 12;
  // Page icon: rectangle with a folded top-right corner.
  // Label goes ABOVE the glyph, not below — association trunks always exit
  // the BOTTOM anchor going down toward tasks, so the column under the
  // glyph is reserved for the trunk and would collide with a label there.
  return `<g>
<path d="M${absX},${absY} L${absX+w-fold},${absY} L${absX+w},${absY+fold} L${absX+w},${absY+h} L${absX},${absY+h} Z" fill="white" stroke="#111" stroke-width="1.2"/>
<path d="M${absX+w-fold},${absY} L${absX+w-fold},${absY+fold} L${absX+w},${absY+fold}" fill="none" stroke="#111" stroke-width="1.2"/>
<text x="${absX + w/2}" y="${absY - 6}" class="label">${esc(name || '')}</text>
</g>`;
}

export function drawDataAssociation(points) {
  if (!points || points.length < 2) return '';
  const d = 'M' + points.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join(' L');
  return `<path d="${d}" fill="none" stroke="#111" stroke-width="1" stroke-dasharray="2,3" marker-end="url(#openarrow)"/>`;
}

// ---------------------------------------------------------------------------
// Group box: dashed-dotted rounded rectangle wrapping a named subset of
// nodes. Pure annotation — does NOT affect layout. Drawn BEFORE the nodes
// so it sits behind them. The label hugs the inside of the top edge.
// ---------------------------------------------------------------------------

export const GROUP_PADDING = 18;

export function drawGroupBox(absX, absY, width, height, name) {
  // BPMN dashed-dotted style: alternating long dash, short dot.
  // The label sits BELOW the bottom border (outside the box), not inside,
  // because group bbox padding is sized for the dashed border only — placing
  // a labeled background rect inside would eat into the bottom edge of any
  // member task whose bottom is close to the box's bottom edge.
  const dash = '8,3,2,3';
  return `<g>
<rect x="${absX}" y="${absY}" width="${width}" height="${height}" rx="14" fill="none" stroke="#111" stroke-width="1.4" stroke-dasharray="${dash}"/>
${name ? `<text x="${absX + 4}" y="${absY + height + 14}" class="label" text-anchor="start">${esc(name)}</text>` : ''}
</g>`;
}

// ---------------------------------------------------------------------------
// Subprocess body: handles transaction (double border), event-subprocess (dotted),
// call activity (thick border), or default rounded rectangle.
// ---------------------------------------------------------------------------

function subprocessBody(node, x, y, w, h) {
  if (node.subtype === 'call_activity') {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="white" stroke="#111" stroke-width="5"/>`;
  }
  if (node.subtype === 'transaction') {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="white" stroke="#111" stroke-width="2.5"/>
<rect x="${x+3}" y="${y+3}" width="${w-6}" height="${h-6}" rx="11" fill="none" stroke="#111" stroke-width="1"/>`;
  }
  if (node.is_event_subprocess) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="white" stroke="#111" stroke-width="2" stroke-dasharray="3,3"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="white" stroke="#111" stroke-width="2.5"/>`;
}

// ---------------------------------------------------------------------------
// Text wrapping inside task rectangles
// ---------------------------------------------------------------------------

export function wrapText(label, x, y) {
  const text = String(label || '');
  const words = text.split(/\s+/);
  if (text.length <= 24 || words.length <= 2) {
    return `<text x="${x}" y="${y+5}" class="label">${esc(text)}</text>`;
  }
  const mid = Math.ceil(words.length / 2);
  return `<text x="${x}" y="${y-7}" class="label">${esc(words.slice(0, mid).join(' '))}</text>
<text x="${x}" y="${y+10}" class="label">${esc(words.slice(mid).join(' '))}</text>`;
}

// Wrap a label that sits OUTSIDE a node, breaking long text into two lines so
// adjacent labels don't run together. Position picks which face/corner:
//   - 'above' / 'below' — centered above/below the glyph
//   - 'left' / 'right' — vertically centered, hugging the side
//   - 'nw' / 'ne' / 'sw' / 'se' — diagonal corners (label sits in that
//     quadrant). Used as a last-resort fallback when all four cardinal
//     faces are blocked by connectors or adjacent shapes.
export function wrapOutsideLabel(label, x, anchorY, position) {
  const text = String(label || '');
  const isSide = position === 'left' || position === 'right';
  const isAboveAnchored = position === 'above' || position === 'nw' || position === 'ne';
  const anchorAttr = (position === 'left' || position === 'nw' || position === 'sw')
    ? ' text-anchor="end"'
    : (position === 'right' || position === 'ne' || position === 'se')
      ? ' text-anchor="start"'
      : '';
  const maxOneLine = 18;
  if (text.length <= maxOneLine || text.split(/\s+/).length < 2) {
    return `<text x="${x}" y="${anchorY}" class="label"${anchorAttr}>${esc(text)}</text>`;
  }
  const words = text.split(/\s+/);
  let bestSplit = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const l = words.slice(0, i).join(' ').length;
    const r = words.slice(i).join(' ').length;
    const diff = Math.abs(l - r);
    if (diff < bestDiff) { bestDiff = diff; bestSplit = i; }
  }
  const line1 = words.slice(0, bestSplit).join(' ');
  const line2 = words.slice(bestSplit).join(' ');
  const lineHeight = 14;
  let yUpper, yLower;
  if (isAboveAnchored) {
    yLower = anchorY;
    yUpper = anchorY - lineHeight;
  } else if (isSide) {
    yUpper = anchorY - lineHeight / 2 + 4;
    yLower = anchorY + lineHeight / 2 + 4;
  } else {
    yUpper = anchorY;
    yLower = anchorY + lineHeight;
  }
  return `<text x="${x}" y="${yUpper}" class="label"${anchorAttr}>${esc(line1)}</text>
<text x="${x}" y="${yLower}" class="label"${anchorAttr}>${esc(line2)}</text>`;
}

// ---------------------------------------------------------------------------
// Node drawing
// ---------------------------------------------------------------------------

export function drawNodeAt({ absX, absY, width, height, data, labelPosition, labelAnchorX, labelAnchorY }) {
  const node = data || {};
  const cx = absX + width / 2;
  const cy = absY + height / 2;
  const fallbackName = node.name || node.id;
  const sideMargin = 8;
  let labelX = cx;
  let labelY;
  let pos;
  if (labelPosition === 'above') {
    labelY = absY - 6; pos = 'above';
  } else if (labelPosition === 'left') {
    labelX = absX - sideMargin; labelY = cy + 4; pos = 'left';
  } else if (labelPosition === 'right') {
    labelX = absX + width + sideMargin; labelY = cy + 4; pos = 'right';
  } else if (labelPosition === 'nw') {
    // Diagonals anchor the LABEL'S OPPOSITE CORNER to the glyph's corner
    // (NW → label bottom-right at glyph top-left), as close as possible.
    // The label may extend over an adjacent task's corner — that's accepted
    // because tasks are white-filled, their own labels live at task centers,
    // and the overlap reads cleanly.
    labelX = absX - sideMargin; labelY = absY - 6; pos = 'nw';
  } else if (labelPosition === 'ne') {
    labelX = absX + width + sideMargin; labelY = absY - 6; pos = 'ne';
  } else if (labelPosition === 'sw') {
    labelX = absX - sideMargin; labelY = absY + height + 14; pos = 'sw';
  } else if (labelPosition === 'se') {
    labelX = absX + width + sideMargin; labelY = absY + height + 14; pos = 'se';
  } else {
    labelY = absY + height + 16; pos = 'below';
  }
  // The renderer can override the anchor when the default would land on top
  // of another shape — e.g. a boundary event whose glyph is inside its host
  // rectangle needs its label anchored to the host's outer edge, not the
  // glyph's own edge.
  if (labelAnchorX !== undefined) labelX = labelAnchorX;
  if (labelAnchorY !== undefined) labelY = labelAnchorY;
  const labelSvg = wrapOutsideLabel(fallbackName, labelX, labelY, pos);

  if (node.type === 'event') {
    const isIntermediate = node.subtype === 'intermediate_catch'
      || node.subtype === 'intermediate_throw'
      || node.subtype === 'boundary';
    const strokeWidth = node.subtype === 'end' ? 4 : 2;
    const r = Math.min(width, height) / 2 - 5;
    const dash = (node.subtype === 'boundary' && node.interrupting === false) ? ' stroke-dasharray="4,3"' : '';
    const outer = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="white" stroke="#111" stroke-width="${strokeWidth}"${dash}/>`;
    const inner = isIntermediate
      ? `<circle cx="${cx}" cy="${cy}" r="${r - 4}" fill="none" stroke="#111" stroke-width="${strokeWidth}"${dash}/>`
      : '';
    return `<g>
${outer}
${inner}
${eventIcon(node, cx, cy)}
${labelSvg}
</g>`;
  }

  if (node.type === 'gateway') {
    return `<g>
<polygon points="${cx},${absY} ${absX+width},${cy} ${cx},${absY+height} ${absX},${cy}" fill="white" stroke="#111" stroke-width="2.5"/>
${gatewayMarker(node.subtype, cx, cy)}
${labelSvg}
</g>`;
  }

  if (node.type === 'subprocess') {
    return `<g>
${subprocessBody(node, absX, absY, width, height)}
${wrapText(fallbackName, cx, cy)}
${activityMarkers(node, absX, absY, width, height)}
</g>`;
  }

  return `<g>
<rect x="${absX}" y="${absY}" width="${width}" height="${height}" rx="14" fill="white" stroke="#111" stroke-width="2.5"/>
${taskMarker(node, absX, absY)}
${wrapText(fallbackName, cx, cy)}
${activityMarkers(node, absX, absY, width, height)}
</g>`;
}

// ---------------------------------------------------------------------------
// Edge source markers (default flow backslash, conditional flow diamond)
// ---------------------------------------------------------------------------

function edgeSourceMarker(data, points) {
  if (!points || points.length < 2) return '';
  const a = points[0];
  const b = points[1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  if (data.isDefault) {
    // Backslash through the start of the flow
    const offset = 14;
    const mx = a.x + ux * offset;
    const my = a.y + uy * offset;
    const px = -uy;
    const py = ux;
    const half = 6;
    const x1 = mx + px * half - ux * 4;
    const y1 = my + py * half - uy * 4;
    const x2 = mx - px * half + ux * 4;
    const y2 = my - py * half + uy * 4;
    return `<path d="M${x1},${y1} L${x2},${y2}" stroke="#111" stroke-width="1.6" stroke-linecap="round"/>`;
  }
  if (data.is_conditional) {
    // Small unfilled diamond at the source end of the flow
    const offset = 12;
    const mx = a.x + ux * offset;
    const my = a.y + uy * offset;
    const px = -uy;
    const py = ux;
    const along = 8;
    const across = 5;
    const p1 = `${a.x + ux * 3},${a.y + uy * 3}`;
    const p2 = `${mx + px * across},${my + py * across}`;
    const p3 = `${a.x + ux * (offset + along - 3)},${a.y + uy * (offset + along - 3)}`;
    const p4 = `${mx - px * across},${my - py * across}`;
    return `<polygon points="${p1} ${p2} ${p3} ${p4}" fill="white" stroke="#111" stroke-width="1.4"/>`;
  }
  return '';
}

export function drawEdge(edge) {
  const section = edge.sections && edge.sections[0];
  if (!section) return '';
  const points = [section.startPoint, ...(section.bendPoints || []), section.endPoint];
  const d = 'M' + points.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join(' L');
  const data = edge.data || {};
  const dash = data.branch_type === 'exception' ? ' stroke-dasharray="6,4"' : '';
  // The renderer can pre-place the label and attach it as `edge._label` —
  // useful when label positioning needs to consider already-placed labels
  // as obstacles (so two condition labels on a multi-branch gateway don't
  // collide). Falls back to standalone placement when no _label is attached.
  const labelInput = edge._obstacles ? { ...data, _obstacles: edge._obstacles } : data;
  const label = edge._label || placeEdgeLabel(labelInput, points);
  const labelSvg = label ? `<g>
<rect x="${label.x - label.backgroundWidth/2}" y="${label.y - 14}" width="${label.backgroundWidth}" height="${label.backgroundHeight}" rx="3" fill="white" stroke="#bbb" opacity="0.96"/>
<text x="${label.x}" y="${label.y}" class="edge-label">${esc(label.text)}</text>
</g>` : '';
  const sourceMarker = edgeSourceMarker(data, points);
  return `<g><path class="flow" d="${d}"${dash}/>${sourceMarker}${labelSvg}</g>`;
}

const BASE_STYLES = `.flow{fill:none;stroke:#111;stroke-width:2.2;marker-end:url(#arrow)}
.label{font-family:Arial,Helvetica,sans-serif;font-size:13px;text-anchor:middle;fill:#111}
.edge-label{font-family:Arial,Helvetica,sans-serif;font-size:12px;text-anchor:middle;fill:#111}
.gateway{font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:bold;text-anchor:middle;fill:#111}
.diagram-title{font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;text-anchor:middle;fill:#222}
.prompt-icon{cursor:pointer}
.prompt-icon:hover circle{fill:#eef}`;

const TITLE_BAND_HEIGHT = 50;

function buildPromptOverlay(prompt, width, totalHeight) {
  // Escape for HTML attribute and content (foreignObject is HTML namespace).
  const htmlEsc = (s) => String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  const safe = htmlEsc(prompt);
  const iconCx = width - 28;
  const iconCy = 28;
  const overlayW = Math.min(720, width - 80);
  const overlayH = Math.min(420, totalHeight - 80);
  const overlayX = (width - overlayW) / 2;
  const overlayY = 60;
  return `
<g class="prompt-icon" onclick="togglePrompt()">
  <title>Click to view the generation prompt</title>
  <circle cx="${iconCx}" cy="${iconCy}" r="13" fill="white" stroke="#555" stroke-width="1.5"/>
  <text x="${iconCx}" y="${iconCy + 5}" text-anchor="middle" font-family="Georgia,serif" font-size="16" font-style="italic" fill="#444">i</text>
</g>
<foreignObject id="prompt-viewer" x="${overlayX}" y="${overlayY}" width="${overlayW}" height="${overlayH}" style="display:none">
  <div xmlns="http://www.w3.org/1999/xhtml" style="background:white;border:2px solid #555;padding:16px;font-family:Arial,Helvetica,sans-serif;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.25);box-sizing:border-box;height:100%;display:flex;flex-direction:column">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong style="font-size:14px">Generation prompt</strong><button onclick="togglePrompt()" style="border:none;background:transparent;cursor:pointer;font-size:18px;color:#555;line-height:1">&#215;</button></div>
    <textarea id="prompt-text" readonly="readonly" style="flex:1;width:100%;font-family:Menlo,Monaco,monospace;font-size:12px;border:1px solid #ccc;padding:8px;border-radius:4px;resize:none;box-sizing:border-box">${safe}</textarea>
    <div style="margin-top:10px;display:flex;justify-content:flex-end;gap:8px"><span id="prompt-copy-feedback" style="font-size:12px;color:#0a0;align-self:center"></span><button onclick="copyPrompt()" style="padding:6px 14px;cursor:pointer;border:1px solid #555;background:#f5f5f5;border-radius:4px;font-size:13px">Copy to clipboard</button></div>
  </div>
</foreignObject>
<script type="application/ecmascript">/* <![CDATA[ */
function togglePrompt(){var v=document.getElementById('prompt-viewer');v.style.display=(v.style.display==='block')?'none':'block';}
function copyPrompt(){var ta=document.getElementById('prompt-text');var fb=document.getElementById('prompt-copy-feedback');function done(){if(fb){fb.textContent='Copied';setTimeout(function(){fb.textContent='';},1500);}}if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ta.value).then(done);}else{ta.select();document.execCommand('copy');done();}}
/* ]]> */</script>`;
}

export function svgDocument({ width, height, body, extraStyles = '', processName, prompt }) {
  const w = Math.ceil(width);
  const baseH = Math.ceil(height);
  const titleSpace = processName ? TITLE_BAND_HEIGHT : 0;
  const h = baseH + titleSpace;
  const styles = extraStyles ? `${BASE_STYLES}\n${extraStyles}` : BASE_STYLES;
  const titleSvg = processName
    ? `<text x="${w / 2}" y="${baseH + TITLE_BAND_HEIGHT - 18}" class="diagram-title">${esc(processName)}</text>`
    : '';
  const promptSvg = prompt ? buildPromptOverlay(prompt, w, h) : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
<marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8 Z" fill="#111"/></marker>
<marker id="openarrow" markerWidth="11" markerHeight="9" refX="10" refY="4.5" orient="auto"><path d="M0,0 L10,4.5 L0,9" fill="none" stroke="#111" stroke-width="1.4"/></marker>
</defs>
<style>
${styles}
</style>
${body}
${titleSvg}
${promptSvg}
</svg>`;
}

export function drawMessageFlow(mf) {
  const section = mf.sections && mf.sections[0];
  if (!section) return '';
  const points = [section.startPoint, ...(section.bendPoints || []), section.endPoint];
  const d = 'M' + points.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join(' L');

  // Envelope position: prefer a renderer-provided _envelopePos (e.g. anchored
  // to a lane gap between pools) over the path's longest-segment midpoint.
  let mx, my;
  const explicit = mf.data?._envelopePos;
  if (explicit) {
    mx = Math.round(explicit.x);
    my = Math.round(explicit.y);
  } else {
    let bestI = 0, bestLen = -1;
    for (let i = 0; i < points.length - 1; i++) {
      const len = Math.abs(points[i].x - points[i+1].x) + Math.abs(points[i].y - points[i+1].y);
      if (len > bestLen) { bestLen = len; bestI = i; }
    }
    const a = points[bestI], b = points[bestI + 1];
    mx = Math.round((a.x + b.x) / 2);
    my = Math.round((a.y + b.y) / 2);
  }
  const name = mf.data?.name;
  const labelSvg = name
    ? `<rect x="${mx + 18}" y="${my - 18}" width="${name.length * 7 + 16}" height="16" rx="3" fill="white" stroke="#bbb" opacity="0.96"/>
<text x="${mx + 26 + name.length * 3.5}" y="${my - 6}" class="edge-label">${esc(name)}</text>`
    : '';
  return `<g>
<path d="${d}" fill="none" stroke="#111" stroke-width="1.4" stroke-dasharray="6,4" marker-end="url(#openarrow)"/>
<g>
<rect x="${mx - 12}" y="${my - 8}" width="24" height="16" fill="white" stroke="#111" stroke-width="1.2"/>
<path d="M${mx - 12},${my - 8} L${mx},${my + 1} L${mx + 12},${my - 8}" fill="none" stroke="#111" stroke-width="1.2"/>
</g>
${labelSvg}
</g>`;
}
