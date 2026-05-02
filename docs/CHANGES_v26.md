# CHANGES v26

Base: v25 copied first.

## Added

### BPMN Reference Meta-Model
- `src/reference/model/bpmnReferenceMetaModel.json`
- `schemas/reference/bpmn-reference-model.schema.json`
- `src/reference/model/metaModelCli.js`
- `src/reference/model/schemaCli.js`

### Reference Model Adapter v26
- `src/reference/model/referenceModelV26Adapter.js`
- `src/reference/model/adaptIrV26Cli.js`

### Reference Model Validation v26
- `src/reference/model/referenceModelV26Validator.js`
- `src/reference/model/validateReferenceModelV26Cli.js`

### Documentation
- `docs/BPMN_REFERENCE_METAMODEL_v26.md`
- `docs/CHANGES_v26.md`
- `docs/INTEGRITY_REPORT_v26.md`

### Scripts
- `reference:metamodel`
- `reference:schema`
- `reference:adapt:v26`
- `reference:validate:v26`
- `reference:v26:all`
- `verify:v26`

## Modified

- `package.json`
  - version set to `26.0.0`
  - v26 scripts added
  - all v25 scripts retained

## Removed

None.

## Policy

v26 is `v25 + BPMN Reference Meta-Model`.
No v25 feature was intentionally removed.
