# Installing `@macrix-technology-group/bpmn-forge` from GitHub

This guide walks you through installing `bpmn-forge` directly from the GitHub repository — no npm registry account or `npm publish` required. Use this when you want to consume the library from another project (TS web app, Node service, CLI tool) without setting up a private registry.

---

## TL;DR

```bash
# in the consumer project
npm install "git+https://github.com/Macrix-Technology-Group/bpmn-forge.git#0.2.0"
```

```ts
import { importBpmnXml, renderUnifiedSvg } from '@macrix-technology-group/bpmn-forge';
```

Pin to a tag (`#0.2.0`) — never to `main` — so a future commit on `main` doesn't silently change your dependency.

---

## 1. Prerequisites

| Requirement | Why |
|---|---|
| **Node.js ≥ 20** | The library is ESM-only and uses `node:` built-ins. |
| **npm ≥ 9** | Comes with Node 20. Yarn / pnpm work too (see below). |
| **git CLI** in `PATH` | npm shells out to `git` to fetch the repo. |
| **GitHub access** | The repo is currently **public**, so no token is needed. If it's later made private, see [Private-repo auth](#private-repo-auth) below. |

Check your versions:

```bash
node --version   # v20.x or higher
npm --version    # 9.x or higher
git --version    # any modern git
```

---

## 2. Create a fresh consumer project (skip if you already have one)

```bash
mkdir my-bpmn-app && cd my-bpmn-app
npm init -y
npm pkg set type=module           # bpmn-forge is ESM; consumer must be ESM too
```

If your consumer is **TypeScript / Next.js / Vite / etc.**, you almost certainly already have ESM enabled. You can skip the `npm pkg set type=module` step.

---

## 3. Install from GitHub

Pick one of these patterns. The first is recommended.

### A. Pin to a release tag (recommended)

```bash
npm install "git+https://github.com/Macrix-Technology-Group/bpmn-forge.git#0.2.0"
```

`#0.2.0` is the git ref to check out. Released tags are listed at <https://github.com/Macrix-Technology-Group/bpmn-forge/tags>.

This is **reproducible**: re-running `npm install` always pulls the same code.

### B. Pin to a commit SHA (also reproducible)

```bash
npm install "git+https://github.com/Macrix-Technology-Group/bpmn-forge.git#74c03a8"
```

Use the full SHA from `git log` if you want bit-for-bit pinning without depending on a movable tag.

### C. Track `main` (NOT recommended)

```bash
npm install "git+https://github.com/Macrix-Technology-Group/bpmn-forge.git"
```

Don't do this for production. `npm install` may still resolve to a different commit later, and `npm ci` won't help because the `package-lock.json` records the commit but you'll never know when to bump it.

### What ends up in `node_modules/`

When you install from git, npm clones the repo, runs the equivalent of `npm pack`, and installs the resulting tarball. The package's `"files"` allowlist (`src/`, `schemas/`, `README.md`) is respected, so you do **not** get `tests/`, `output/`, `reports/`, `docs/`, or `examples/`.

Verify:

```bash
ls node_modules/@macrix-technology-group/bpmn-forge
# expected: package.json  src/  schemas/  README.md
```

---

## 4. Use it

### Minimal Node.js example

Save as `index.js`:

```js
import fs from 'node:fs';
import {
  importBpmnXml,
  renderUnifiedSvg,
  validateIr,
  runVerifiedRender
} from '@macrix-technology-group/bpmn-forge';

// XML → IR
const xml = fs.readFileSync('process.bpmn', 'utf8');
const ir = importBpmnXml(xml);

// IR validation
const validation = validateIr(ir);
console.log('valid:', validation.ok, 'warnings:', validation.warnings.length);

// IR → SVG (auto-picks ELK or swimlane renderer)
const { mode, svg } = await renderUnifiedSvg(ir);
fs.writeFileSync('process.svg', svg);
console.log(`rendered (${mode}) → process.svg`);

// Or: full XML → verified SVG in one call
const result = await runVerifiedRender(xml);
console.log('roundtrip pass:', result.report.pass);
```

Run:

```bash
node index.js
```

### Next.js / TS web app example

```ts
// app/api/render/route.ts
import { importBpmnXml, renderUnifiedSvg, type BpmnIr } from '@macrix-technology-group/bpmn-forge';

export async function POST(req: Request) {
  const xml = await req.text();
  const ir: BpmnIr = importBpmnXml(xml);
  const { svg } = await renderUnifiedSvg(ir);
  return new Response(svg, {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8' }
  });
}
```

### TypeScript support

From **0.2.0** onwards, types ship with the package — `package.json` exports a `types` condition pointing at `src/index.d.ts`. You get autocomplete and type errors automatically with `moduleResolution: "bundler"` or `"node16"` / `"nodenext"`. No `@types/...` package or local ambient declaration needed.

The .d.ts covers:

- IR core types: discriminated `Node` union (`EventNode` | `TaskNode` | `GatewayNode` | `SubprocessNode`) with subtype + event-definition string-literal unions, `Edge` with `branch_type`, `Participant` / `Lane`, `MessageFlow`, `DataObject`, `DataAssociation`.
- Function signatures for all 25 public exports.
- Return shapes for `validateIr`, `verifyIr`, `runVerifiedRender`, `coverage`, `buildExecutionManifest`, `irToElsaWorkflow`.

Reference-model and simulator state objects (`adaptIrToReferenceModelV26`, `simulateStrongExecution*`, `simulateTokenFlow`) are typed loosely as `Record<string, unknown>` for now — those subsystems are still evolving.

### Public API surface

These named exports are stable and safe to import from the package root:

| Group | Exports |
|---|---|
| **BPMN XML I/O** | `importBpmnXml`, `exportBpmnXml`, `exportBpmnXmlWithDi`, `importExtendedBpmnXml`, `importUnifiedBpmnXml` |
| **IR shaping & validation** | `normalizeIr`, `validateIr`, `semanticDiff`, `coverage`, `confidence` |
| **Rendering** | `renderElkSvg`, `renderSwimlaneSvg`, `renderUnifiedSvg` |
| **Verification pipeline** | `verifyIr`, `runVerifiedRender` |
| **Text → IR** | `textToIr`, `textToIrWithLlm` |
| **Execution exporters** | `buildExecutionManifest`, `irToElsaWorkflow` |
| **Reference model & semantics** | `adaptIrToReferenceModelV26`, `validateExecutionSemanticsReadiness`, `simulateStrongExecution`, `simulateStrongExecutionFromIr`, `simulateTokenFlow` |

**Do NOT** import deep paths like `@macrix-technology-group/bpmn-forge/src/svgPrimitives.js`. Internal modules are not part of the public API and will change without notice.

---

## 5. Updating to a new version

Bump the tag in your `package.json` `dependencies`, then reinstall:

```jsonc
// package.json
{
  "dependencies": {
    "@macrix-technology-group/bpmn-forge":
      "git+https://github.com/Macrix-Technology-Group/bpmn-forge.git#0.2.0"
  }
}
```

```bash
npm install
```

Commit the resulting `package-lock.json` change so collaborators pick up the same version.

---

## 6. yarn / pnpm

```bash
# yarn
yarn add "@macrix-technology-group/bpmn-forge@git+https://github.com/Macrix-Technology-Group/bpmn-forge.git#0.2.0"

# pnpm
pnpm add "github:Macrix-Technology-Group/bpmn-forge#0.2.0"
```

---

## Private-repo auth

The repo is currently **public**, so this section doesn't apply. Skip unless ownership flips it private later.

If it becomes private, you have two options:

### Option A — SSH

```bash
npm install "git+ssh://git@github.com/Macrix-Technology-Group/bpmn-forge.git#0.2.0"
```

Requires your SSH key to be authorized on the org and `ssh-agent` running. CI runners need a deploy key.

### Option B — HTTPS with PAT

```bash
# locally
git config --global url."https://YOUR_PAT@github.com/".insteadOf "https://github.com/"
npm install "git+https://github.com/Macrix-Technology-Group/bpmn-forge.git#0.2.0"
```

For CI, set `GITHUB_TOKEN` (or a fine-grained PAT with `Contents: read` on the repo) and use the same `insteadOf` trick in the workflow.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Error [ERR_REQUIRE_ESM]: require() of ES Module …` | Your consumer is CommonJS. Either set `"type": "module"` in `package.json`, rename the importing file to `.mjs`, or use a dynamic `await import(...)`. |
| `Cannot find package '@macrix-technology-group/bpmn-forge'` | The install probably failed silently. Re-run `npm install` and watch for git/network errors. |
| `npm ERR! 404` on git URL | Check the spelling of the org/repo name and the tag (`#0.2.0`). Tags are at <https://github.com/Macrix-Technology-Group/bpmn-forge/tags>. |
| `Permission denied (publickey)` | Repo flipped private and your SSH key isn't authorized. See [Private-repo auth](#private-repo-auth). |
| `elkjs` errors at runtime in the browser | `bpmn-forge` is intended to run in **Node** (server-side / API routes / Node CLIs). Do not import it from a Vite/Next.js client component — call it from a route handler / server action and ship the resulting SVG to the client. |

---

## Further reading

- Tags / releases: <https://github.com/Macrix-Technology-Group/bpmn-forge/tags>
- Repo: <https://github.com/Macrix-Technology-Group/bpmn-forge>
- IR JSON Schema: `node_modules/@macrix-technology-group/bpmn-forge/schemas/bpmn-ir.schema.json`
