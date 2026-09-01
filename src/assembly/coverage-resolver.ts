export const ASSEMBLY_STATUS = "CANDIDATE_DRAFT  NOT ADMITTED" as const;

export const CANDIDATE_FIELDS = [
  ["canonical_definition", "Canonical Definition"],
  ["semantic_meaning_and_boundaries", "Semantic Meaning and Boundaries"],
  ["aliases_and_related_terms", "Aliases and Related Terms"],
  ["axioms_and_dependencies", "Axioms and Dependencies"],
  ["math_0_translation_layer", "Math 0 Translation Layer"],
  ["formal_mathematics", "Formal Mathematics"],
  ["symbols_and_notation", "Symbols and Notation"],
  ["derivations_and_laws", "Derivations and Laws"],
  ["theological_meaning", "Theological Meaning"],
  ["scripture_anchors", "Scripture Anchors"],
  ["physics_interpretation", "Physics Interpretation"],
  ["empirical_content_and_limits", "Empirical Content and Limits"],
  ["formal_lean_references", "Formal / Lean References"],
  ["bridge_claims", "Bridge Claims"],
  ["anti_terms", "Anti-terms"],
  ["drift_gates_and_kill_conditions", "Drift Gates and Kill Conditions"],
  ["historical_scientific_comparison", "Historical / Scientific Comparison"],
  ["objections_and_alternatives", "Objections and Alternatives"],
  ["open_research_questions", "Open Research Questions"],
  ["mermaid_diagrams", "Mermaid Diagrams"],
  ["truth_predicates_and_why_closure", "Truth Predicates and Why-Closure"]
] as const;

export type CandidateField = typeof CANDIDATE_FIELDS[number][0];
export type CoverageStatus = "PRESENT" | "RECOVERABLE" | "CONFLICT" | "PROPOSED" | "NOT_APPLICABLE" | "OPEN" | "MISSING";
export type SourceType = "current_note" | "sidecar" | "sibling" | "parent_index" | "registry" | "dependency" | "receipt" | "ai_proposal";
export type Operation = "copied" | "normalized" | "translated" | "inferred" | "proposed";

export interface SourceSpan { heading: string; line_start: number; line_end: number; exact_quotation: string; }
export interface FieldProvenance {
  field: CandidateField; value: string; source_type: SourceType; source_path: string;
  source_hash: string; source_span: SourceSpan; operation: Operation;
  confidence: "high" | "medium" | "low"; conflicts: string[]; human_ruling_required: true;
  provenance_failure?: string;
}
export interface AssemblySource {
  path: string; content: string; hash: string; sourceType: Exclude<SourceType, "ai_proposal">;
  stableObjectId?: string; declaredByCurrentNote?: boolean; immutable?: boolean;
}
export interface FieldCoverage { field: CandidateField; label: string; status: CoverageStatus; yours?: FieldProvenance; candidates: FieldProvenance[]; recommendation?: string; }
export interface AssemblyLedger {
  schema_version: "candidate-assembly/1.0.0"; status_label: typeof ASSEMBLY_STATUS; source_note: string;
  source_hash: string; created_at: string; stage_1_policy: "SOURCE_CONTENT_ONLY_NO_INHERITED_METADATA";
  inherited_labels_revealed_during_discovery: false; fields: FieldCoverage[];
  summary: Partial<Record<CoverageStatus, number>>; admission_event_reference: null;
  canonical_admission_performed: false; source_modified: false; human_ruling_required: true;
  [key: string]: unknown;
}
export type ProposalProvider = (field: CandidateField, label: string, currentContent: string) => Promise<string | null>;

const headingAliases: Record<CandidateField, string[]> = Object.fromEntries(CANDIDATE_FIELDS.map(([id, label]) => [id, [label.toLowerCase(), id.replace(/_/g, " ")]])) as Record<CandidateField, string[]>;
headingAliases.math_0_translation_layer.push("math 0", "translation layer");
headingAliases.truth_predicates_and_why_closure.push("why-closure", "why closure", "truth predicates");
headingAliases.formal_lean_references.push("lean references", "formal references");

export function neutralizeForDiscovery(markdown: string): string {
  let section = 0;
  return markdown
    .replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^#{1,6}\s+.*$/gm, () => `SECTION_${String(++section).padStart(3, "0")}`)
    .trim();
}

export function stageOneContainsInheritedLabels(markdown: string): boolean {
  const neutral = neutralizeForDiscovery(markdown);
  return /(^|\W)(proof_label|canonical_status|admission_status|inheritedClassification|domain:|object_type:)(\W|$)/i.test(neutral);
}

interface RecoveredSection { heading: string; body: string; start: number; end: number; quotation?: string; operation?: Operation; }
function sections(content: string): RecoveredSection[] {
  const lines = content.split(/\r?\n/); const found: Array<{ heading: string; body: string; start: number; end: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(lines[i]); if (!match) continue;
    let end = i + 1; while (end < lines.length && !/^#{1,6}\s+/.test(lines[end])) end++;
    const bodyLines = lines.slice(i + 1, end); const first = bodyLines.findIndex((line) => line.trim().length > 0);
    if (first < 0) continue; let last = bodyLines.length - 1; while (last >= 0 && !bodyLines[last].trim()) last--;
    found.push({ heading: match[2].trim(), body: bodyLines.slice(first, last + 1).join("\n").trim(), start: i + 2 + first, end: i + 1 + last });
  }
  return found;
}

function structuredSections(content: string): RecoveredSection[] {
  const lines = content.split(/\r?\n/); const found: RecoveredSection[] = [];
  for (let index = 0; index < lines.length; index++) {
    const match = /^(\s*)["']?([A-Za-z0-9_ /-]+)["']?\s*:\s*(.*)$/.exec(lines[index]); if (!match) continue;
    const key = match[2].trim(); const field = CANDIDATE_FIELDS.find(([id]) => matches(id, key)); if (!field) continue;
    const indent = match[1].length; let end = index + 1;
    while (end < lines.length) {
      const next = /^(\s*)["']?[A-Za-z0-9_ /-]+["']?\s*:/.exec(lines[end]); if (next && next[1].length <= indent) break;
      if (/^\s*[}\]]\s*,?\s*$/.test(lines[end]) && lines[end].search(/\S/) <= indent) break; end++;
    }
    const quoteLines = lines.slice(index, Math.max(index + 1, end)); const rawValue = [match[3], ...quoteLines.slice(1)].join("\n").replace(/,\s*$/, "").trim();
    let value = rawValue; try { value = typeof JSON.parse(rawValue) === "string" ? JSON.parse(rawValue) as string : JSON.stringify(JSON.parse(rawValue), null, 2); } catch { value = rawValue.replace(/^['"]|['"]$/g, "").trim(); }
    if (value) found.push({ heading: key, body: value, start: index + 1, end: Math.max(index + 1, end), quotation: quoteLines.join("\n"), operation: "normalized" });
  }
  return found;
}

function sourceSections(source: AssemblySource): RecoveredSection[] {
  const markdown = sections(source.content); return /\.(json|ya?ml)$/i.test(source.path) ? [...markdown, ...structuredSections(source.content)] : markdown;
}

function matches(field: CandidateField, heading: string): boolean { const value = heading.toLowerCase().replace(/_/g, " ").replace(/[*`]/g, "").trim(); return headingAliases[field].some((alias) => value === alias || value.startsWith(`${alias} `)); }
function provenance(field: CandidateField, source: AssemblySource, section: RecoveredSection, operation: Operation = section.operation ?? "copied"): FieldProvenance {
  return { field, value: section.body, source_type: source.sourceType, source_path: source.path, source_hash: source.hash,
    source_span: { heading: section.heading, line_start: section.start, line_end: section.end, exact_quotation: section.quotation ?? section.body },
    operation, confidence: operation === "copied" ? "high" : "low", conflicts: [], human_ruling_required: true };
}
const order: SourceType[] = ["current_note", "sidecar", "sibling", "parent_index", "registry", "dependency", "receipt", "ai_proposal"];

export async function resolveCoverage(current: AssemblySource, sources: AssemblySource[], proposalProvider?: ProposalProvider, now = new Date().toISOString()): Promise<AssemblyLedger> {
  if (current.sourceType !== "current_note") throw new Error("CURRENT_NOTE_REQUIRED");
  const stableId = current.stableObjectId; const allowed = sources.filter((source) => {
    if (source.sourceType === "sibling") return true; // searched for exact named field quotations, never treated as a dependency
    if (source.sourceType === "registry") return Boolean(stableId && source.stableObjectId === stableId);
    if (source.sourceType === "dependency") return source.declaredByCurrentNote === true;
    return true;
  }).sort((a, b) => order.indexOf(a.sourceType) - order.indexOf(b.sourceType) || a.path.localeCompare(b.path));
  const all = [current, ...allowed]; const fields: FieldCoverage[] = [];
  for (const [field, label] of CANDIDATE_FIELDS) {
    const currentMatches = sourceSections(current).filter((section) => matches(field, section.heading)).map((section) => provenance(field, current, section));
    if (currentMatches.length) { fields.push({ field, label, status: "PRESENT", yours: currentMatches[0], candidates: [] }); continue; }
    const candidates = all.slice(1).flatMap((source) => sourceSections(source).filter((section) => matches(field, section.heading)).map((section) => provenance(field, source, section)));
    const unique = [...new Map(candidates.map((item) => [item.value.trim(), item])).values()];
    if (unique.length > 1) {
      const paths = unique.map((item) => item.source_path); unique.forEach((item) => { item.conflicts = paths.filter((path) => path !== item.source_path); });
      fields.push({ field, label, status: "CONFLICT", candidates: unique, recommendation: "Human ruling required: compare every preserved version; none was selected." }); continue;
    }
    if (unique.length === 1) { fields.push({ field, label, status: "RECOVERABLE", candidates: unique }); continue; }
    const proposal = proposalProvider ? await proposalProvider(field, label, current.content) : null;
    if (proposal?.trim()) {
      fields.push({ field, label, status: "PROPOSED", candidates: [{ field, value: proposal.trim(), source_type: "ai_proposal", source_path: "provider://active", source_hash: "sha256:" + "0".repeat(64), source_span: { heading: label, line_start: 0, line_end: 0, exact_quotation: "" }, operation: "proposed", confidence: "low", conflicts: [], human_ruling_required: true }] });
    } else fields.push({ field, label, status: field === "open_research_questions" ? "OPEN" : "MISSING", candidates: [] });
  }
  const summary: Partial<Record<CoverageStatus, number>> = {}; for (const field of fields) summary[field.status] = (summary[field.status] ?? 0) + 1;
  return { schema_version: "candidate-assembly/1.0.0", status_label: ASSEMBLY_STATUS, source_note: current.path, source_hash: current.hash, created_at: now, stage_1_policy: "SOURCE_CONTENT_ONLY_NO_INHERITED_METADATA", inherited_labels_revealed_during_discovery: false, fields, summary, admission_event_reference: null, canonical_admission_performed: false, source_modified: false, human_ruling_required: true };
}

export function verifyAssemblySources(ledger: AssemblyLedger, available: Map<string, { content: string; hash: string }>): AssemblyLedger {
  const copy = structuredClone(ledger);
  for (const field of copy.fields) for (const item of [...(field.yours ? [field.yours] : []), ...field.candidates]) {
    if (item.source_type === "ai_proposal") continue; const source = available.get(item.source_path);
    if (!source) item.provenance_failure = "SOURCE_MISSING_OR_MOVED";
    else if (source.hash !== item.source_hash) item.provenance_failure = "SOURCE_HASH_MISMATCH";
    else if (!source.content.includes(item.source_span.exact_quotation)) item.provenance_failure = "SOURCE_SPAN_NOT_FOUND";
  }
  return copy;
}

export function mergeAssemblyLedger<T extends Record<string, unknown>>(record: T, ledger: AssemblyLedger): T & { assemblyLedger: AssemblyLedger } {
  if (record.workflowState === "Admitted" || record.admissionEventReference) throw new Error("ASSEMBLY_CANNOT_CREATE_ADMISSION");
  return { ...structuredClone(record), assemblyLedger: structuredClone(ledger), workflowState: (record.workflowState ?? "Candidate"), admissionEventReference: null } as T & { assemblyLedger: AssemblyLedger };
}
