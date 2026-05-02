# BPMN Reference Engine v31 – Deep API Reference

## 1. Purpose

This document is a deeper API and module-level handoff reference for the BPMN Reference Engine v31 package.

It complements:

```text
BPMN_Reference_Engine_Handoff_v31.md
```

The focus here is not business explanation, but:

```text
- CLI entry points
- module responsibilities
- import/export functions
- runtime models
- data contracts
- extension points
```

---

## 2. Package Entry Points

The package is driven mainly through `npm run ...` commands.

### Full Script Reference

| Command | Underlying call |
| --- | --- |
| advanced:adapt | node src/reference/advanced/adaptAdvancedProcessCli.js tests/bpmn/advanced_process_types.bpmn output/advanced_process_model.json |
| advanced:model | node src/reference/advanced/advancedProcessModelCli.js |
| advanced:simulate | node src/reference/advanced/simulateAdvancedProcessCli.js tests/bpmn/advanced_process_types.bpmn output/advanced_process_simulation.json |
| advanced:validate | node src/reference/advanced/validateAdvancedProcessCli.js tests/bpmn/advanced_process_types.bpmn output/advanced_process_validation.json |
| audit | node src/auditCli.js |
| audit:functional | node src/functionalAuditCli.js |
| coverage:extended | node src/extendedCoverageCli.js tests/bpmn/extended_coverage.bpmn output/extended_coverage.ir.json |
| di:export:complete | node src/reference/di/exportCompleteDiCli.js examples/we_inbound_process_swimlanes.ir.json output/we_inbound_process.complete-di.bpmn |
| di:import:complete | node src/reference/di/importCompleteDiCli.js tests/bpmn/inbound_we_with_di.bpmn output/complete_di_import.ir.json |
| di:model | node src/reference/di/bpmndiModelCli.js |
| di:roundtrip | node src/reference/di/diRoundtripCli.js tests/bpmn/inbound_we_with_di.bpmn output/di_roundtrip |
| di:validate | node src/reference/di/validateDiCli.js tests/bpmn/inbound_we_with_di.bpmn output/di_validation.json |
| event:model | node src/reference/semantics/events/eventModelCli.js |
| event:simulate | node src/reference/semantics/events/simulateEventSemanticsCli.js examples/we_inbound_process.ir.json output/event_semantics_simulation.json |
| event:simulate:xml | node src/reference/semantics/events/simulateEventSemanticsFromBpmnCli.js tests/bpmn/inbound_we.bpmn output/event_semantics_simulation_from_xml.json |
| event:validate | node src/reference/semantics/events/validateEventSemanticsCli.js examples/we_inbound_process.ir.json output/event_semantics_validation.json |
| execution:all | npm run execution:manifest && npm run execution:elsa && npm run execution:camunda |
| execution:camunda | node src/camundaBpmnCli.js examples/we_inbound_process.ir.json output/camunda.bpmn |
| execution:elsa | node src/elsaWorkflowCli.js examples/we_inbound_process.ir.json output/elsa_workflow.json |
| execution:manifest | node src/executionManifestCli.js examples/we_inbound_process.ir.json output/execution_manifest.json |
| execution:model | node src/reference/execution/executionSemanticsModelCli.js |
| execution:simulate:ir | node src/reference/execution/simulateStrongExecutionFromIrCli.js examples/we_inbound_process.ir.json output/strong_execution_from_ir.json |
| execution:simulate:strong | node src/reference/execution/simulateStrongExecutionCli.js tests/bpmn/execution_semantics_full.bpmn output/strong_execution_simulation.json |
| execution:validate:semantics | node src/reference/execution/validateExecutionSemanticsCli.js tests/bpmn/execution_semantics_full.bpmn output/execution_semantics_validation.json |
| import:unified | node src/unifiedImportCli.js tests/bpmn/inbound_we_with_di.bpmn output/unified_import.ir.json |
| reference:adapt | node src/reference/model/adaptIrCli.js examples/we_inbound_process.ir.json output/reference_model.json |
| reference:adapt:v26 | node src/reference/model/adaptIrV26Cli.js examples/we_inbound_process.ir.json output/reference_model_v26.json |
| reference:all | npm run reference:registry && npm run reference:coverage && npm run reference:adapt && npm run reference:validate |
| reference:coverage | node src/reference/coverage/coverageCli.js |
| reference:metamodel | node src/reference/model/metaModelCli.js |
| reference:registry | node src/reference/registry/registryCli.js |
| reference:schema | node src/reference/model/schemaCli.js |
| reference:v26:all | npm run reference:metamodel && npm run reference:schema && npm run reference:adapt:v26 && npm run reference:validate:v26 |
| reference:v27:all | npm run token:model && npm run token:init && npm run token:simulate |
| reference:v28:all | npm run event:model && npm run event:validate && npm run event:simulate |
| reference:v29:all | npm run advanced:model && npm run advanced:adapt && npm run advanced:validate && npm run advanced:simulate |
| reference:v30:all | npm run di:model && npm run di:export:complete && npm run di:import:complete && npm run di:validate && npm run di:roundtrip |
| reference:v31:all | npm run execution:model && npm run execution:validate:semantics && npm run execution:simulate:strong && npm run execution:simulate:ir |
| reference:validate | node src/reference/model/validateReferenceModelCli.js examples/we_inbound_process.ir.json output/reference_validation.json |
| reference:validate:v26 | node src/reference/model/validateReferenceModelV26Cli.js examples/we_inbound_process.ir.json output/reference_validation_v26.json |
| render | node src/renderVerifiedCli.js tests/bpmn/inbound_we.bpmn output/inbound_we |
| render:elk | node src/semanticElkSvgCli.js examples/we_inbound_process.ir.json output/we_inbound_process.semantic-elk.svg |
| render:elk:real | node src/elkRenderCli.js examples/we_inbound_process.ir.json output/we_inbound_process.elk.svg |
| render:elk:real:xml | node src/elkRenderFromBpmnCli.js tests/bpmn/inbound_we.bpmn output/inbound_we.elk.svg |
| render:ir | node src/renderIrCli.js examples/we_inbound_process.ir.json output/we_inbound_process.svg |
| render:semantic | node src/semanticSvgCli.js examples/we_inbound_process.ir.json output/we_inbound_process.semantic.svg |
| render:swimlanes | node src/swimlaneRenderCli.js examples/we_inbound_process_swimlanes.ir.json output/we_inbound_process.swimlanes.svg |
| render:swimlanes:xml | node src/swimlaneRenderFromBpmnCli.js tests/bpmn/inbound_we_with_di.bpmn output/inbound_we.swimlanes.svg |
| render:unified | node src/unifiedRenderCli.js examples/we_inbound_process_swimlanes.ir.json output/we_inbound_process.unified.svg |
| render:unified:xml | node src/unifiedRenderFromBpmnCli.js tests/bpmn/inbound_we_with_di.bpmn output/inbound_we.unified.svg |
| text | node src/textToIrCli.js examples/text_process.txt output/text_process.ir.json |
| text:llm | node src/textToIrCli.js examples/text_process.txt output/text_process.llm.ir.json --llm |
| token:init | node src/reference/semantics/initTokenStateCli.js examples/we_inbound_process.ir.json output/token_state.initial.json |
| token:model | node src/reference/semantics/tokenModelCli.js |
| token:simulate | node src/reference/semantics/simulateTokenFlowCli.js examples/we_inbound_process.ir.json output/token_simulation.json |
| token:simulate:xml | node src/reference/semantics/simulateTokenFlowFromBpmnCli.js tests/bpmn/inbound_we.bpmn output/token_simulation_from_xml.json |
| verify | node src/verifyCli.js tests/bpmn reports |
| verify:v22 | npm run audit && npm run render:elk:real |
| verify:v23 | npm run audit && npm run render:elk:real && npm run xml:di:export && npm run render:swimlanes && npm run coverage:extended |
| verify:v24 | npm run audit && npm run audit:functional && npm run import:unified && npm run render:unified && npm run render:unified:xml |
| verify:v25 | npm run audit && npm run audit:functional && npm run reference:all |
| verify:v26 | npm run audit && npm run audit:functional && npm run reference:all && npm run reference:v26:all |
| verify:v27 | npm run audit && npm run audit:functional && npm run reference:v26:all && npm run reference:v27:all |
| verify:v28 | npm run audit && npm run audit:functional && npm run reference:v27:all && npm run reference:v28:all |
| verify:v29 | npm run audit && npm run audit:functional && npm run reference:v28:all && npm run reference:v29:all |
| verify:v30 | npm run audit && npm run audit:functional && npm run reference:v29:all && npm run reference:v30:all |
| verify:v31 | npm run audit && npm run audit:functional && npm run reference:v30:all && npm run reference:v31:all |
| we:all | npm run render:ir && npm run xml:export && npm run execution:all |
| xml:di:export | node src/bpmndiExportCli.js examples/we_inbound_process.ir.json output/we_inbound_process.with-di.bpmn |
| xml:di:import | node src/bpmndiImportCli.js tests/bpmn/inbound_we_with_di.bpmn output/imported_with_di.ir.json |
| xml:export | node src/bpmnExportCli.js examples/we_inbound_process.ir.json output/exported.bpmn |
| xml:import | node src/bpmnImportCli.js tests/bpmn/inbound_we.bpmn output/imported.ir.json |


---

## 3. Main Processing Pipelines

### 3.1 XML → IR

```text
BPMN XML
  → unifiedBpmnImporter
  → extendedBpmnImport
  → bpmnXmlImporter
  → IR
```

Primary modules:

| Module | Role |
|---|---|
| `src/bpmnXmlImporter.js` | Core BPMN XML parser |
| `src/extendedBpmnImport.js` | Adds extended parsing |
| `src/extendedBpmnParser.js` | Parses lanes, participants, BPMNDI, data, associations |
| `src/unifiedBpmnImporter.js` | Unified import wrapper used by newer layers |

Primary CLI:

```bash
npm run import:unified
```

---

### 3.2 IR → Reference Model

```text
IR
  → Reference Model Adapter
  → BPMN_REFERENCE_MODEL
```

Primary modules:

| Module | Role |
|---|---|
| `src/reference/model/referenceModelAdapter.js` | v25 basic adapter |
| `src/reference/model/referenceModelV26Adapter.js` | v26 BPMN meta-model adapter |
| `src/reference/model/referenceModelV26Validator.js` | validates reference model |

Primary CLI:

```bash
npm run reference:adapt:v26
npm run reference:validate:v26
```

---

### 3.3 Reference Model → Execution State

```text
Reference Model
  → Execution Index
  → Execution State
  → Strong Execution Simulator
```

Primary modules:

| Module | Role |
|---|---|
| `src/reference/execution/executionState.js` | tokens, scopes, jobs, subscriptions, trace |
| `src/reference/execution/executionIndex.js` | builds lookup maps for nodes/flows |
| `src/reference/execution/semanticsHandlers.js` | gateway, activity, event, transaction handlers |
| `src/reference/execution/strongExecutionSimulator.js` | orchestrates execution loop |
| `src/reference/execution/executionSemanticsValidator.js` | validates execution readiness |

Primary CLI:

```bash
npm run execution:simulate:strong
npm run execution:simulate:ir
```

---

## 4. Core Data Contracts

### 4.1 IR Model

The IR is the internal lightweight process model used by earlier layers.

Typical structure:

```json
{
  "process": {
    "id": "process_id",
    "name": "Process Name",
    "isExecutable": true,
    "nodes": [],
    "edges": [],
    "participants": [],
    "message_flows": [],
    "data": {},
    "di": {}
  }
}
```

### Node

```json
{
  "id": "task_1",
  "type": "task",
  "subtype": "service",
  "name": "Service Task",
  "execution": {
    "handler": "serviceHandler"
  }
}
```

### Edge

```json
{
  "id": "e1",
  "source": "start",
  "target": "task_1",
  "condition": "",
  "branch_type": "main"
}
```

---

### 4.2 Reference Model v26

The Reference Model is closer to BPMN 2.0 concepts.

Top-level form:

```json
{
  "modelType": "BPMN_REFERENCE_MODEL",
  "version": 26,
  "definitions": {
    "id": "Definitions_process_id",
    "rootElements": [],
    "diagrams": []
  },
  "process": {
    "id": "process_id",
    "bpmnType": "Process",
    "flowElements": []
  }
}
```

### Flow Element

```json
{
  "id": "task_1",
  "bpmnType": "ServiceTask",
  "name": "Service Task",
  "incoming": ["e0"],
  "outgoing": ["e1"],
  "extensionElements": {
    "execution": {
      "handler": "serviceHandler"
    }
  }
}
```

### Sequence Flow

```json
{
  "id": "e1",
  "bpmnType": "SequenceFlow",
  "sourceRef": "task_1",
  "targetRef": "task_2",
  "conditionExpression": "",
  "branchType": "main",
  "isDefault": false
}
```

---

### 4.3 Execution State v31

Schema:

```text
schemas/reference/bpmn-execution-state.schema.json
```

Main structure:

```json
{
  "processId": "process_id",
  "step": 0,
  "tokens": [],
  "scopes": [],
  "jobs": [],
  "subscriptions": [],
  "completedActivities": [],
  "trace": [],
  "incidents": []
}
```

### Token

```json
{
  "id": "t1",
  "state": "active",
  "location": "task_1",
  "scopeId": "process_id",
  "parentTokenId": null,
  "history": ["start", "task_1"],
  "createdAtStep": 0
}
```

Token states:

```text
active
waiting
consumed
terminated
error
```

### Scope

```json
{
  "id": "process_id",
  "type": "process",
  "state": "active",
  "parentScopeId": null,
  "elementId": "process_id",
  "tokens": ["t1"]
}
```

Scope types:

```text
process
subprocess
transaction
callActivity
event_subprocess
```

### Job

```json
{
  "id": "j1",
  "type": "timer",
  "elementId": "timer_event",
  "due": "immediate",
  "state": "scheduled"
}
```

### Subscription

```json
{
  "id": "sub1",
  "type": "eventBasedGatewayCandidate",
  "gatewayId": "event_gateway",
  "flowId": "flow_timer",
  "targetRef": "timer_event",
  "tokenId": "t1",
  "active": false,
  "cancelled": true
}
```

### Trace Entry

```json
{
  "step": 1,
  "type": "TOKEN_CREATED",
  "tokenId": "t1",
  "location": "start",
  "scopeId": "process_id"
}
```

### Incident

```json
{
  "step": 4,
  "type": "NO_OUTGOING_FLOW",
  "severity": "warning",
  "tokenId": "t3",
  "elementId": "task_x"
}
```

---

## 5. Module-Level API Reference

## 5.1 Import / Export

### `src/bpmnXmlImporter.js`

Expected export:

```js
import { importBpmnXml } from './bpmnXmlImporter.js';
```

Purpose:

```text
Parse core BPMN XML into IR.
```

Conceptual API:

```js
const ir = importBpmnXml(xmlString);
```

Returns:

```text
IR object
```

---

### `src/bpmnXmlExporter.js`

Expected exports:

```js
import { exportBpmnXml, esc } from './bpmnXmlExporter.js';
```

Conceptual API:

```js
const xml = exportBpmnXml(ir, options);
```

Options:

```json
{
  "camunda": true
}
```

---

### `src/unifiedBpmnImporter.js`

Expected export:

```js
import { importUnifiedBpmnXml } from './unifiedBpmnImporter.js';
```

Purpose:

```text
Preferred import facade for v24+.
Combines core BPMN, BPMNDI, lanes, participants, data objects, associations and metadata.
```

API:

```js
const ir = importUnifiedBpmnXml(xmlString);
```

---

## 5.2 Rendering

### `src/unifiedRenderer.js`

Expected export:

```js
import { renderUnifiedSvg } from './unifiedRenderer.js';
```

Purpose:

```text
Choose renderer automatically:
- swimlane renderer if lanes exist
- ELK renderer otherwise
```

API:

```js
const result = await renderUnifiedSvg(ir, { mode: 'swimlanes' });
```

Returns:

```json
{
  "mode": "swimlanes",
  "svg": "<svg>...</svg>"
}
```

---

### `src/elkSvgRenderer.js`

Expected export:

```js
import { renderElkSvg } from './elkSvgRenderer.js';
```

Purpose:

```text
ELK-based SVG rendering.
```

API:

```js
const svg = await renderElkSvg(ir);
```

---

### `src/swimlaneSvgRenderer.js`

Expected export:

```js
import { renderSwimlaneSvg } from './swimlaneSvgRenderer.js';
```

Purpose:

```text
Render lane-aware SVG.
```

API:

```js
const svg = renderSwimlaneSvg(ir);
```

---

## 5.3 BPMNDI

### `src/reference/di/completeDiBuilder.js`

Expected export:

```js
import { buildCompleteDi } from './completeDiBuilder.js';
```

Purpose:

```text
Build complete DI object from IR.
```

API:

```js
const di = buildCompleteDi(ir);
```

Returns:

```json
{
  "diagrams": [],
  "shapes": {},
  "edges": {},
  "labels": {}
}
```

---

### `src/reference/di/completeBpmndiXml.js`

Expected export:

```js
import { exportBpmnXmlWithCompleteDi } from './completeBpmndiXml.js';
```

API:

```js
const xml = exportBpmnXmlWithCompleteDi(ir);
```

Purpose:

```text
Export BPMN XML with complete BPMNDI structure.
```

---

### `src/reference/di/completeDiParser.js`

Expected export:

```js
import { parseCompleteBpmndi } from './completeDiParser.js';
```

API:

```js
const di = parseCompleteBpmndi(xmlString);
```

Purpose:

```text
Parse BPMNDiagram, BPMNPlane, BPMNShape, BPMNEdge, BPMNLabel, Bounds and waypoints.
```

---

### `src/reference/di/diValidator.js`

Expected export:

```js
import { validateCompleteDi } from './diValidator.js';
```

API:

```js
const validation = validateCompleteDi(ir, di);
```

Returns:

```json
{
  "ok": true,
  "errors": [],
  "warnings": [],
  "stats": {
    "diagrams": 1,
    "shapes": 6,
    "edges": 5,
    "labels": 11
  }
}
```

---

## 5.4 Reference Model

### `src/reference/model/referenceModelV26Adapter.js`

Expected export:

```js
import { adaptIrToReferenceModelV26 } from './referenceModelV26Adapter.js';
```

API:

```js
const referenceModel = adaptIrToReferenceModelV26(ir);
```

Purpose:

```text
Transform IR into BPMN_REFERENCE_MODEL v26.
```

---

### `src/reference/model/referenceModelV26Validator.js`

Expected export:

```js
import { validateReferenceModelV26 } from './referenceModelV26Validator.js';
```

API:

```js
const validation = validateReferenceModelV26(referenceModel);
```

---

## 5.5 Token Model

### `src/reference/semantics/tokenState.js`

Expected exports:

```js
import {
  createInitialTokenState,
  resetTokenCounter,
  nextTokenId
} from './tokenState.js';
```

Purpose:

```text
Create and manage initial token state.
```

---

### `src/reference/semantics/tokenSimulator.js`

Expected export:

```js
import { simulateTokenFlow } from './tokenSimulator.js';
```

API:

```js
const tokenState = simulateTokenFlow(referenceModel, { maxSteps: 100 });
```

Purpose:

```text
Basic token-flow simulation from v27.
```

Note:

```text
v31 strong execution supersedes this for advanced behavior, but this remains available.
```

---

## 5.6 Event Semantics

### `src/reference/semantics/events/eventSemantics.js`

Expected exports:

```js
import {
  EVENT_TYPES,
  normalizeEventDefinition,
  getNodeEventType,
  isCatchEvent,
  isThrowEvent,
  createEventSemanticsState,
  discoverEventSemantics,
  validateEventSemantics
} from './eventSemantics.js';
```

Supported event types:

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

---

### `src/reference/semantics/events/eventRuntime.js`

Expected exports:

```js
import {
  applyEventThrow,
  createRuntimeEventState
} from './eventRuntime.js';
```

Purpose:

```text
Event throw/catch behavior foundation.
```

---

### `src/reference/semantics/events/eventAwareTokenSimulator.js`

Expected export:

```js
import { simulateEventAwareTokenFlow } from './eventAwareTokenSimulator.js';
```

API:

```js
const result = simulateEventAwareTokenFlow(referenceModel);
```

---

## 5.7 Advanced Process Types

### `src/reference/advanced/advancedBpmnParser.js`

Expected export:

```js
import { parseAdvancedBpmn } from './advancedBpmnParser.js';
```

Parses:

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

API:

```js
const advancedModel = parseAdvancedBpmn(xmlString);
```

---

### `src/reference/advanced/advancedProcessAdapter.js`

Expected export:

```js
import { adaptAdvancedBpmn } from './advancedProcessAdapter.js';
```

API:

```js
const model = adaptAdvancedBpmn(xmlString, referenceModel);
```

---

### `src/reference/advanced/advancedProcessValidator.js`

Expected export:

```js
import { validateAdvancedProcessModel } from './advancedProcessValidator.js';
```

API:

```js
const validation = validateAdvancedProcessModel(model);
```

---

### `src/reference/advanced/advancedProcessSimulator.js`

Expected export:

```js
import { simulateAdvancedProcessModel } from './advancedProcessSimulator.js';
```

API:

```js
const simulation = simulateAdvancedProcessModel(model);
```

---

## 5.8 Strong Execution Semantics v31

### `src/reference/execution/executionState.js`

Expected exports:

```js
import {
  resetExecutionCounters,
  nextTokenId,
  nextScopeId,
  nextJobId,
  nextSubscriptionId,
  createExecutionState,
  trace,
  incident,
  createToken,
  moveToken,
  consumeToken,
  terminateToken,
  activeTokens,
  waitingTokens
} from './executionState.js';
```

Responsibilities:

```text
- token lifecycle
- scope lifecycle
- jobs
- subscriptions
- trace
- incidents
```

---

### `src/reference/execution/executionIndex.js`

Expected exports:

```js
import {
  createExecutionIndex,
  eventTypeOf,
  isActivity,
  evaluateCondition
} from './executionIndex.js';
```

Responsibilities:

```text
- node lookup
- flow lookup
- incoming/outgoing maps
- basic condition evaluation
```

---

### `src/reference/execution/semanticsHandlers.js`

Expected exports:

```js
import {
  completeActivity,
  handleExclusiveGateway,
  handleInclusiveGateway,
  handleParallelGateway,
  handleEventBasedGateway,
  handleBoundaryEvent,
  registerEventSubprocess,
  handleTransaction,
  triggerCancelTransaction,
  triggerCompensation,
  handleMultiInstance,
  handleCallActivity,
  handleErrorPropagation,
  handleEscalationPropagation,
  scheduleTimer,
  fireTimer
} from './semanticsHandlers.js';
```

Responsibilities by handler:

| Handler | Responsibility |
|---|---|
| `completeActivity` | task completion + outgoing flow |
| `handleExclusiveGateway` | XOR selection |
| `handleInclusiveGateway` | OR split/join approximation |
| `handleParallelGateway` | AND split/join |
| `handleEventBasedGateway` | deterministic race resolution |
| `handleBoundaryEvent` | interrupting/non-interrupting hook |
| `registerEventSubprocess` | subscription registration |
| `handleTransaction` | transaction scope start |
| `triggerCancelTransaction` | cancel transaction scope |
| `triggerCompensation` | compensation trace execution |
| `handleMultiInstance` | parallel/sequential MI foundation |
| `handleCallActivity` | called process scope placeholder |
| `handleErrorPropagation` | error handler lookup |
| `handleEscalationPropagation` | escalation handler lookup |
| `scheduleTimer` | timer job creation |
| `fireTimer` | deterministic timer firing |

---

### `src/reference/execution/strongExecutionSimulator.js`

Expected exports:

```js
import {
  simulateStrongExecution,
  simulateStrongExecutionFromIr
} from './strongExecutionSimulator.js';
```

API:

```js
const state = simulateStrongExecution(referenceModel, {
  maxSteps: 200,
  context: {
    conditions: {
      "approved": true
    },
    multiInstanceCount: 3
  }
});
```

Or:

```js
const state = simulateStrongExecutionFromIr(ir);
```

Responsibilities:

```text
- create execution index
- create execution state
- locate start event
- register boundary handlers
- run step loop
- invoke semantic handlers
- produce final execution state
```

---

### `src/reference/execution/executionSemanticsValidator.js`

Expected export:

```js
import { validateExecutionSemanticsReadiness } from './executionSemanticsValidator.js';
```

API:

```js
const validation = validateExecutionSemanticsReadiness(referenceModel);
```

Returns:

```json
{
  "ok": true,
  "errors": [],
  "warnings": [],
  "stats": {
    "nodes": 10,
    "sequenceFlows": 9,
    "inclusiveGateways": 1,
    "eventBasedGateways": 1,
    "transactions": 1,
    "callActivities": 1,
    "multiInstanceActivities": 1
  }
}
```

---

## 6. Execution Semantics Details

## 6.1 Exclusive Gateway

Current behavior:

```text
1. Prefer default flow if defined
2. Else choose first condition evaluating true
3. Else choose first outgoing flow
```

Important limitation:

```text
Expression evaluation is currently basic.
```

---

## 6.2 Inclusive Gateway

Current behavior:

```text
- OR split activates all true outgoing flows
- OR join uses active-branch approximation
```

Limitation:

```text
Full BPMN OR-join semantics are significantly more complex.
```

---

## 6.3 Parallel Gateway

Current behavior:

```text
- AND split: one token becomes N tokens
- AND join: waits for all incoming tokens
```

---

## 6.4 Event-based Gateway

Current behavior:

```text
- Creates candidate subscriptions
- Deterministically selects first outgoing event
- Cancels others
```

Limitation:

```text
No real async external event race yet.
```

---

## 6.5 Boundary Events

Current behavior:

```text
- handlers can be registered
- interrupting flag is represented
- attached activity can be terminated by handler
```

Limitation:

```text
Full live task cancellation requires runtime persistence and task lifecycle.
```

---

## 6.6 Multi-instance

Current behavior:

```text
- sequential instances traced sequentially
- parallel instances traced and completed
- count based on loopCardinality or context.multiInstanceCount
```

Limitation:

```text
No real per-instance data collection yet.
```

---

## 6.7 Call Activity

Current behavior:

```text
- creates called scope
- marks it completed
- returns to parent flow
```

Limitation:

```text
No real external process repository or IO mapping yet.
```

---

## 7. Extension Points

### Add a new BPMN element

1. Add to registry:

```text
src/reference/registry/bpmnElementRegistry.json
```

2. Add coverage status:

```text
src/reference/coverage/bpmnCoverageMatrix.json
```

3. Add meta-model type:

```text
src/reference/model/bpmnReferenceMetaModel.json
```

4. Add adapter mapping:

```text
src/reference/model/referenceModelV26Adapter.js
```

5. Add execution handler if runtime behavior exists:

```text
src/reference/execution/semanticsHandlers.js
```

---

### Add a new event type

1. Extend:

```text
src/reference/semantics/events/eventSemanticsModel.json
```

2. Extend:

```text
src/reference/semantics/events/eventSemantics.js
```

3. Add runtime behavior:

```text
src/reference/semantics/events/eventRuntime.js
```

4. Integrate into strong execution if needed:

```text
src/reference/execution/semanticsHandlers.js
```

---

### Add real expression evaluation

Replace or extend:

```text
src/reference/execution/executionIndex.js
→ evaluateCondition()
```

Future options:

```text
- FEEL
- JavaScript sandbox
- JSONLogic
- custom expression engine
```

---

### Add persistence

Persist:

```text
ExecutionState
Token
Scope
Job
Subscription
Trace
Incident
```

Recommended storage model:

```text
execution_instances
execution_tokens
execution_scopes
execution_jobs
execution_subscriptions
execution_trace
execution_incidents
```

---

## 8. File Inventory

### Source Files

```text
src/auditCli.js
src/bpmnExportCli.js
src/bpmnImportCli.js
src/bpmnXmlExporter.js
src/bpmnXmlImporter.js
src/bpmndiExportCli.js
src/bpmndiExporter.js
src/bpmndiImportCli.js
src/camundaBpmnCli.js
src/coverage.js
src/elkRenderCli.js
src/elkRenderFromBpmnCli.js
src/elkSvgRenderer.js
src/elsaWorkflowCli.js
src/elsaWorkflowGenerator.js
src/executionManifest.js
src/executionManifestCli.js
src/extendedBpmnImport.js
src/extendedBpmnParser.js
src/extendedCoverageCli.js
src/functionalAuditCli.js
src/irToElkGraph.js
src/labelEngine.js
src/normalizer.js
src/pipeline.js
src/reference/advanced/adaptAdvancedProcessCli.js
src/reference/advanced/advancedBpmnParser.js
src/reference/advanced/advancedProcessAdapter.js
src/reference/advanced/advancedProcessModelCli.js
src/reference/advanced/advancedProcessSimulator.js
src/reference/advanced/advancedProcessValidator.js
src/reference/advanced/simulateAdvancedProcessCli.js
src/reference/advanced/validateAdvancedProcessCli.js
src/reference/coverage/coverageCli.js
src/reference/di/bpmndiModelCli.js
src/reference/di/completeBpmndiXml.js
src/reference/di/completeDiBuilder.js
src/reference/di/completeDiParser.js
src/reference/di/diGeometry.js
src/reference/di/diRoundtripCli.js
src/reference/di/diValidator.js
src/reference/di/exportCompleteDiCli.js
src/reference/di/importCompleteDiCli.js
src/reference/di/validateDiCli.js
src/reference/execution/executionIndex.js
src/reference/execution/executionSemanticsModelCli.js
src/reference/execution/executionSemanticsValidator.js
src/reference/execution/executionState.js
src/reference/execution/semanticsHandlers.js
src/reference/execution/simulateStrongExecutionCli.js
src/reference/execution/simulateStrongExecutionFromIrCli.js
src/reference/execution/strongExecutionSimulator.js
src/reference/execution/validateExecutionSemanticsCli.js
src/reference/model/adaptIrCli.js
src/reference/model/adaptIrV26Cli.js
src/reference/model/metaModelCli.js
src/reference/model/referenceModelAdapter.js
src/reference/model/referenceModelV26Adapter.js
src/reference/model/referenceModelV26Validator.js
src/reference/model/schemaCli.js
src/reference/model/validateReferenceModel.js
src/reference/model/validateReferenceModelCli.js
src/reference/model/validateReferenceModelV26Cli.js
src/reference/registry/registryCli.js
src/reference/semantics/events/eventAwareTokenSimulator.js
src/reference/semantics/events/eventModelCli.js
src/reference/semantics/events/eventRuntime.js
src/reference/semantics/events/eventSemantics.js
src/reference/semantics/events/simulateEventSemanticsCli.js
src/reference/semantics/events/simulateEventSemanticsFromBpmnCli.js
src/reference/semantics/events/validateEventSemanticsCli.js
src/reference/semantics/initTokenStateCli.js
src/reference/semantics/simulateTokenFlowCli.js
src/reference/semantics/simulateTokenFlowFromBpmnCli.js
src/reference/semantics/tokenModelCli.js
src/reference/semantics/tokenSimulator.js
src/reference/semantics/tokenState.js
src/renderAllCli.js
src/renderIrCli.js
src/renderVerifiedCli.js
src/semanticDiff.js
src/semanticElkSvgCli.js
src/semanticSvgCli.js
src/structuredOutputSchema.js
src/svgRenderer.js
src/swimlaneRenderCli.js
src/swimlaneRenderFromBpmnCli.js
src/swimlaneSvgRenderer.js
src/textToIrCli.js
src/textToIrLlmParser.js
src/textToIrParser.js
src/unifiedBpmnImporter.js
src/unifiedImportCli.js
src/unifiedRenderCli.js
src/unifiedRenderFromBpmnCli.js
src/unifiedRenderer.js
src/validator.js
src/verifyCli.js
```

### Schemas

```text
schemas/bpmn-ir.schema.json
schemas/reference/bpmn-advanced-process-types.schema.json
schemas/reference/bpmn-event-state.schema.json
schemas/reference/bpmn-execution-state.schema.json
schemas/reference/bpmn-reference-model.schema.json
schemas/reference/bpmn-token-state.schema.json
schemas/reference/bpmndi-complete.schema.json
```

### Docs

```text
docs/BPMNDI_COMPLETION_v30.md
docs/BPMN_ADVANCED_PROCESS_TYPES_v29.md
docs/BPMN_EVENT_SEMANTICS_v28.md
docs/BPMN_EXECUTION_SEMANTICS_v31.md
docs/BPMN_REFERENCE_METAMODEL_v26.md
docs/BPMN_SPEC_COVERAGE.md
docs/BPMN_TOKEN_MODEL_v27.md
docs/CHANGES_v22.md
docs/CHANGES_v23.md
docs/CHANGES_v24.md
docs/CHANGES_v25.md
docs/CHANGES_v26.md
docs/CHANGES_v27.md
docs/CHANGES_v28.md
docs/CHANGES_v29.md
docs/CHANGES_v30.md
docs/CHANGES_v31.md
docs/FEATURE_MATRIX.md
docs/INTEGRITY_REPORT_v24.md
docs/INTEGRITY_REPORT_v25.md
docs/INTEGRITY_REPORT_v26.md
docs/INTEGRITY_REPORT_v27.md
docs/INTEGRITY_REPORT_v28.md
docs/INTEGRITY_REPORT_v29.md
docs/INTEGRITY_REPORT_v30.md
docs/INTEGRITY_REPORT_v31.md
docs/MIGRATION_HISTORY.md
docs/V21_AUDIT.md
docs/V23_SCRIPT_RETENTION_v24.json
docs/V24_SCRIPT_RETENTION_v25.json
docs/V25_SCRIPT_RETENTION_v26.json
docs/V26_SCRIPT_RETENTION_v27.json
docs/V27_SCRIPT_RETENTION_v28.json
docs/V28_SCRIPT_RETENTION_v29.json
docs/V29_SCRIPT_RETENTION_v30.json
docs/V30_SCRIPT_RETENTION_v31.json
```

---

## 9. Known API Limitations

### Not production hardened

Current APIs are file/CLI oriented.

Missing:

```text
- HTTP API
- persistent runtime store
- transactional DB state
- job scheduler
- message broker
- auth/security
- observability
```

### Execution limitations

```text
- OR-join is approximate
- Event-based gateway race is deterministic
- Compensation is trace-level foundation
- Call activity does not execute external process model
- Transactions are reference-level, not ACID runtime
```

### BPMN.io limitations

```text
- BPMNDI structure exists
- real visual pixel-perfect bpmn.io behavior still requires roundtrip testing against bpmn-js
```

---

## 10. Recommended Next Engineering Steps

### v32 – Conformance Test Suite

```text
- BPMN sample catalog
- golden XML
- golden IR
- golden Reference Model
- golden Execution Trace
- DI roundtrip tests
```

### v33 – Runtime Persistence

```text
- execution instance store
- token store
- job store
- subscription store
```

### v34 – API Server

```text
- deploy process
- start instance
- correlate message
- fire timer
- query state
```

### v35 – Expression Engine

```text
- FEEL or JSONLogic
- condition evaluation
- IO mappings
```

---

## 11. Bottom Line

v31 provides a deep reference-engine API surface:

```text
Parser
Model adapter
BPMNDI
Token model
Event semantics
Advanced process types
Strong execution semantics
```

It is now suitable as a foundation for a real BPMN engine implementation, but it still needs hardening, persistence, conformance tests and API service layers before production use.
