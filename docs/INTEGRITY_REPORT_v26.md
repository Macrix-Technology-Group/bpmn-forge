# INTEGRITY REPORT v26

## Build Principle

```text
v26 = v25 + BPMN Reference Meta-Model
```

## Script Retention

```json
{
  "lostScripts": [],
  "lostCount": 0
}
```

## Existing v25 Layers Preserved

- v24/v25 core engine
- reference coverage matrix
- reference registry
- reference model adapter v25
- verification and rendering stacks
- BPMNDI / swimlane / unified import-render stack
- execution exports
- LLM/text generation

## New v26 Layer

```text
src/reference/model/bpmnReferenceMetaModel.json
schemas/reference/bpmn-reference-model.schema.json
src/reference/model/referenceModelV26Adapter.js
src/reference/model/referenceModelV26Validator.js
```

## Files Removed

None.
