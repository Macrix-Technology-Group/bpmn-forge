import { normalizeIr } from './normalizer.js';
import { renderSwimlaneSvg } from './swimlaneSvgRenderer.js';
import { renderElkSvg } from './elkSvgRenderer.js';

export async function renderUnifiedSvg(ir, options = {}) {
  const normalized = normalizeIr(ir);
  // Preserve _meta (prompt, model, generated_at, ...) through normalization so
  // the renderer can embed it in the final SVG.
  if (ir._meta) normalized._meta = ir._meta;
  const hasLanes = (normalized.process?.participants || []).some(p => (p.lanes || []).length > 0);

  if (options.mode === 'swimlanes' || (options.mode !== 'plain' && hasLanes)) {
    return {
      mode: 'swimlanes',
      svg: await renderSwimlaneSvg(normalized)
    };
  }

  return {
    mode: 'elk',
    svg: await renderElkSvg(normalized)
  };
}
