# CHANGES v22

Base: v21 copied first.

## Added

- `src/irToElkGraph.js`
- `src/labelEngine.js`
- `src/elkSvgRenderer.js`
- `src/elkRenderCli.js`
- `src/elkRenderFromBpmnCli.js`
- `npm run render:elk:real`
- `npm run render:elk:real:xml`
- `npm run verify:v22`

## Modified

- `package.json`
  - version changed to `22.0.0`
  - added ELK-first scripts
  - retained all v21 scripts
- `src/semanticElkSvgCli.js`
  - now uses real ELK renderer instead of deterministic fallback

## Removed

None.

## Policy

v22 is `v21 + diff`.
No v21 feature was intentionally removed.
