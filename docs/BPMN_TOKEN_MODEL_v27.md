# BPMN Token Model v27

v27 adds the first token-flow semantics layer on top of the v26 BPMN Reference Meta-Model.

## Added files

```text
src/reference/semantics/tokenModel.json
schemas/reference/bpmn-token-state.schema.json
src/reference/semantics/tokenState.js
src/reference/semantics/tokenSimulator.js
```

## Commands

```bash
npm run token:model
npm run token:init
npm run token:simulate
npm run token:simulate:xml
npm run reference:v27:all
npm run verify:v27
```

## Supported in v27

- StartEvent creates token
- Task / ServiceTask / UserTask pass token through
- ExclusiveGateway selects default or first outgoing flow
- ParallelGateway supports basic split and basic join
- EndEvent consumes token
- SequenceFlow moves token

## Not yet complete

- InclusiveGateway semantics
- EventBasedGateway semantics
- Boundary event interruption
- Message/timer/signal waiting
- Compensation
- Transactions
- Multi-instance activities
- Subprocess scope execution
- Collaboration/message-flow execution

## Design principle

v27 does not replace v26. It adds a semantic layer:

```text
IR → Reference Model v26 → Token State v27 → Simulation Trace
```
