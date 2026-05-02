# BPMN 2.0 Specification Coverage

v25 introduces a reference coverage layer on top of the v24 engine.

## Machine-readable files

```text
src/reference/registry/bpmnElementRegistry.json
src/reference/coverage/bpmnCoverageMatrix.json
```

## Commands

```bash
npm run reference:registry
npm run reference:coverage
npm run reference:adapt
npm run reference:validate
npm run reference:all
```

## Coverage dimensions

Each BPMN element is tracked across:

```text
parser
exporter
renderer
semantics
tests
```

Status values:

```text
supported
partial
missing
not_applicable
```

## Purpose

This is the control framework for turning the current BPMN engine into a BPMN reference engine without losing v24 functionality.
