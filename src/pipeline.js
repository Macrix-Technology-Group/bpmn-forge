import { importBpmnXml } from './bpmnXmlImporter.js';
import { exportBpmnXml } from './bpmnXmlExporter.js';
import { normalizeIr } from './normalizer.js';
import { validateIr } from './validator.js';
import { semanticDiff } from './semanticDiff.js';
import { coverage, confidence } from './coverage.js';
import { renderUnifiedSvg } from './unifiedRenderer.js';
export function verifyIr(ir, options = {}) {
  const normalized = normalizeIr(ir);
  const exported = exportBpmnXml(normalized);
  const reimported = normalizeIr(importBpmnXml(exported));
  const validation1 = validateIr(normalized), validation2 = validateIr(reimported);
  const diffs = semanticDiff(normalized, reimported);
  const cov = coverage(normalized, reimported, diffs);
  const conf = confidence(cov, [...validation1.warnings,...validation2.warnings]);
  const report = { pass: validation1.ok && validation2.ok && diffs.length===0 && (!options.strict || cov.total===1), strict:Boolean(options.strict), coverage:cov, confidence:conf, diffCount:diffs.length, diffs, validation1, validation2 };
  return { normalized, exported, reimported, report };
}
export async function runVerifiedRender(xml, options = {}) {
  const imported = importBpmnXml(xml);
  const result = verifyIr(imported, options);
  const rendered = await renderUnifiedSvg(result.normalized, options);
  return { imported, ...result, svg: rendered.svg, renderMode: rendered.mode };
}
