# CHANGES v25

Base: v24 copied first.

## Added

### Reference Layer
- `src/reference/registry/bpmnElementRegistry.json`
- `src/reference/registry/registryCli.js`
- `src/reference/coverage/bpmnCoverageMatrix.json`
- `src/reference/coverage/coverageCli.js`
- `src/reference/model/referenceModelAdapter.js`
- `src/reference/model/adaptIrCli.js`
- `src/reference/model/validateReferenceModel.js`
- `src/reference/model/validateReferenceModelCli.js`

### Documentation
- `docs/BPMN_SPEC_COVERAGE.md`
- `docs/CHANGES_v25.md`
- `docs/INTEGRITY_REPORT_v25.md`

### Scripts
- `reference:coverage`
- `reference:registry`
- `reference:adapt`
- `reference:validate`
- `reference:all`
- `verify:v25`

## Modified

- `package.json`
  - version set to `25.0.0`
  - reference scripts added
  - all v24 scripts retained

## Removed

None.

## Policy

v25 is `v24 + Reference Layer`.
No v24 feature was intentionally removed.
