// Type declarations for @macrix-technology-group/bpmn-forge.
//
// These mirror the public API surface re-exported from src/index.js. The
// runtime is loosely typed JavaScript, so a few payload-shaped objects
// (reference-model output, simulator state, edge/node `data` blobs) are
// declared as Record<string, unknown> rather than fully nailed down.
// PRs welcome to tighten any of those.

// ─── IR core types ────────────────────────────────────────────────────────

export type NodeType = 'event' | 'task' | 'gateway' | 'subprocess';

export type EventSubtype =
  | 'start'
  | 'end'
  | 'intermediate_catch'
  | 'intermediate_throw'
  | 'boundary';

export type EventDefinition =
  | 'message'
  | 'timer'
  | 'terminate'
  | 'signal'
  | 'error'
  | 'escalation'
  | 'cancel'
  | 'compensation'
  | 'conditional'
  | 'link';

export type TaskSubtype =
  | 'user'
  | 'service'
  | 'send'
  | 'receive'
  | 'script'
  | 'manual'
  | 'business_rule';

export type GatewaySubtype =
  | 'exclusive'
  | 'parallel'
  | 'inclusive'
  | 'complex'
  | 'event_based'
  | 'instantiating_event_based_exclusive'
  | 'instantiating_event_based_parallel';

export type GatewayDirection = 'diverging' | 'converging' | 'mixed';

export type BranchType = 'main' | 'alternative' | 'exception' | 'loop';

export interface ExecutionMeta {
  handler?: string;
  formKey?: string;
  [key: string]: unknown;
}

interface BaseNode {
  id: string;
  name?: string;
  documentation?: string;
  execution?: ExecutionMeta;
  [key: string]: unknown;
}

export interface EventNode extends BaseNode {
  type: 'event';
  subtype: EventSubtype;
  event_definition?: EventDefinition;
  /** For boundary events: the host activity's id. */
  attachedTo?: string;
  /** For boundary events: false → non-interrupting (dashed). */
  interrupting?: boolean;
}

export interface TaskNode extends BaseNode {
  type: 'task';
  subtype?: TaskSubtype;
  loop?: { type: 'standard' | 'multi_instance'; isSequential?: boolean };
}

export interface GatewayNode extends BaseNode {
  type: 'gateway';
  subtype: GatewaySubtype;
  gateway?: {
    direction?: GatewayDirection;
    default_flow?: string;
  };
}

export interface SubprocessNode extends BaseNode {
  type: 'subprocess';
  subtype?: 'embedded' | 'event' | 'transaction' | 'ad_hoc';
  triggeredByEvent?: boolean;
  /** Nested process content if expanded inline. */
  process?: Process;
}

export type Node = EventNode | TaskNode | GatewayNode | SubprocessNode;

export interface Edge {
  id: string;
  source: string;
  target: string;
  name?: string;
  condition?: string;
  branch_type?: BranchType;
  isDefault?: boolean;
  [key: string]: unknown;
}

export interface Lane {
  id: string;
  name?: string;
  nodeRefs: string[];
}

export interface Participant {
  id: string;
  name?: string;
  /** Process id this participant references (omitted for black-box pools). */
  processRef?: string;
  /** Mark a participant as a black-box pool (rendered as a labeled rectangle). */
  isBlackBox?: boolean;
  lanes?: Lane[];
}

export interface MessageFlow {
  id: string;
  name?: string;
  /** Node id OR participant id (for black-box pool endpoints). */
  source: string;
  /** Node id OR participant id (for black-box pool endpoints). */
  target: string;
}

export interface DataObject {
  id: string;
  name?: string;
  type?: 'dataObject' | 'dataObjectReference' | 'dataStoreReference';
  ref?: string | null;
}

export interface DataAssociation {
  id: string;
  source: string;
  target: string;
  direction?: 'in' | 'out' | 'undirected';
}

export interface Process {
  id: string;
  name?: string;
  isExecutable?: boolean;
  nodes: Node[];
  edges: Edge[];
  participants?: Participant[];
  message_flows?: MessageFlow[];
  data_objects?: DataObject[];
  data_associations?: DataAssociation[];
  [key: string]: unknown;
}

export interface BpmnIr {
  process: Process;
  [key: string]: unknown;
}

// ─── BPMN XML I/O ─────────────────────────────────────────────────────────

export function importBpmnXml(xml: string): BpmnIr;
export function importExtendedBpmnXml(xml: string): BpmnIr;
export function importUnifiedBpmnXml(
  xml: string,
  options?: Record<string, unknown>
): BpmnIr;

export interface ExportBpmnOptions {
  /** Include BPMN DI graphical info. Default: false. */
  withDi?: boolean;
  [key: string]: unknown;
}
export function exportBpmnXml(ir: BpmnIr, options?: ExportBpmnOptions): string;
export function exportBpmnXmlWithDi(ir: BpmnIr): string;

// ─── IR shaping & validation ──────────────────────────────────────────────

export function normalizeIr(ir: BpmnIr): BpmnIr;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
export function validateIr(ir: BpmnIr): ValidationResult;

export type DiffEntry =
  | { object: 'node' | 'edge'; id: string; issue: 'lost' | 'added' }
  | {
      object: 'node' | 'edge';
      id: string;
      field: string;
      before: unknown;
      after: unknown;
    };
export function semanticDiff(before: BpmnIr, after: BpmnIr): DiffEntry[];

export interface CoverageReport {
  nodes: number;
  edges: number;
  semanticPenalty: number;
  /** Aggregate score in [0, 1]. */
  total: number;
}
export function coverage(
  before: BpmnIr,
  after: BpmnIr,
  diffs?: DiffEntry[]
): CoverageReport;

export function confidence(coverage: CoverageReport, warnings?: string[]): number;

// ─── Rendering ────────────────────────────────────────────────────────────

export function renderSvg(ir: BpmnIr, report?: Record<string, unknown>): string;

export interface RenderOptions {
  [key: string]: unknown;
}
export function renderElkSvg(ir: BpmnIr, options?: RenderOptions): Promise<string>;
export function renderSwimlaneSvg(ir: BpmnIr): Promise<string>;

export type UnifiedRenderMode = 'elk' | 'swimlanes' | 'plain';
export interface UnifiedRenderOptions {
  /**
   * Force a renderer. If omitted, swimlanes is chosen when participants have
   * lanes, otherwise the flat ELK renderer.
   */
  mode?: UnifiedRenderMode;
}
export interface UnifiedRenderResult {
  mode: 'elk' | 'swimlanes';
  svg: string;
}
export function renderUnifiedSvg(
  ir: BpmnIr,
  options?: UnifiedRenderOptions
): Promise<UnifiedRenderResult>;

// ─── Verification pipeline ────────────────────────────────────────────────

export interface VerifyOptions {
  /** Require coverage.total === 1 for `report.pass` to be true. */
  strict?: boolean;
}

export interface VerifyReport {
  pass: boolean;
  strict: boolean;
  coverage: CoverageReport;
  confidence: number;
  diffCount: number;
  diffs: DiffEntry[];
  validation1: ValidationResult;
  validation2: ValidationResult;
}

export interface VerifyResult {
  normalized: BpmnIr;
  exported: string;
  reimported: BpmnIr;
  report: VerifyReport;
}
export function verifyIr(ir: BpmnIr, options?: VerifyOptions): VerifyResult;

export interface VerifiedRenderResult extends VerifyResult {
  imported: BpmnIr;
  svg: string;
}
export function runVerifiedRender(
  xml: string,
  options?: VerifyOptions
): VerifiedRenderResult;

// ─── Text → IR ────────────────────────────────────────────────────────────

export interface TextToIrOptions {
  [key: string]: unknown;
}
export function textToIr(text: string, options?: TextToIrOptions): BpmnIr;

export interface TextToIrLlmOptions {
  /** Override the Anthropic model. Falls back to ANTHROPIC_MODEL env var. */
  model?: string;
  [key: string]: unknown;
}
export function textToIrWithLlm(
  text: string,
  options?: TextToIrLlmOptions
): Promise<BpmnIr>;

// ─── Execution exporters ──────────────────────────────────────────────────

export interface ExecutionHandlerEntry {
  nodeId: string;
  name?: string;
  type: NodeType;
  subtype?: string;
  handler?: string;
  formKey?: string;
  [key: string]: unknown;
}

export interface ExecutionManifest {
  processId: string;
  processName?: string;
  isExecutable: boolean;
  handlers: ExecutionHandlerEntry[];
  serviceTasks: ExecutionHandlerEntry[];
  userTasks: Array<{ nodeId: string; name?: string; [key: string]: unknown }>;
  edges: Edge[];
}
export function buildExecutionManifest(ir: BpmnIr): ExecutionManifest;

export interface ElsaActivity {
  id: string;
  type: string;
  displayName?: string;
  properties: Record<string, unknown>;
}
export interface ElsaConnection {
  id: string;
  source: string;
  target: string;
  outcome: string;
  metadata: { branchType?: BranchType; isDefault: boolean };
}
export interface ElsaWorkflow {
  id: string;
  name?: string;
  version: number;
  activities: ElsaActivity[];
  connections: ElsaConnection[];
}
export function irToElsaWorkflow(ir: BpmnIr): ElsaWorkflow;

// ─── Reference model & execution semantics ────────────────────────────────
//
// The reference model and simulator state objects are large, evolving
// structures. Typed loosely here; tighten as the surface stabilises.

export interface ReferenceModelV26 {
  modelType: 'BPMN_REFERENCE_MODEL';
  version: string;
  [key: string]: unknown;
}
export function adaptIrToReferenceModelV26(ir: BpmnIr): ReferenceModelV26;

export function validateExecutionSemanticsReadiness(
  refModel: ReferenceModelV26
): ValidationResult;

export interface ExecutionStateBase {
  trace: Array<Record<string, unknown>>;
  tokens: Array<{ id: string; state: string; [key: string]: unknown }>;
  incidents: Array<{ severity: 'error' | 'warning' | 'info'; [key: string]: unknown }>;
  [key: string]: unknown;
}
export interface SimulatorOptions {
  maxSteps?: number;
  [key: string]: unknown;
}
export function simulateStrongExecution(
  refModel: ReferenceModelV26,
  options?: SimulatorOptions
): ExecutionStateBase;
export function simulateStrongExecutionFromIr(
  ir: BpmnIr,
  options?: SimulatorOptions
): ExecutionStateBase;

export interface TokenSimulationState {
  trace: Array<Record<string, unknown>>;
  tokens: Array<Record<string, unknown>>;
  [key: string]: unknown;
}
export function simulateTokenFlow(
  refModel: ReferenceModelV26,
  options?: SimulatorOptions
): TokenSimulationState;
