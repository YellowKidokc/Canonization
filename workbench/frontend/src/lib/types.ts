/** API response types — mirrors backend/app/schemas.py. The backend is the authority. */

export interface Me {
  user: string;
  postgres_version?: string;
}

export interface SourceAnchor {
  exact_quote: string;
  start_line?: number | null;
  end_line?: number | null;
}

export interface Source {
  id: string;
  original_filename: string;
  source_url: string | null;
  source_type: string;
  original_location: string | null;
  sha256: string;
  imported_by: string;
  author: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  source_id: string;
  status: string;
  stage: string | null;
  error_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobDetail extends Job {
  receipt: Record<string, unknown>;
}

export interface ModelRun {
  id: string;
  call_number: number;
  provider: string;
  model: string;
  tokens_used: number | null;
  latency_ms: number | null;
  succeeded: boolean;
  created_at: string;
}

export interface FailureReceipt {
  id: string;
  job_id: string | null;
  model_run_id: string | null;
  error_class: string;
  detail: Record<string, unknown>;
  created_at: string;
}

export interface GovernedBase {
  id: string;
  canon_status: string;
  version: number;
  source_id: string | null;
  source_anchor: SourceAnchor | null;
  provenance: Record<string, unknown>;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Question extends GovernedBase {
  exact_question: string;
  question_type: string;
  why_pressure: string | null;
  importance: string;
  answer_status: string;
  job_id: string | null;
}

export interface Claim extends GovernedBase {
  exact_claim: string;
  plain_language: string | null;
  claim_mode: string | null;
  job_id: string | null;
}

export interface Statement extends GovernedBase {
  exact_statement: string;
  plain_meaning: string | null;
  statement_mode: string;
  scope: string | null;
  assumptions: unknown[];
  confidence_vector: Record<string, unknown>;
  verification_status: string;
  contradiction_status: string;
  job_id: string | null;
}

export interface BurdenEntry {
  state: string;
  rationale?: string | null;
  detail?: Record<string, unknown>;
}

export interface AlternativeEntry {
  explanation: string;
  status: string;
  note?: string | null;
}

export interface Evidence extends GovernedBase {
  title: string;
  evidence_class: string;
  epistemic_source_class: string;
  summary: string | null;
  distance: string | null;
  relation_to_target: string | null;
  uncertainty_type: string | null;
  sampling_regime: string | null;
  selection_timing: string | null;
  hypothesis_timing: string | null;
  replication_status: string | null;
  replication_relation: string | null;
  controls: unknown[];
  alternatives: AlternativeEntry[];
  nine_burden: Record<string, BurdenEntry>;
  fully_opened: boolean;
  quality_vector: Record<string, unknown>;
}

export interface EvidenceEdge {
  id: string;
  evidence_id: string;
  target_statement_id: string | null;
  target_claim_id: string | null;
  bearing: string;
  directness: string | null;
  relevant_rival: string | null;
  expected_under_target: string | null;
  expected_under_rival: string | null;
  discrimination: string | null;
  dependency: string | null;
  applicable_scope: string | null;
  strength: string | null;
  residual_ambiguity: string | null;
  human_ruling: string | null;
  admitted: boolean;
  created_at: string;
}

export interface Commons extends GovernedBase {
  content: string;
  tags: unknown[];
  possible_relationships: unknown[];
  ratings: Record<string, unknown>;
  unresolved_questions: unknown[];
  unclassified_reason: string;
  promotion_eligibility: string;
}

export interface Prediction {
  id: string;
  exact_prediction: string;
  parent_statement_id: string | null;
  parent_claim_id: string | null;
  registered_at: string;
  expected_observation: string | null;
  conditions: string | null;
  timeframe: string | null;
  competing_predictions: unknown[];
  confirmation_condition: string | null;
  weakening_condition: string | null;
  falsification_condition: string | null;
  result: string | null;
  status: string;
  prospective: boolean;
  human_ruling: string | null;
  version: number;
  canon_status: string;
  created_at: string;
}

export type RulingDecision = "PROMOTE" | "DEMOTE" | "DEFER" | "REJECT" | "SUPERSEDE" | "EDIT" | "RESTORE";
export type ObjectType = "QUESTION" | "CLAIM" | "TRUE_STATEMENT" | "EVIDENCE" | "DISCOVERY_COMMONS" | "PREDICTION";

export interface Ruling {
  id: string;
  object_type: string;
  object_uuid: string;
  prior_status: string;
  new_status: string;
  decision: string;
  reason: string;
  decided_by: string;
  canon_version: number;
  supporting_objects: unknown[];
  reverses_ruling_id: string | null;
  edit_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface SearchResult {
  object_uuid: string;
  object_type: string;
  title: string;
  snippet: string;
  canon_status: string;
  statement_mode: string | null;
  source_id: string | null;
}

export interface SearchResponse {
  total: number;
  results: SearchResult[];
}

export interface Dashboard {
  sources: number;
  jobs_running: number;
  jobs_failed: number;
  failure_receipts: number;
  rulings_required: number;
  candidates: number;
  canonical: number;
  discovery_commons: number;
  unanswered_questions: number;
  claims_lacking_evidence: number;
  evidence_lacking_edges: number;
  untested_predictions: number;
  active_contradictions: number;
  canon_version: number;
  recent_rulings: Ruling[];
}

export interface GraphNodeData {
  label: string;
  object_type: string;
  canon_status: string;
  color: string;
  statement_mode?: string;
  fully_opened?: boolean;
  status?: string;
  /** xyflow requires Record<string, unknown> node data. */
  [key: string]: unknown;
}

export interface GraphNode {
  id: string;
  type: string;
  data: GraphNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: "solid" | "dashed";
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface JobEvent {
  job_id: string;
  stage: string;
  message: string;
  percent: number;
  ts: string;
}

export interface ExportReceipt {
  id: string;
  kind: string;
  path: string;
  sha256: string;
  object_count: number | null;
  created_at: string;
}

export interface CanonVersion {
  version: number;
  label: string;
  created_at: string | null;
  trigger_ruling_id: string | null;
}

export interface AuditTrail {
  object_uuid: string;
  rulings: Ruling[];
  status_audit: {
    table_name: string;
    old_status: string;
    new_status: string;
    changed_at: string;
    txid: number | string;
  }[];
}

/** Controlled vocabularies from GET /api/vocab — never hardcode options. */
export interface Vocab {
  CANDIDATE_STATUS: string;
  CANON_STATUSES: string[];
  RULING_DECISIONS: RulingDecision[];
  STATEMENT_MODES: string[];
  VERIFICATION_STATUSES: string[];
  CONTRADICTION_STATUSES: string[];
  QUESTION_TYPES: string[];
  ANSWER_STATUSES: string[];
  IMPORTANCE_LEVELS: string[];
  BURDEN_NAMES: string[];
  BURDEN_STATES: string[];
  BURDEN_STATES_REQUIRING_RATIONALE: string[];
  EVIDENCE_CLASSES: string[];
  EPISTEMIC_SOURCE_CLASSES: string[];
  EVIDENCE_DISTANCES: string[];
  RELATIONS_TO_TARGET: string[];
  UNCERTAINTY_TYPES: string[];
  SAMPLING_REGIMES: string[];
  TIMING_OPTIONS: string[];
  HYPOTHESIS_TIMINGS: string[];
  REPLICATION_STATUSES: string[];
  REPLICATION_RELATIONS: string[];
  CONTROL_TYPES: string[];
  ALTERNATIVE_EXPLANATIONS: string[];
  ALTERNATIVE_STATUSES: string[];
  BEARINGS: string[];
  EXPECTED_UNDER_VALUES: string[];
  EDGE_STRENGTHS: string[];
  PREDICTION_STATUSES: string[];
  PROMOTION_ELIGIBILITY: string[];
  SOURCE_TYPES: string[];
  JOB_STATUSES: string[];
  CALL_NUMBERS: number[];
  CONSTRAINT_STATUSES: string[];
  [key: string]: unknown;
}
