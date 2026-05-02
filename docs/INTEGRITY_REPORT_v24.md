# INTEGRITY REPORT v24

## Build Principle

```text
v24 = v23 + additive improvements
```

## Existing Entry Points Preserved

v23 commands remain in `package.json`, including:
- `xml:di:export`
- `xml:di:import`
- `render:swimlanes`
- `render:elk:real`
- `coverage:extended`
- `verify:v23`

## New Entry Points

- `import:unified`
- `render:unified`
- `render:unified:xml`
- `audit:functional`
- `verify:v24`

## Files Added

- `src/unifiedBpmnImporter.js`
- `src/unifiedImportCli.js`
- `src/unifiedRenderer.js`
- `src/unifiedRenderCli.js`
- `src/unifiedRenderFromBpmnCli.js`
- `src/functionalAuditCli.js`
- `docs/CHANGES_v24.md`
- `docs/INTEGRITY_REPORT_v24.md`

## Files Removed

None.

## Functional Audit

Run:

```bash
npm run audit:functional
```

This checks not only file existence but also basic integration references.
