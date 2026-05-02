# BPMN Event Semantics v28

v28 adds event semantics for:

```text
message
timer
signal
error
escalation
conditional
link
compensation
terminate
cancel
```

## Added files

```text
src/reference/semantics/events/eventSemanticsModel.json
schemas/reference/bpmn-event-state.schema.json
src/reference/semantics/events/eventSemantics.js
src/reference/semantics/events/eventRuntime.js
src/reference/semantics/events/eventAwareTokenSimulator.js
```

## Commands

```bash
npm run event:model
npm run event:validate
npm run event:simulate
npm run event:simulate:xml
npm run reference:v28:all
npm run verify:v28
```

## Important

This is the event semantics foundation layer.

It models and traces event behavior. Some events are still not full BPMN execution semantics:

- transaction cancel is recorded, not fully transaction-executed
- compensation is recorded, not fully compensation-executed
- timer/conditional fire deterministically in v28 simulation
- message/signal matching is model-level, not external runtime integration

## Layering

```text
IR
→ Reference Model v26
→ Token Model v27
→ Event Semantics v28
```

No v27 functionality is replaced.
