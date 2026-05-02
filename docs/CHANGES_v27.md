# CHANGES v27

Base: v26 copied first.

## Added

### Token Model
- `src/reference/semantics/tokenModel.json`
- `schemas/reference/bpmn-token-state.schema.json`

### Token State
- `src/reference/semantics/tokenState.js`

### Token Simulator
- `src/reference/semantics/tokenSimulator.js`

### CLI
- `src/reference/semantics/tokenModelCli.js`
- `src/reference/semantics/initTokenStateCli.js`
- `src/reference/semantics/simulateTokenFlowCli.js`
- `src/reference/semantics/simulateTokenFlowFromBpmnCli.js`

### Documentation
- `docs/BPMN_TOKEN_MODEL_v27.md`
- `docs/CHANGES_v27.md`
- `docs/INTEGRITY_REPORT_v27.md`

### Scripts
- `token:model`
- `token:init`
- `token:simulate`
- `token:simulate:xml`
- `reference:v27:all`
- `verify:v27`

## Modified

- `package.json`
  - version set to `27.0.0`
  - token scripts added
  - all v26 scripts retained

## Removed

None.

## Policy

v27 is `v26 + Token Model`.
No v26 feature was intentionally removed.
