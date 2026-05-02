# bpmn-forge

A layered **BPMN 2.0 reference engine** in JavaScript. Parses BPMN XML, normalizes it into a typed reference model, simulates execution with token/event semantics, and renders SVG. Designed as a foundation for real BPMN runtimes — not a production engine.

## Pipeline

```text
text / BPMN XML
  → IR
  → Reference Model (v26)
  → Token State (v27) → Event Semantics (v28) → Execution State (v31)
  → BPMNDI (v30) → SVG  (ELK / swimlane / verified)
  → Camunda XML / Elsa workflow / Execution manifest
```

## Quick start

```bash
# render a sample BPMN file to verified SVG + report
npm run render

# strong execution simulation from XML
npm run execution:simulate:strong

# full v31 verification (audit + reference model + execution semantics)
npm run verify:v31
```

Outputs land in `output/` and `reports/`.

## Core commands

| Command | What it does |
|---|---|
| `npm run render` | XML → IR → verified SVG (with semantic-diff warnings) |
| `npm run render:elk:real:xml` | XML → ELK-laid-out SVG |
| `npm run render:swimlanes:xml` | XML with lanes → lane-aware SVG |
| `npm run import:unified` | XML → unified IR (core + DI + lanes + data) |
| `npm run reference:adapt:v26` | IR → BPMN Reference Model v26 |
| `npm run token:simulate:xml` | XML → token-flow trace |
| `npm run execution:simulate:strong` | XML → full execution state (tokens, scopes, jobs, trace) |
| `npm run di:roundtrip` | Verify BPMNDI import/export fidelity |
| `npm run text` / `npm run text:llm` | Plain text → IR (rule-based or LLM-assisted) |

Full script reference: [docs/BPMN_Reference_Engine_API_Reference_v31.md](docs/BPMN_Reference_Engine_API_Reference_v31.md).

## Status (v31)

Working: parsing, reference model, BPMNDI roundtrip, token simulation, event semantics for 10 event types, exclusive/parallel/inclusive/event-based gateways, boundary events, multi-instance and call-activity foundations, ELK and swimlane rendering, Camunda/Elsa export.

Known limitations: OR-join is approximate, event-based gateway race is deterministic, no expression engine (no FEEL), no persistence, no scheduler, no message broker.

For the full architectural overview and gap analysis: [docs/BPMN_Reference_Engine_Handoff_v31.md](docs/BPMN_Reference_Engine_Handoff_v31.md).

## Roadmap

- v32 — conformance test suite
- v33 — runtime persistence
- v34 — API server
- v35 — expression engine (FEEL or JSONLogic)
