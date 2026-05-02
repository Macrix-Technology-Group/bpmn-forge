# CHANGES v24

Base: v23 copied first.

## Added

### Unified Importer
- `src/unifiedBpmnImporter.js`
- `src/unifiedImportCli.js`
- `npm run import:unified`

The unified importer calls the extended importer and therefore includes:
- BPMN core
- BPMNDI
- participants / lanes
- data objects
- associations
- annotations
- subprocess metadata

### Unified Renderer Core
- `src/unifiedRenderer.js`
- `src/unifiedRenderCli.js`
- `src/unifiedRenderFromBpmnCli.js`
- `npm run render:unified`
- `npm run render:unified:xml`

Rendering selection:
- swimlanes if participants/lanes exist
- ELK renderer otherwise

### Functional Audit
- `src/functionalAuditCli.js`
- `npm run audit:functional`
- `npm run verify:v24`

Checks:
- required files exist
- required scripts exist
- unified importer is connected to extended importer
- unified renderer is connected to swimlane and ELK renderers

## Modified

- `package.json`
  - version set to `24.0.0`
  - v24 scripts added
  - all v23 scripts retained

## Removed

None.

## Policy

v24 is `v23 + diff`.
No v23 feature was intentionally removed.
