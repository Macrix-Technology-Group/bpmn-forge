# BPMN Reference Meta-Model v26

v26 adds a BPMN Reference Meta-Model layer on top of v25.

## Added files

```text
src/reference/model/bpmnReferenceMetaModel.json
schemas/reference/bpmn-reference-model.schema.json
src/reference/model/referenceModelV26Adapter.js
src/reference/model/referenceModelV26Validator.js
```

## Commands

```bash
npm run reference:metamodel
npm run reference:schema
npm run reference:adapt:v26
npm run reference:validate:v26
npm run reference:v26:all
npm run verify:v26
```

## Purpose

v25 measured specification coverage.

v26 defines the internal BPMN reference model structure that later token-flow semantics can use.

## Important

v26 does not replace the existing v24/v25 IR. It adds an adapter:

```text
v24/v25 IR → BPMN Reference Model v26
```

Existing CLIs remain unchanged.
