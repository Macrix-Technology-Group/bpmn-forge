# BPMN Execution Semantics v31

v31 adds strong BPMN execution semantics on top of v30.

## Covered in v31

```text
exclusive gateway
inclusive gateway
parallel gateway
event-based gateway
boundary event registration
event subprocess registration foundation
transaction scope
compensation trace execution
multi-instance activity
call activity
message/timer/error/escalation semantic hooks
```

## Commands

```bash
npm run execution:model
npm run execution:validate:semantics
npm run execution:simulate:strong
npm run execution:simulate:ir
npm run reference:v31:all
npm run verify:v31
```

## Important

v31 is still a reference-engine semantics layer, not a production runtime.

It does not yet include:
- persistent runtime store
- distributed job executor
- external message broker
- real wall-clock scheduler
- production API

But it now contains the core dynamic BPMN behavior layer.
