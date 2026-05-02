# BPMNDI Completion v30

v30 adds a more complete BPMNDI layer for bpmn.io / Camunda Modeler compatibility.

## Covered structures

```text
BPMNDiagram
BPMNPlane
BPMNShape
BPMNEdge
BPMNLabel
LaneShape      = BPMNShape referencing a lane
ParticipantShape = BPMNShape referencing a participant
Bounds
Waypoints
```

## Commands

```bash
npm run di:model
npm run di:export:complete
npm run di:import:complete
npm run di:validate
npm run di:roundtrip
npm run reference:v30:all
npm run verify:v30
```

## Important

This is a structural BPMNDI completion layer.

It improves bpmn.io/Camunda Modeler compatibility, but it does not complete BPMN execution semantics. That is planned for v31.
