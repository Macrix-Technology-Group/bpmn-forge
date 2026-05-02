# CHANGES v30

Base: v29 copied first.

## Added

### BPMNDI Completion
- `src/reference/di/bpmndiCompletionModel.json`
- `schemas/reference/bpmndi-complete.schema.json`
- `src/reference/di/diGeometry.js`
- `src/reference/di/completeDiBuilder.js`
- `src/reference/di/completeBpmndiXml.js`
- `src/reference/di/completeDiParser.js`
- `src/reference/di/diValidator.js`

### CLI
- `src/reference/di/bpmndiModelCli.js`
- `src/reference/di/exportCompleteDiCli.js`
- `src/reference/di/importCompleteDiCli.js`
- `src/reference/di/validateDiCli.js`
- `src/reference/di/diRoundtripCli.js`

### Documentation
- `docs/BPMNDI_COMPLETION_v30.md`
- `docs/CHANGES_v30.md`
- `docs/INTEGRITY_REPORT_v30.md`

### Scripts
- `di:model`
- `di:export:complete`
- `di:import:complete`
- `di:validate`
- `di:roundtrip`
- `reference:v30:all`
- `verify:v30`

## Modified

- `package.json`
  - version set to `30.0.0`
  - DI scripts added
  - all v29 scripts retained

## Removed

None.

## Policy

v30 is `v29 + BPMNDI Completion`.
No v29 feature was intentionally removed.
