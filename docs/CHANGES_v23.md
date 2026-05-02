# CHANGES v23

Base: v22 copied first.

## Added

### 1. BPMNDI Import/Export
- `src/bpmndiExporter.js`
- `src/bpmndiExportCli.js`
- `src/bpmndiImportCli.js`
- `npm run xml:di:export`
- `npm run xml:di:import`

### 2. Swimlanes / Pools Rendering
- `src/swimlaneSvgRenderer.js`
- `src/swimlaneRenderCli.js`
- `src/swimlaneRenderFromBpmnCli.js`
- `examples/we_inbound_process_swimlanes.ir.json`
- `npm run render:swimlanes`
- `npm run render:swimlanes:xml`

### 4. Extended BPMN Coverage
- `src/extendedBpmnParser.js`
- `src/extendedBpmnImport.js`
- `src/extendedCoverageCli.js`
- `tests/bpmn/extended_coverage.bpmn`
- data objects
- associations
- text annotations
- nested subprocess metadata
- transaction/subprocess parsing foundation
- compensation/event-based-gateway foundation

## Modified

- `package.json`: version set to `23.0.0`, scripts added.
- `docs/FEATURE_MATRIX.md`: v23 rows appended.
- `src/auditCli.js`: v23 feature files added to required audit list.

## Removed

None.

## Policy

v23 is `v22 + diff`.
No v22 feature was intentionally removed.
