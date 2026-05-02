# CHANGES v31

Base: v30 copied first.

## Added

### Execution Semantics Completion
- `src/reference/execution/executionSemanticsModel.json`
- `schemas/reference/bpmn-execution-state.schema.json`
- `src/reference/execution/executionState.js`
- `src/reference/execution/executionIndex.js`
- `src/reference/execution/semanticsHandlers.js`
- `src/reference/execution/strongExecutionSimulator.js`
- `src/reference/execution/executionSemanticsValidator.js`

### CLI
- `src/reference/execution/executionSemanticsModelCli.js`
- `src/reference/execution/validateExecutionSemanticsCli.js`
- `src/reference/execution/simulateStrongExecutionCli.js`
- `src/reference/execution/simulateStrongExecutionFromIrCli.js`

### Test BPMN
- `tests/bpmn/execution_semantics_full.bpmn`

### Documentation
- `docs/BPMN_EXECUTION_SEMANTICS_v31.md`
- `docs/CHANGES_v31.md`
- `docs/INTEGRITY_REPORT_v31.md`

### Scripts
- `execution:model`
- `execution:validate:semantics`
- `execution:simulate:strong`
- `execution:simulate:ir`
- `reference:v31:all`
- `verify:v31`

## Modified

- `package.json`
  - version set to `31.0.0`
  - execution semantics scripts added
  - all v30 scripts retained

## Removed

None.

## Policy

v31 is `v30 + Execution Semantics Completion`.
No v30 feature was intentionally removed.
