// Public API for bpmn-forge.
// Internal helpers (svgPrimitives, irToElkGraph, extendedBpmnParser, *Cli.js,
// nl/promptTemplates, reference/registry, etc.) are intentionally NOT
// re-exported here — they're implementation details and may change without
// notice. Reach for them via deep imports at your own risk.

// ── BPMN XML import / export ──────────────────────────────────────────────
export { importBpmnXml } from './bpmnXmlImporter.js';
export { exportBpmnXml } from './bpmnXmlExporter.js';
export { exportBpmnXmlWithDi } from './bpmndiExporter.js';
export { importExtendedBpmnXml } from './extendedBpmnImport.js';
export { importUnifiedBpmnXml } from './unifiedBpmnImporter.js';

// ── IR shaping & validation ───────────────────────────────────────────────
export { normalizeIr } from './normalizer.js';
export { validateIr } from './validator.js';
export { semanticDiff } from './semanticDiff.js';
export { coverage, confidence } from './coverage.js';

// ── Rendering ─────────────────────────────────────────────────────────────
export { renderElkSvg } from './elkSvgRenderer.js';
export { renderSwimlaneSvg } from './swimlaneSvgRenderer.js';
export { renderUnifiedSvg } from './unifiedRenderer.js';

// ── Verification pipeline ─────────────────────────────────────────────────
export { verifyIr, runVerifiedRender } from './pipeline.js';

// ── Text → IR ─────────────────────────────────────────────────────────────
export { textToIr } from './textToIrParser.js';
export { textToIrWithLlm } from './textToIrLlmParser.js';

// ── Execution exporters ───────────────────────────────────────────────────
export { buildExecutionManifest } from './executionManifest.js';
export { irToElsaWorkflow } from './elsaWorkflowGenerator.js';

// ── Reference model & execution semantics ─────────────────────────────────
export { adaptIrToReferenceModelV26 } from './reference/model/referenceModelV26Adapter.js';
export { validateExecutionSemanticsReadiness } from './reference/execution/executionSemanticsValidator.js';
export {
  simulateStrongExecution,
  simulateStrongExecutionFromIr
} from './reference/execution/strongExecutionSimulator.js';
export { simulateTokenFlow } from './reference/semantics/tokenSimulator.js';
