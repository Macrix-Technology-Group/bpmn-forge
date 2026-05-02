# CHANGES v29

Base: v28 copied first.

## Added

### Advanced Process Types Model
- `src/reference/advanced/advancedProcessTypesModel.json`
- `schemas/reference/bpmn-advanced-process-types.schema.json`

### Parser / Adapter / Validator / Simulator
- `src/reference/advanced/advancedBpmnParser.js`
- `src/reference/advanced/advancedProcessAdapter.js`
- `src/reference/advanced/advancedProcessValidator.js`
- `src/reference/advanced/advancedProcessSimulator.js`

### CLI
- `src/reference/advanced/advancedProcessModelCli.js`
- `src/reference/advanced/adaptAdvancedProcessCli.js`
- `src/reference/advanced/validateAdvancedProcessCli.js`
- `src/reference/advanced/simulateAdvancedProcessCli.js`

### Test BPMN
- `tests/bpmn/advanced_process_types.bpmn`

### Documentation
- `docs/BPMN_ADVANCED_PROCESS_TYPES_v29.md`
- `docs/CHANGES_v29.md`
- `docs/INTEGRITY_REPORT_v29.md`

### Scripts
- `advanced:model`
- `advanced:adapt`
- `advanced:validate`
- `advanced:simulate`
- `reference:v29:all`
- `verify:v29`

## Modified

- `package.json`
  - version set to `29.0.0`
  - advanced process scripts added
  - all v28 scripts retained

## Removed

None.

## Policy

v29 is `v28 + Advanced Process Types`.
No v28 feature was intentionally removed.
