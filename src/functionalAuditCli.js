import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredFiles = [
  "src/textToIrParser.js",
  "src/textToIrLlmParser.js",
  "src/structuredOutputSchema.js",
  "src/bpmnXmlImporter.js",
  "src/bpmnXmlExporter.js",
  "src/extendedBpmnParser.js",
  "src/extendedBpmnImport.js",
  "src/bpmndiExporter.js",
  "src/swimlaneSvgRenderer.js",
  "src/elkSvgRenderer.js",
  "src/unifiedBpmnImporter.js",
  "src/unifiedRenderer.js",
  "src/executionManifest.js",
  "src/elsaWorkflowGenerator.js",
  "src/camundaBpmnCli.js",
  "docs/FEATURE_MATRIX.md",
  "docs/CHANGES_v23.md",
  "docs/CHANGES_v24.md"
];
const requiredScripts = [
  "text",
  "text:llm",
  "xml:import",
  "xml:export",
  "xml:di:export",
  "xml:di:import",
  "render",
  "render:elk:real",
  "render:swimlanes",
  "render:unified",
  "render:unified:xml",
  "verify",
  "execution:all",
  "import:unified",
  "audit:functional"
];

const files = requiredFiles.map(file => ({ file, exists: fs.existsSync(file) }));
const scripts = requiredScripts.map(script => ({ script, exists: Boolean(pkg.scripts?.[script]), command: pkg.scripts?.[script] || null }));

const integrationChecks = [
  {
    name: 'unified importer uses extended importer',
    ok: fs.existsSync('src/unifiedBpmnImporter.js') && fs.readFileSync('src/unifiedBpmnImporter.js','utf8').includes('importExtendedBpmnXml')
  },
  {
    name: 'unified renderer uses swimlane renderer',
    ok: fs.existsSync('src/unifiedRenderer.js') && fs.readFileSync('src/unifiedRenderer.js','utf8').includes('renderSwimlaneSvg')
  },
  {
    name: 'unified renderer uses elk renderer',
    ok: fs.existsSync('src/unifiedRenderer.js') && fs.readFileSync('src/unifiedRenderer.js','utf8').includes('renderElkSvg')
  },
  {
    name: 'functional audit script is wired',
    ok: Boolean(pkg.scripts?.['audit:functional'])
  }
];

const missingFiles = files.filter(x => !x.exists);
const missingScripts = scripts.filter(x => !x.exists);
const failedIntegration = integrationChecks.filter(x => !x.ok);

const report = {
  ok: missingFiles.length === 0 && missingScripts.length === 0 && failedIntegration.length === 0,
  missingFiles,
  missingScripts,
  failedIntegration,
  files,
  scripts,
  integrationChecks
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 2;

// v25 note: reference layer is audited by npm run reference:all and verify:v25.
