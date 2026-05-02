# BPMN Advanced Process Types v29

v29 adds a foundation layer for:

```text
collaboration
choreography
conversation
transaction
ad-hoc subprocess
event subprocess
multi-instance activity
call activity
```

## Added files

```text
src/reference/advanced/advancedProcessTypesModel.json
schemas/reference/bpmn-advanced-process-types.schema.json
src/reference/advanced/advancedBpmnParser.js
src/reference/advanced/advancedProcessAdapter.js
src/reference/advanced/advancedProcessValidator.js
src/reference/advanced/advancedProcessSimulator.js
tests/bpmn/advanced_process_types.bpmn
```

## Commands

```bash
npm run advanced:model
npm run advanced:adapt
npm run advanced:validate
npm run advanced:simulate
npm run reference:v29:all
npm run verify:v29
```

## Support level

v29 provides:
- model structures
- XML parsing foundation
- validation foundation
- simulation trace foundation

It does not yet provide complete normative BPMN execution semantics for all advanced types.
