# CHANGES v28

Base: v27 copied first.

## Added

### Event Semantics Model
- `src/reference/semantics/events/eventSemanticsModel.json`
- `schemas/reference/bpmn-event-state.schema.json`

### Event Semantics Runtime
- `src/reference/semantics/events/eventSemantics.js`
- `src/reference/semantics/events/eventRuntime.js`
- `src/reference/semantics/events/eventAwareTokenSimulator.js`

### CLI
- `src/reference/semantics/events/eventModelCli.js`
- `src/reference/semantics/events/validateEventSemanticsCli.js`
- `src/reference/semantics/events/simulateEventSemanticsCli.js`
- `src/reference/semantics/events/simulateEventSemanticsFromBpmnCli.js`

### Test BPMN
- `tests/bpmn/event_semantics_all.bpmn`

### Documentation
- `docs/BPMN_EVENT_SEMANTICS_v28.md`
- `docs/CHANGES_v28.md`
- `docs/INTEGRITY_REPORT_v28.md`

### Scripts
- `event:model`
- `event:validate`
- `event:simulate`
- `event:simulate:xml`
- `reference:v28:all`
- `verify:v28`

## Modified

- `package.json`
  - version set to `28.0.0`
  - event semantic scripts added
  - all v27 scripts retained

## Removed

None.

## Policy

v28 is `v27 + Event Semantics`.
No v27 feature was intentionally removed.
