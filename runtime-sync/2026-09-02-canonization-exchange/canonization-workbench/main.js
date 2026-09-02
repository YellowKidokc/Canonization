const {
  ItemView,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  MarkdownRenderer,
  normalizePath
} = require("obsidian");
const fs = require("fs");
const nodePath = require("path");
const { Decoration, ViewPlugin } = require("@codemirror/view");
const { RangeSetBuilder } = require("@codemirror/state");

const VIEW_TYPE_CANON = "canonization-workbench";
const VIEW_TYPE_NERVE_BUILDER = "canonization-nerve-builder";
const DEFAULT_SETTINGS = {
  canonRoot: "_CANONICAL",
  engineUrl: "http://127.0.0.1:8765/api",
  semanticRegistryPath: ".obsidian/plugins/semantic-ai/concept-registry.json",
  useSemanticRegistry: true,
  useSemanticCanonization: false,
  // Populate after DEFAULT_CLASSIFICATION_PROFILES has been initialized.
  // Calling cloneClassificationProfiles here executes during module loading
  // while that const is still in its temporal dead zone, preventing Obsidian
  // from enabling the plugin at all.
  classificationProfiles: null,
  activeClassificationProfile: "candidate-pipeline",
  postProcessing: {
    writeJsonReceipts: true,
    writeMarkdownProjections: true,
    postgresHandoff: false
  },
  underlineStatus: "candidate",
  candidateReviewRoot: "notes/AXIOM_CANONIZATION_2026-08-29",
  exchangeCandidateJsonPath: "",
  candidateBatchRoot: "__CANDIDATE_DRAFTS_NOT_ADMITTED",
  nerveBuilderUrl: ".obsidian/plugins/canonization-workbench/nerve/atom-builder.html"
};

const CANDIDATE_STATUS = "CANDIDATE_DRAFT — NOT ADMITTED";
const HUMAN_DECISIONS = ["APPROVE CANDIDATE", "REVISE", "SPLIT", "HOLD OPEN", "WITHDRAW", "REJECT"];

const CANONIZATION_PASSES = {
  discovery: {
    label: "1. Nondiscriminatory discovery",
    instruction: "Run the nondiscriminatory BFP-DG v2.1 discovery routine before classification. Answer Q0-Q18, including atomicity (Q15), assertion-versus-use (Q16), level (Q17), and domain-ablated structure (Q18); extract the three source-grounded truth-predicate blocks; answer B0-B8 independently; and complete the six declared convergence checks. Preserve source wording, paragraph provenance, explicit/inferred/speculative basis, and unanswered fields. Return bfp_dg with one answer record per question; also return truth_statements, exact_negation, countermodels, discriminating_tests, and contradiction_hooks when source-supported. Do not classify, assign a canon rank, choose a register, run Why-Closure, or make an admission claim in this pass. Extract as many positive truth predicates as the source requires. Whole-paper failure modes belong only to the later endcap and are capped at three; do not scatter local critique spam through discovery.",
    lanes: null,
    stage: 1
  },
  classification: {
    label: "2. Classification and burden",
    instruction: "Use the prior BFP-DG v2.1 discovery packet as the source of answers. Map its preserved answers into the v2.1 template without changing wording or basis. Then complete the post-discovery proposal stages: orthogonal structural, epistemic, and register classification; register-native opening; whole-paper rivals/failure endcap of two or three major conditions only; and Why-Closure. If an answer is absent, mark it OPEN rather than inventing it. Do not upgrade any object to proof, evidence, truth, or admission.",
    lanes: null,
    stage: 2
  },
  reconciliation: {
    label: "3. Reconciliation and translation",
    instruction: "Using the prior discovery and classification outputs, reconcile duplicate or overlapping truth-statement candidates without erasing either source. For every retained statement, preserve source span, exact negation where available, qualifiers, dependencies, rival/countermodel, and a contradiction hook suitable for later corpus comparison. Where a cross-register relation is proposed, state source and target, direction, preserved structure, lost structure, reverse-path limits, rivals, and tests. A bridge never propagates proof. Keep unresolved differences OPEN.",
    lanes: null,
    stage: 3
  },
  claims: {
    label: "Claims only",
    instruction: "Prospectively extract every explicit assertion that could possibly enter candidate review, whether or not it is already tagged, canonical, validated, proved, or previously recognized. Decompose the source into the smallest separately judgeable claims. Preserve exact wording, provenance, objections, and OPEN fields. Do not perform broader section completion.",
    lanes: null
  },
  definitions: {
    label: "Define — definitions and boundaries",
    instruction: "Return definition candidates classified by definition category: canonical, native-domain, operational, stipulative, alias, identity condition, inclusion boundary, exclusion boundary, anti-term, ambiguity, definition conflict, or OPEN definition. Preserve the source wording and provenance. Do not resolve ambiguity by guessing, and do not treat a proposed definition as admitted canon.",
    lanes: ["definition"]
  },
  mathematics: {
    label: "Mathematics and notation",
    instruction: "Prospectively extract every explicit mathematical object that could enter candidate review, even when it has no canonization label or prior record. Return equations, symbols, assumptions, domains, units, derivations, and formalization references with proposed_lane exactly mathematical_component. Do not infer theology from mathematics.",
    lanes: ["mathematical_component"]
  },
  theology: {
    label: "Theology and Scripture",
    instruction: "Return only theological declarations, doctrinal identifications, interpretive premises, Scripture anchors, and their boundaries from formal or empirical claims.",
    lanes: ["theological_component", "scripture_anchor"]
  },
  bridges: {
    label: "Bridges and translations",
    instruction: "Return only cross-domain bridges and translations. Name both domains, the map, preserved structure, lost structure, direction, grade, countermodel, and defeat condition. Never propagate proof across a bridge.",
    lanes: ["bridge_claim", "dependency_graph"]
  },
  truth: {
    label: "Truth predicates and Why-Closure",
    instruction: "Return only truth conditions, exact negations, irreversible or defeasible status, countermodels, kill conditions, hidden borrowing, Why-Ladder answers, closure outcome, and next discriminating test.",
    lanes: null,
    requireTruthPredicates: true
  },
  full: {
    label: "Run the three-stage candidate pipeline",
    instruction: "Runs nondiscriminatory discovery, classification and burden, then reconciliation and translation as three separate candidate-only API calls.",
    lanes: null,
    stage: 0
  }
};

// These are editable in the workbench settings and travel as a JSON
// configuration. They are deliberately separate from the resulting candidate
// packets: changing a prompt never rewrites an earlier receipt.
const DEFAULT_CLASSIFICATION_PROFILES = [
  { id: "candidate-pipeline", name: "Three-stage candidate pipeline", mode: "pipeline", enabled: true, semanticCategory: "Canonization", categories: ["Referent", "Identity", "Distinction", "Relation", "Operation", "Dependency", "Constraint", "Invariant", "CollapseCondition", "Consequence", "Representation", "FormalizationBoundary", "OpenQuestion", "Claim", "Definition", "EvidenceUnit", "Proof", "Bridge", "Objection", "Countermodel", "Limitation"], prompt: "Run discovery, classification, and reconciliation as separately receipted candidate-only stages." },
  { id: "claims", name: "Claims and burden", mode: "pass", passId: "claims", enabled: true, semanticCategory: "Canonization", categories: ["Claim", "Premise", "EvidenceUnit", "Observation", "Objection", "Countermodel", "Limitation"], prompt: "Classify the smallest independently gradable assertions and their burden without upgrading warrant." },
  { id: "definitions", name: "Define", mode: "pass", passId: "definitions", enabled: true, semanticCategory: "Canonization", categories: ["CanonicalDefinition", "NativeDomainDefinition", "OperationalDefinition", "StipulativeDefinition", "Alias", "IdentityCondition", "InclusionBoundary", "ExclusionBoundary", "AntiTerm", "Ambiguity", "DefinitionConflict", "OpenDefinition"], prompt: "Classify every definition candidate by definition species. Preserve exact wording, provenance, scope, and unresolved ambiguity; never guess an absent definition or promote a proposal to canon." },
  { id: "mathematics", name: "Mathematics and notation", mode: "pass", passId: "mathematics", enabled: true, semanticCategory: "Canonization", categories: ["Primitive", "Definition", "Assumption", "Dependency", "Derivation", "TheoremCandidate", "FormalizationBoundary"], prompt: "Separate mathematical objects, notation, premises, derivations, and formal boundaries from their interpretation." },
  { id: "theology", name: "Theology and Scripture", mode: "pass", passId: "theology", enabled: true, semanticCategory: "Canonization", categories: ["TheologicalDeclaration", "ScriptureAnchor", "Interpretation", "HistoricalClaim", "Limitation"], prompt: "Keep theological declaration, interpretation, historical support, and formal claims separately addressable." },
  { id: "bridges", name: "Bridges and translation", mode: "pass", passId: "bridges", enabled: true, semanticCategory: "Canonization", categories: ["NativeGrammar", "NeutralForm", "Mapping", "Invariant", "TranslationLoss", "ReverseMap", "RivalMapping", "NegativeControl", "BridgeTest", "DefeatCondition"], prompt: "Treat every bridge as directional and candidate-only; always print preserved and lost structure." },
  { id: "truth", name: "Truth predicates and why closure", mode: "pass", passId: "truth", enabled: true, semanticCategory: "Canonization", categories: ["TruthCondition", "ExactNegation", "Countermodel", "KillCondition", "HiddenBorrowing", "WhyClosure", "OpenQuestion"], prompt: "Record truth conditions and defeat structure without turning an unresolved predicate into a verdict." },
  { id: "formalization", name: "Lean and formalization", mode: "pass", passId: "mathematics", enabled: true, semanticCategory: "Canonization", categories: ["Definition", "Axiom", "Assumption", "LemmaCandidate", "TheoremCandidate", "ProofArtifact", "FormalizationBlocker", "FormalBoundary", "LeanChecked"], prompt: "Identify formalization candidates and proof artifacts. Lean may test conditionals but does not establish theological, historical, empirical, or physical instantiation claims." }
];

function cloneClassificationProfiles(profiles) {
  return (Array.isArray(profiles) ? profiles : DEFAULT_CLASSIFICATION_PROFILES).map((profile) => ({ ...profile, categories: Array.isArray(profile.categories) ? [...profile.categories] : [] }));
}

const PROMPTS = {
  "canonical_definition.md": "Define the term precisely. Distinguish its canonical meaning from aliases, metaphorical uses, and unresolved interpretations.",
  "mathematical_component.md": "Extract only explicit mathematical objects, equations, variables, domains, assumptions, units, and test conditions. Do not infer theological meaning.",
  "theological_layer.md": "Identify the theological definition, its declared source anchors, and the boundary between doctrine, interpretation, and open work.",
  "bridge_claim.md": "State both sides of the proposed correspondence, added premises, bridge grade, limits, and what would break the correspondence.",
  "scripture_anchor.md": "List the specific Scripture anchors and explain their role without treating a citation alone as proof of a scientific claim.",
  "axiom_dependency.md": "Identify only explicit prerequisite axioms and direction of dependency. Mark missing evidence UNKNOWN.",
  "kill_condition.md": "State conditions that would limit, falsify, or require revision of the formal or bridge claim. Preserve UNKNOWN where no honest condition is available.",
  "external_objection.md": "Propose sourced objections, their scope, and limits. Keep quotations and provenance visible for review.",
  "related_term_discovery.md": "Suggest related terms and relationship types without creating or admitting canonical cards.",
  "drift_detection.md": "Compare a passage with the active canonical version. Return exact match, close match, ambiguous, or reference only. Never silently rewrite text.",
  "propagation_rewrite.md": "Propose a minimal, source-preserving rewrite aligned with the named canonical version. State every changed phrase and reason."
};

const CARD_COMPONENTS = [
  ["Canonical Definition", "Clarify definition"],
  ["Semantic Meaning and Boundaries", "Build semantic boundary"],
  ["Aliases and Related Terms", "Find aliases"],
  ["Axioms and Dependencies", "Find dependent cards"],
  ["Math 0 — Translation Layer", "Draft mathematical translation"],
  ["Formal Mathematics", "Inspect formal structure"],
  ["Symbols and Notation", "Build symbol dictionary"],
  ["Derivations and Laws", "Map derivations"],
  ["Theological Meaning", "Clarify theology"],
  ["Scripture Anchors", "Research Scripture anchors"],
  ["Physics Interpretation", "Separate physics from theology"],
  ["Empirical Content and Limits", "Audit empirical content"],
  ["Formal / Lean References", "Check formal references"],
  ["Bridge Claims", "Audit bridge claim"],
  ["Anti-terms", "Identify anti-terms"],
  ["Drift Gates and Kill Conditions", "Propose kill conditions"],
  ["Historical / Scientific Comparison", "Research comparisons"],
  ["Objections and Alternatives", "Find objections"],
  ["Open Research Questions", "Develop research questions"],
  ["Mermaid Diagrams", "Create Mermaid map"],
  ["Truth Predicates and Why-Closure", "Record premise dependence, invariants, countermodels, reversibility, defeat conditions, and closure status"]
];

const SECTION_BY_LANE = {
  definition: "Canonical Definition",
  mathematical_component: "Formal Mathematics",
  theological_component: "Theological Meaning",
  bridge_claim: "Bridge Claims",
  scripture_anchor: "Scripture Anchors",
  dependency_graph: "Axioms and Dependencies",
  receipt: "Formal / Lean References",
  review_queue: "Objections and Alternatives",
  proposal: "Open Research Questions"
};

function asArray(value) { return Array.isArray(value) ? value : value == null || value === "" ? [] : [value]; }
function semanticChunks(value, maxChars = 18000) {
  const text = String(value || "");
  if (text.length <= maxChars) return [text];
  const blocks = text.split(/\n(?=#{1,6}\s)|\n{2,}/);
  const chunks = [];
  let current = "";
  const flush = () => { if (current.trim()) chunks.push(current.trim()); current = ""; };
  for (const block of blocks) {
    if (block.length > maxChars) {
      flush();
      for (let i = 0; i < block.length; i += maxChars) chunks.push(block.slice(i, i + maxChars));
    } else if (current && current.length + block.length + 2 > maxChars) {
      flush(); current = block;
    } else {
      current += `${current ? "\n\n" : ""}${block}`;
    }
  }
  flush();
  return chunks;
}
function safeText(value) { return String(value == null ? "" : value).trim(); }
function yamlQuoted(value) { return JSON.stringify(String(value == null ? "" : value)); }
function safeFilePart(value) { return String(value || "UNNAMED").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "UNNAMED"; }
function proposalFingerprint(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function slug(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeYaml(value) {
  return String(value || "").replace(/"/g, "\\\"");
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function cardMarkdown({ id, term, aliases, definition, version = "0.1.0", status = "candidate" }) {
  const aliasList = aliases.map((alias) => `  - "${escapeYaml(alias)}"`).join("\n") || "  - \"\"";
  const sections = CARD_COMPONENTS.map(([label, action], index) => {
    const yours = index === 0 && definition ? definition : "<!-- YOURS: leave blank when you do not yet know. -->";
    return `## ${index + 1}. ${label}\n${yours}\n\n<!-- AI help: ${action}. Suggestions must be inserted below as PROPOSED, never over YOURS. -->\n<!-- PROPOSED: -->`;
  }).join("\n\n");
  return `---
canon_id: ${id}
term: "${escapeYaml(term)}"
aliases:
${aliasList}
version: "${version}"
status: ${status}
card_type: term
admission: not_performed
admission_event: null
validation_status: not_validated
created_at: ${new Date().toISOString()}
updated_at: ${new Date().toISOString()}
canon_refs: []
---

# ${id} - ${term}

> Human-authored material stays **YOURS**. AI assistance may fill only empty sections and stays **PROPOSED** until review.

> **CANDIDATE DRAFT — NOT VALIDATED — NOT ADMITTED.** This workbench cannot create an admission event.

${sections}
`;
}

class CanonStore {
  constructor(app, plugin) {
    this.app = app;
    this.plugin = plugin;
  }

  root(...parts) {
    return normalizePath([this.plugin.settings.canonRoot, ...parts].join("/"));
  }

  async ensureFolder(path) {
    if (!(await this.app.vault.adapter.exists(path))) await this.app.vault.createFolder(path);
  }

  async ensureLayout() {
    const folders = ["", "00_REGISTRY", "01_TERMS", "02_DEFINITIONS", "03_MATHEMATICAL_COMPONENTS", "04_THEOLOGICAL_COMPONENTS", "05_BRIDGE_CLAIMS", "06_SCRIPTURE_ANCHORS", "07_DEPENDENCY_GRAPH", "08_PROPOSALS", "09_REVIEW_QUEUE", "10_RECEIPTS", "11_PROMPTS", "99_SUPERSEDED"];
    for (const folder of folders) await this.ensureFolder(this.root(folder));
    for (const [file, text] of Object.entries(PROMPTS)) {
      const path = this.root("11_PROMPTS", file);
      if (!(await this.app.vault.adapter.exists(path))) await this.app.vault.create(path, `# ${file.replace(/\.md$/, "")}\n\n${text}\n`);
    }
  }

  async cards() {
    const prefix = `${this.root("01_TERMS")}/`;
    return this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(prefix) && !file.path.includes("/versions/"));
  }

  meta(file) {
    return this.app.metadataCache.getFileCache(file)?.frontmatter || {};
  }

  async findTerm(term) {
    const wanted = String(term || "").trim().toLowerCase();
    for (const file of await this.cards()) {
      const meta = this.meta(file);
      const aliases = Array.isArray(meta.aliases) ? meta.aliases : [];
      if (String(meta.term || "").toLowerCase() === wanted || aliases.some((alias) => String(alias).toLowerCase() === wanted)) return file;
    }
    return null;
  }

  async createCard({ term, aliases, definition }) {
    await this.ensureLayout();
    const id = `CAN-${slug(term)}`;
    const folder = this.root("01_TERMS", id);
    await this.ensureFolder(folder);
    await this.ensureFolder(this.root("01_TERMS", id, "versions"));
    const path = this.root("01_TERMS", id, `${id}.md`);
    if (await this.app.vault.adapter.exists(path)) throw new Error(`${id} already exists.`);
    const content = cardMarkdown({ id, term, aliases, definition });
    const file = await this.app.vault.create(path, content);
    await this.app.vault.create(this.root("01_TERMS", id, "versions", "v1.0.md"), content);
    return file;
  }

  async createDraft(file) {
    const meta = this.meta(file);
    const version = String(meta.version || "0.1.0");
    const [major, minor] = version.split(".").map((part) => Number(part) || 0);
    const next = `${major}.${minor + 1}.0`;
    const id = meta.canon_id;
    const draftPath = this.root("01_TERMS", id, "versions", `v${next}-draft.md`);
    if (await this.app.vault.adapter.exists(draftPath)) throw new Error(`Draft v${next} already exists.`);
    const content = (await this.app.vault.read(file))
      .replace(`version: "${version}"`, `version: "${next}"`)
      .replace(`status: ${meta.status || "candidate"}`, "status: draft")
      .replace(/updated_at:.*/, `updated_at: ${new Date().toISOString()}`);
    return this.app.vault.create(draftPath, content);
  }

  sectionNumber(content, label) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = content.match(new RegExp(`^##\\s+(\\d+)\\.\\s+${escaped}\\s*$`, "m"));
    return match ? Number(match[1]) : null;
  }

  ensureModernSections(content) {
    if (content.includes("Truth Predicates and Why-Closure")) return content;
    const number = (content.match(/^##\s+\d+\./gm) || []).length + 1;
    return `${content.trimEnd()}\n\n## ${number}. Truth Predicates and Why-Closure\n<!-- YOURS: leave blank when you do not yet know. -->\n\n<!-- AI help: Record premise dependence, invariants, countermodels, reversibility, defeat conditions, and closure status. Suggestions must be inserted below as PROPOSED, never over YOURS. -->\n<!-- PROPOSED: -->\n`;
  }

  proposalMarkdown(item, sourcePath) {
    const truth = item.truth_predicates || {};
    const lines = [];
    const proposed = safeText(item.proposed_text || item.exact_claim || item.label);
    if (proposed) lines.push(proposed);
    lines.push("", `> [!source] Proposed from \`${sourcePath}\``, `> Object: ${item.proposed_object_type}; register: ${item.register}; warrant: ${item.warrant}.`);
    if (item.dependencies.length) lines.push("", "**Dependencies**", ...item.dependencies.map((value) => `- ${value}`));
    if (item.support.length) lines.push("", "**Support**", ...item.support.map((value) => `- ${value}`));
    if (item.defeat_conditions.length) lines.push("", "**Defeat conditions**", ...item.defeat_conditions.map((value) => `- ${value}`));
    if (item.open_fields.length) lines.push("", "**OPEN**", ...item.open_fields.map((value) => `- ${value}`));
    const truthRows = [
      ["Truth mode", truth.truth_mode], ["Premise dependence", truth.premise_dependency],
      ["Necessity", truth.necessity], ["Reversibility", truth.reversibility],
      ["Why-Closure", truth.why_closure], ["Closure level", truth.closure_level]
    ].filter(([, value]) => safeText(value));
    if (truthRows.length) lines.push("", "**Truth predicates**", ...truthRows.map(([key, value]) => `- **${key}:** ${value}`));
    if (asArray(truth.invariants).length) lines.push(...asArray(truth.invariants).map((value) => `- **Invariant:** ${value}`));
    if (asArray(truth.countermodels).length) lines.push(...asArray(truth.countermodels).map((value) => `- **Countermodel:** ${value}`));
    return lines.join("\n").trim();
  }

  insertProposal(content, label, proposal, markerId, sourcePath) {
    const number = this.sectionNumber(content, label);
    if (!number) return { content, inserted: false, reason: `Missing section: ${label}` };
    if (content.includes(`PROPOSED-ITEM:${markerId}`)) return { content, inserted: false, reason: "Duplicate proposal" };
    const heading = `## ${number}. ${label}`;
    const start = content.indexOf(heading);
    const next = content.indexOf("\n## ", start + heading.length);
    const end = next === -1 ? content.length : next;
    const section = content.slice(start, end);
    const anchor = "<!-- PROPOSED: -->";
    const anchorAt = section.indexOf(anchor);
    if (anchorAt === -1) return { content, inserted: false, reason: `Missing PROPOSED anchor: ${label}` };
    const absolute = start + anchorAt + anchor.length;
    const block = `\n\n<!-- PROPOSED-ITEM:${markerId} source=${sourcePath} -->\n${proposal}\n<!-- /PROPOSED-ITEM:${markerId} -->`;
    return { content: content.slice(0, absolute) + block + content.slice(absolute), inserted: true };
  }

  async sourceBundleForCard(file) {
    const meta = this.meta(file);
    const card = await this.app.vault.cachedRead(file);
    if (!meta.canon_id) return { text: card, paths: [file.path] };
    const sourcePrefix = normalizePath(`${file.parent.path}/sources/`);
    const sources = this.app.vault.getMarkdownFiles().filter((entry) => entry.path.startsWith(sourcePrefix));
    const chunks = [`SOURCE: ${file.path}\n${card}`];
    for (const source of sources) chunks.push(`SOURCE: ${source.path}\n${await this.app.vault.cachedRead(source)}`);
    return { text: chunks.join("\n\n--- SOURCE BOUNDARY ---\n\n"), paths: [file.path, ...sources.map((entry) => entry.path)] };
  }

  async accumulateProposals(cardFile, proposals, sourcePaths) {
    const meta = this.meta(cardFile);
    if (!meta.canon_id) throw new Error("Proposal accumulation requires a CAN-* card.");
    let content = this.ensureModernSections(await this.app.vault.read(cardFile));
    const original = content;
    const outcomes = [];
    for (const item of proposals) {
      const target = CARD_COMPONENTS.some(([label]) => label === item.target_section) ? item.target_section : SECTION_BY_LANE[item.proposed_lane] || "Open Research Questions";
      const source = item.source_file || sourcePaths[0] || cardFile.path;
      const fingerprint = proposalFingerprint(`${meta.canon_id}|${target}|${item.proposed_text || item.label}|${source}`);
      const marker = `${meta.canon_id}-${fingerprint}`;
      const result = this.insertProposal(content, target, this.proposalMarkdown(item, source), marker, source);
      content = result.content; outcomes.push({ marker, target_section: target, inserted: result.inserted, reason: result.reason || null });
      if (item.truth_predicates && Object.keys(item.truth_predicates).length) {
        const truthMarker = `${marker}-truth`;
        const truthItem = { ...item, proposed_text: `Truth-predicate assessment for: ${item.exact_claim || item.label}`, dependencies: [], support: [], defeat_conditions: item.defeat_conditions, open_fields: item.open_fields };
        const truthResult = this.insertProposal(content, "Truth Predicates and Why-Closure", this.proposalMarkdown(truthItem, source), truthMarker, source);
        content = truthResult.content; outcomes.push({ marker: truthMarker, target_section: "Truth Predicates and Why-Closure", inserted: truthResult.inserted, reason: truthResult.reason || null });
      }
    }
    if (content !== original) {
      const versions = normalizePath(`${cardFile.parent.path}/versions`); await this.ensureFolder(versions);
      const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      await this.app.vault.create(normalizePath(`${versions}/${stamp}-pre-semantic-accumulation.md`), await this.app.vault.read(cardFile));
      content = content.replace(/updated_at:.*/, `updated_at: ${new Date().toISOString()}`);
      await this.app.vault.modify(cardFile, content);
    }
    return outcomes;
  }

  async semanticConcepts() {
    if (!this.plugin.settings.useSemanticRegistry) return [];
    const path = normalizePath(this.plugin.settings.semanticRegistryPath);
    try {
      if (!(await this.app.vault.adapter.exists(path))) return [];
      const raw = await this.app.vault.adapter.read(path);
      const data = JSON.parse(raw);
      return Object.values(data.concepts || {}).map((concept) => ({ label: concept.label, type: concept.type, aliases: concept.aliases || [] }));
    } catch (error) {
      console.warn("Canonization Workbench could not read Semantic AI registry", error);
      return [];
    }
  }

  async candidatePackets() {
    const prefix = normalizePath(`${this.plugin.settings.candidateReviewRoot}/_candidate_packets/`);
    return this.app.vault.getFiles().filter((file) => file.path.startsWith(prefix) && file.path.endsWith(".candidate.json"));
  }

  async candidatePacket(file) {
    return JSON.parse(await this.app.vault.read(file));
  }

  async recordCandidateRuling(packet, decision, actor, rationale) {
    if (!HUMAN_DECISIONS.includes(decision)) throw new Error("Invalid candidate decision; ADMIT is not permitted here.");
    if (packet.status !== CANDIDATE_STATUS || packet.lifecycle !== "candidate" || packet.canonical_admission !== false || packet.admission_event !== null) throw new Error("Candidate packet has contradictory or unsafe status fields.");
    if (packet.kimi_review?.affected && packet.kimi_review?.state !== "ADJUDICATED") throw new Error("This candidate is blocked pending Kimi adjudication.");
    const folder = normalizePath(`${this.plugin.settings.candidateReviewRoot}/_human_rulings`);
    await this.ensureFolder(folder);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const path = normalizePath(`${folder}/${packet.id}.${stamp}.candidate-ruling.json`);
    const event = { event_type: "CANDIDATE_HUMAN_RULING", status: CANDIDATE_STATUS, candidate_id: packet.id, candidate_version: packet.candidate_version, decision, actor, date: new Date().toISOString(), rationale, canonical_admission_performed: false };
    return this.app.vault.create(path, JSON.stringify(event, null, 2) + "\n");
  }
}

class CanonizationProgressModal extends Modal {
  constructor(app, passLabel, sourcePath) {
    super(app); this.passLabel = passLabel; this.sourcePath = sourcePath;
    this.statusEl = null; this.detailEl = null;
  }
  onOpen() {
    this.modalEl.addClass("canonization-progress-modal");
    this.contentEl.createEl("h2", { text: "Canonization work in progress" });
    this.contentEl.createEl("div", { cls: "canonization-progress-pass", text: this.passLabel });
    this.contentEl.createEl("div", { cls: "canonization-progress-source", text: this.sourcePath });
    this.statusEl = this.contentEl.createEl("h3", { text: "Preparing source…" });
    this.detailEl = this.contentEl.createEl("p", { text: "No canonization decision can occur during this run." });
  }
  setStatus(status, detail = "") { this.statusEl?.setText(status); if (detail) this.detailEl?.setText(detail); }
  finish(count) {
    this.setStatus(`Complete: ${count} candidate object${count === 1 ? "" : "s"}`, "Candidate-only review material was saved. Zero admissions.");
    new Setting(this.contentEl).addButton((button) => button.setButtonText("Close and review results").setCta().onClick(() => this.close()));
  }
  fail(message) {
    this.modalEl.addClass("canonization-progress-failed");
    this.setStatus("Run stopped — no usable candidates", message);
    new Setting(this.contentEl).addButton((button) => button.setButtonText("Close").onClick(() => this.close()));
  }
  onClose() { this.contentEl.empty(); }
}

class CandidateRulingModal extends Modal {
  constructor(app, plugin, packet) { super(app); this.plugin = plugin; this.packet = packet; }
  onOpen() {
    const { contentEl } = this; let decision = "HOLD OPEN", actor = "David", rationale = "";
    contentEl.createEl("h2", { text: `Candidate ruling — ${this.packet.id}` });
    contentEl.createEl("p", { text: CANDIDATE_STATUS });
    new Setting(contentEl).setName("Decision").setDesc("Candidate approval is not admission.").addDropdown((drop) => { HUMAN_DECISIONS.forEach((item) => drop.addOption(item, item)); drop.setValue(decision).onChange((value) => decision = value); });
    new Setting(contentEl).setName("Actor").addText((text) => text.setValue(actor).onChange((value) => actor = value.trim()));
    new Setting(contentEl).setName("Rationale").addTextArea((text) => text.onChange((value) => rationale = value.trim()));
    new Setting(contentEl).addButton((button) => button.setButtonText("Record candidate ruling").setCta().onClick(async () => {
      if (!actor || !rationale) return new Notice("Actor and rationale are required.");
      try { const file = await this.plugin.store.recordCandidateRuling(this.packet, decision, actor, rationale); await this.plugin.openFile(file); new Notice(`${decision} recorded; no admission occurred.`); this.close(); }
      catch (error) { new Notice(error.message || String(error)); }
    }));
  }
  onClose() { this.contentEl.empty(); }
}

class CanonCardReviewModal extends Modal {
  constructor(app, plugin, file) { super(app); this.plugin = plugin; this.file = file; }
  async onOpen() {
    const { contentEl } = this;
    contentEl.addClass("canonization-card-modal");
    const meta = this.plugin.store.meta(this.file);
    contentEl.createEl("h2", { text: `${meta.canon_id || this.file.basename} — ${meta.term || "Canonical card"}` });
    contentEl.createEl("p", { cls: "canonization-status", text: `${meta.status || "candidate"} · v${meta.version || "?"} · NOT ADMITTED` });
    const controls = contentEl.createDiv({ cls: "canonization-card-modal-controls" });
    controls.createEl("button", { text: "Open Markdown" }).addEventListener("click", async () => { await this.plugin.openFile(this.file); this.close(); });
    controls.createEl("button", { text: "Accumulate from attached sources" }).addEventListener("click", async () => { this.close(); await this.plugin.runSemanticCanonizationCurrentNote(this.file); });
    const rendered = contentEl.createDiv({ cls: "canonization-rendered-card markdown-rendered" });
    await MarkdownRenderer.render(this.app, await this.app.vault.cachedRead(this.file), rendered, this.file.path, this.plugin);
  }
  onClose() { this.contentEl.empty(); }
}

class CreateCanonModal extends Modal {
  constructor(app, plugin, initialTerm = "") {
    super(app);
    this.plugin = plugin;
    this.initialTerm = initialTerm;
  }

  onOpen() {
    const { contentEl } = this;
    let term = this.initialTerm;
    let aliases = "";
    let definition = "";
    contentEl.createEl("h2", { text: "Guided Candidate Intake" });
    new Setting(contentEl).setName("1. What is the term?").setDesc("Creates a stable CAN-* identifier and checks terms and aliases first.").addText((text) => text.setValue(term).onChange((value) => term = value));
    new Setting(contentEl).setName("2. What is your definition?").setDesc("Write only what you currently know; your words remain YOURS.").addTextArea((text) => text.setPlaceholder("Leave blank if it is not known yet.").onChange((value) => definition = value));
    new Setting(contentEl).setName("3. Does it have aliases or alternate names?").setDesc("Optional, comma-separated; for example: charis, unmerited favor.").addText((text) => text.setPlaceholder("None").onChange((value) => aliases = value));
    new Setting(contentEl).addButton((button) => button.setButtonText("Create candidate card").setCta().onClick(async () => {
      const cleanTerm = term.trim();
      if (!cleanTerm) return new Notice("Enter a canonical term first.");
      const existing = await this.plugin.store.findTerm(cleanTerm);
      if (existing) {
        new Notice(`Existing card found: ${existing.basename}`);
        await this.plugin.openFile(existing);
        this.close();
        return;
      }
      try {
        const file = await this.plugin.store.createCard({ term: cleanTerm, aliases: aliases.split(",").map((value) => value.trim()).filter(Boolean), definition });
        await this.plugin.refreshTermIndex();
        await this.plugin.openFile(file);
        new Notice(`Created ${file.basename} as a candidate.`);
        this.close();
      } catch (error) { new Notice(error.message || String(error)); }
    }));
  }

  onClose() { this.contentEl.empty(); }
}

class NerveBuilderView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return VIEW_TYPE_NERVE_BUILDER; }
  getDisplayText() { return "Nerve Atom Builder"; }
  getIcon() { return "boxes"; }
  async loadBuilder(state) {
    const configured = String(this.plugin.settings.nerveBuilderUrl || DEFAULT_SETTINGS.nerveBuilderUrl).trim();
    state.setText("Loading interface…");
    try {
      if (/^(https?:|nerve:|app:|file:)/i.test(configured)) {
        this.frame.removeAttribute("srcdoc");
        this.frame.src = configured;
      } else {
        const html = await this.app.vault.adapter.read(normalizePath(configured));
        this.frame.removeAttribute("src");
        this.frame.srcdoc = html;
      }
    } catch (error) {
      state.setText(`Could not load interface: ${error.message || error}`);
      new Notice(`Nerve Atom Builder could not be loaded: ${error.message || error}`, 10000);
    }
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.empty(); contentEl.addClass("canonization-nerve-view");
    const bar = contentEl.createDiv({ cls: "canonization-nerve-toolbar" });
    bar.createEl("strong", { text: "Nerve · Canonical Atom Interface" });
    const state = bar.createEl("span", { cls: "canonization-status", text: "Connecting…" });
    bar.createEl("button", { text: "Reload" }).addEventListener("click", () => this.loadBuilder(state));
    bar.createEl("button", { text: "Open full window" }).addEventListener("click", () => window.open(this.plugin.resolveNerveBuilderUrl()));
    const frame = contentEl.createEl("iframe", { cls: "canonization-nerve-frame" });
    frame.setAttr("title", "Nerve Claim Atom Builder");
    frame.setAttr("allow", "clipboard-read; clipboard-write");
    frame.addEventListener("load", () => state.setText("Interface loaded · candidate-only"));
    this.frame = frame;
    await this.loadBuilder(state);
  }
}

class CanonWorkbenchView extends ItemView {
  constructor(leaf, plugin) { super(leaf); this.plugin = plugin; }
  getViewType() { return VIEW_TYPE_CANON; }
  getDisplayText() { return "Canon Workbench"; }
  async onOpen() { await this.render(); }
  async render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Canon Workbench" });
    contentEl.createEl("p", { text: "Versioned candidate cards. AI may propose; validation and signed human admission remain separate." });
    const semanticBox = contentEl.createDiv({ cls: "canonization-semantic-box" });
    semanticBox.createEl("h3", { text: "Semantic AI / Canonization API" });
    semanticBox.createEl("p", { text: "Select this for discovery and categorization into canonization lanes. Results remain candidate intake and never become admissions." });
    new Setting(semanticBox).setName("Use Semantic AI for canonization").setDesc("Runs only when selected. Uses Semantic AI's active provider and the Canonization category.").addToggle((toggle) => toggle.setValue(this.plugin.settings.useSemanticCanonization).onChange(async (value) => { this.plugin.settings.useSemanticCanonization = value; await this.plugin.saveSettings(); }));
    new Setting(semanticBox).setName("Classification profile").setDesc("Each profile owns its categories and prompt. The candidate pipeline is three distinct API calls; specialized profiles run one bounded pass.").addDropdown((dropdown) => {
      for (const profile of this.plugin.classificationProfiles()) dropdown.addOption(profile.id, profile.name);
      dropdown.setValue(this.plugin.settings.activeClassificationProfile || "candidate-pipeline").onChange(async (value) => { this.plugin.settings.activeClassificationProfile = value; await this.plugin.saveSettings(); });
    }).addButton((button) => button.setButtonText("Run selected profile").setCta().onClick(() => this.plugin.runClassificationProfile(null)));
    const activeProfile = this.plugin.classificationProfile(this.plugin.settings.activeClassificationProfile);
    if (activeProfile) semanticBox.createEl("p", { cls: "canonization-profile-summary", text: `Categories: ${activeProfile.categories.join(" · ")}` });
    new Setting(semanticBox).setName("Nerve Atom Builder").setDesc("Open the canonical HTML authoring interface in the right-side pane. Validated packets are preserved as JSON and projected into Obsidian Properties.").addButton((button) => button.setButtonText("Open Nerve interface").setCta().onClick(() => this.plugin.activateNerveBuilder()));
    new Setting(semanticBox).setName("Nerve JSON round trip").setDesc("Export Draft inside the Nerve sidebar to preserve editable JSON. Open an editable-draft JSON note here, then import it without altering a validated candidate packet.").addButton((button) => button.setButtonText("Import active draft JSON").onClick(() => this.plugin.importActiveNerveDraft()));
    new Setting(semanticBox).setName("Pipeline batch intake").setDesc("Import preserved capsule, receipt, and projection batches into this human-review queue. Source files remain untouched; no admission event is created.").addButton((button) => button.setButtonText("Import pipeline batches").setCta().onClick(() => this.plugin.importCandidatePipelineBatches()));
    new Setting(contentEl).addButton((button) => button.setButtonText("Create card").setCta().onClick(() => new CreateCanonModal(this.app, this.plugin).open()));
    const list = contentEl.createDiv({ cls: "canonization-card-list" });
    const files = await this.plugin.store.cards();
    for (const file of files.sort((a, b) => a.basename.localeCompare(b.basename))) {
      const meta = this.plugin.store.meta(file);
      const row = list.createDiv({ cls: "canonization-card-row" });
      const summary = row.createDiv({ cls: "canonization-card-summary" });
      summary.createEl("strong", { text: `${meta.canon_id || file.basename} - ${meta.term || "Unnamed"}` });
      summary.createDiv({ cls: "canonization-status", text: `${meta.status || "unknown"} v${meta.version || "?"}` });
      row.createEl("button", { text: "Review" }).addEventListener("click", () => new CanonCardReviewModal(this.app, this.plugin, file).open());
      row.createEl("button", { text: "Open note" }).addEventListener("click", () => this.plugin.openFile(file));
    }
    contentEl.createEl("h3", { text: "Ground Trial and fundamental-axiom candidates" });
    contentEl.createEl("p", { text: `${CANDIDATE_STATUS}. Candidate rulings cannot admit records.` });
    for (const file of await this.plugin.store.candidatePackets()) {
      try {
        const packet = await this.plugin.store.candidatePacket(file);
        const row = contentEl.createDiv({ cls: "canonization-candidate-row" });
        row.createEl("strong", { text: `${packet.id} — ${packet.title}` });
        row.createDiv({ cls: "canonization-status", text: `${packet.status}; Kimi: ${packet.kimi_review?.state || "UNKNOWN"}` });
        const language = packet.review_card?.canonical_language;
        if (language) {
          const truth = language.truth_kernel || {};
          const definitionConflicts = language.definition_resolution?.conflicts?.length || 0;
          const symbolConflicts = language.symbol_resolution?.conflicts?.length || 0;
          const downstream = language.dependency_impact?.all_downstream?.length || 0;
          row.createDiv({ cls: "canonization-language-summary", text: `Truth mode: ${truth.truth_mode || "OPEN"} · Definitions: ${language.definition_resolution?.matches?.length || 0} matches / ${definitionConflicts} conflicts · Symbols: ${language.symbol_resolution?.matches?.length || 0} matches / ${symbolConflicts} conflicts · Downstream: ${downstream} · Version operation: ${language.proposed_version_operation || "OPEN"} · Projection stale: ${language.projection_impact?.current_projections_may_become_stale ? "yes" : "no"}` });
        }
        row.createEl("button", { text: "Open review card" }).addEventListener("click", () => this.plugin.openFile(file));
        row.createEl("button", { text: "Record candidate ruling" }).addEventListener("click", () => new CandidateRulingModal(this.app, this.plugin, packet).open());
      } catch (error) { console.warn("Invalid candidate packet", file.path, error); }
    }
  }
}

class CanonizationSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Canonization Workbench" });
    new Setting(containerEl).setName("Classification profiles").setHeading();
    containerEl.createEl("p", { text: "Profiles are the workbench's editable classification library. Each records its own categories and prompt, then uses Semantic AI only to propose candidate packets." });
    for (const profile of this.plugin.settings.classificationProfiles) {
      const row = containerEl.createDiv({ cls: "canonization-profile-settings" });
      new Setting(row).setName(profile.name || profile.id).setDesc(profile.mode === "pipeline" ? "Three distinct API calls: discovery, classification, reconciliation." : `Runs the ${profile.passId || "claims"} pass.`).addToggle((toggle) => toggle.setValue(profile.enabled !== false).onChange(async (value) => { profile.enabled = value; await this.plugin.saveSettings(); }));
      new Setting(row).setName("Categories").setDesc("Comma-separated classification labels carried into the API instruction and receipt.").addText((text) => text.setValue((profile.categories || []).join(", ")).onChange(async (value) => { profile.categories = value.split(",").map((item) => item.trim()).filter(Boolean); await this.plugin.saveSettings(); }));
      new Setting(row).setName("Prompt").addTextArea((text) => { text.setValue(profile.prompt || "").onChange(async (value) => { profile.prompt = value; await this.plugin.saveSettings(); }); text.inputEl.rows = 3; });
    }
    new Setting(containerEl).setName("Profile JSON").setDesc("Export or import the whole classification library. Import replaces only the workbench profiles; it never changes historical receipts.").addButton((button) => button.setButtonText("Copy export").onClick(async () => { await navigator.clipboard.writeText(JSON.stringify({ format: "canonization-classification-profiles/1.0.0", profiles: this.plugin.settings.classificationProfiles }, null, 2)); new Notice("Classification profile JSON copied."); })).addButton((button) => button.setButtonText("Import from clipboard").onClick(async () => { try { const parsed = JSON.parse(await navigator.clipboard.readText()); if (!Array.isArray(parsed?.profiles) || !parsed.profiles.length) throw new Error("No profiles array found."); this.plugin.settings.classificationProfiles = cloneClassificationProfiles(parsed.profiles); this.plugin.settings.activeClassificationProfile = this.plugin.settings.classificationProfiles[0].id; await this.plugin.saveSettings(); this.display(); new Notice("Classification profiles imported. Existing receipts were not changed."); } catch (error) { new Notice(`Could not import classification profiles: ${error.message || error}`); } }));
    new Setting(containerEl).setName("Post-processing and PostgreSQL handoff").setHeading();
    containerEl.createEl("p", { text: "Candidate JSON and Markdown receipts are always written locally. PostgreSQL handoff writes an outbox item only; a local helper must deliberately consume it. No database credential is stored in this workbench." });
    new Setting(containerEl).setName("Write PostgreSQL handoff outbox").setDesc("Creates a candidate-only JSON handoff for the local database helper after each completed run.").addToggle((toggle) => toggle.setValue(Boolean(this.plugin.settings.postProcessing.postgresHandoff)).onChange(async (value) => { this.plugin.settings.postProcessing.postgresHandoff = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Canonical root folder").setDesc("All canonical cards, prompts, proposals, and receipts live under this vault folder.").addText((text) => text.setValue(this.plugin.settings.canonRoot).onChange(async (value) => { this.plugin.settings.canonRoot = value.trim() || "_CANONICAL"; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Read Semantic AI concept registry").setDesc("Uses concept labels and aliases for discovery only. No provider settings or API key are read.").addToggle((toggle) => toggle.setValue(this.plugin.settings.useSemanticRegistry).onChange(async (value) => { this.plugin.settings.useSemanticRegistry = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Semantic AI canonization box").setDesc("Allows explicit candidate discovery with Semantic AI's Canonization category. Off means no AI call from this workbench.").addToggle((toggle) => toggle.setValue(this.plugin.settings.useSemanticCanonization).onChange(async (value) => { this.plugin.settings.useSemanticCanonization = value; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Semantic AI registry path").addText((text) => text.setValue(this.plugin.settings.semanticRegistryPath).onChange(async (value) => { this.plugin.settings.semanticRegistryPath = value.trim(); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Canon Engine API").setDesc("Local engine used for index-driven drift and propagation previews. It remains the authority; Semantic AI is discovery-only.").addText((text) => text.setValue(this.plugin.settings.engineUrl).onChange(async (value) => { this.plugin.settings.engineUrl = value.replace(/\/$/, ""); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Candidate review root").setDesc("Vault-relative Ground Trial / fundamental-axiom review queue.").addText((text) => text.setValue(this.plugin.settings.candidateReviewRoot).onChange(async (value) => { this.plugin.settings.candidateReviewRoot = normalizePath(value.trim()); await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Candidate pipeline batch root").setDesc("Vault-relative folder containing preserved batch_* capsule, receipt, and projection outputs. Imports are additive and candidate-only.").addText((text) => text.setValue(this.plugin.settings.candidateBatchRoot).onChange(async (value) => { this.plugin.settings.candidateBatchRoot = normalizePath(value.trim()) || "__CANDIDATE_DRAFTS_NOT_ADMITTED"; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Nerve Atom Builder location").setDesc("Vault path to the generated Nerve interface copy, or an explicit URL. Nerve remains the authoring source; Obsidian consumes its JSON.").addText((text) => text.setValue(this.plugin.settings.nerveBuilderUrl).onChange(async (value) => { this.plugin.settings.nerveBuilderUrl = value.trim() || ".obsidian/plugins/canonization-workbench/nerve/atom-builder.html"; await this.plugin.saveSettings(); }));
    new Setting(containerEl).setName("Create canonical folders and default prompts").setDesc("Safe setup: creates only missing folders and prompt files.").addButton((button) => button.setButtonText("Initialize").onClick(async () => { await this.plugin.store.ensureLayout(); new Notice("Canonical folders and prompt files are ready."); }));
  }
}

module.exports = class CanonizationWorkbenchPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.store = new CanonStore(this.app, this);
    this.termEntries = [];
    this.selectedCanonizationPass = "full";
    this.registerView(VIEW_TYPE_CANON, (leaf) => new CanonWorkbenchView(leaf, this));
    this.registerView(VIEW_TYPE_NERVE_BUILDER, (leaf) => new NerveBuilderView(leaf, this));
    this.addSettingTab(new CanonizationSettingTab(this.app, this));
    this.addRibbonIcon("network", "Open Canon Workbench", () => this.activateView());
    this.addRibbonIcon("boxes", "Open Nerve Atom Builder", () => this.activateNerveBuilder());
    this.addCommand({ id: "create-canonical-card", name: "Create candidate card from selection", editorCallback: (editor) => new CreateCanonModal(this.app, this, editor.getSelection()).open() });
    this.addCommand({ id: "open-canon-workbench", name: "Open Canon Workbench", callback: () => this.activateView() });
    this.addCommand({ id: "open-nerve-atom-builder", name: "Open Nerve Atom Builder", callback: () => this.activateNerveBuilder() });
    this.addCommand({ id: "import-active-nerve-draft", name: "Import active Nerve draft JSON into Atom Builder", callback: () => this.importActiveNerveDraft() });
    this.addCommand({ id: "open-ground-trial-candidate-review", name: "Open Ground Trial candidate review", callback: () => this.activateView() });
    this.addCommand({ id: "import-candidate-pipeline-batches", name: "Import candidate pipeline batches", callback: () => this.importCandidatePipelineBatches() });
    this.addCommand({ id: "open-canonical-card", name: "Open canonical card", callback: () => this.activateView() });
    for (const [passId, pass] of Object.entries(CANONIZATION_PASSES)) {
      this.addCommand({ id: `canonize-current-note-${passId}`, name: `Canonize current note — ${pass.label}`, callback: () => this.runSemanticCanonizationCurrentNote(null, passId) });
    }
    this.addCommand({ id: "create-new-canonical-version", name: "Create a new version draft for current canonical card", checkCallback: (checking) => {
      const file = this.app.workspace.getActiveFile();
      const meta = file ? this.store.meta(file) : {};
      if (!file || !meta.canon_id) return false;
      if (!checking) this.createDraft(file);
      return true;
    }});
    this.addCommand({ id: "scan-note-for-canonical-terms", name: "Scan current note for canonical terms", callback: () => this.scanCurrentNote() });
    this.addCommand({ id: "validate-candidates-current-folder", name: "Validate candidate packets in current folder", callback: () => this.validateCurrentFolder() });
    this.addCommand({ id: "validate-candidates-all-folders", name: "Validate all candidate folders concurrently", callback: () => this.validateAllCandidateFolders() });
    this.addCommand({ id: "review-drift-suggestions", name: "Review drift suggestions", callback: () => this.activateView() });
    this.addCommand({ id: "run-propagation-preview", name: "Run propagation preview", callback: () => this.runPropagationPreview() });
    this.registerEvent(this.app.workspace.on("editor-menu", (menu, editor) => {
      const selection = editor.getSelection().trim();
      if (selection) menu.addItem((item) => item.setTitle("Add/Open Canonical Term").setIcon("book-open").onClick(async () => {
        const existing = await this.store.findTerm(selection);
        if (existing) await this.openFile(existing); else new CreateCanonModal(this.app, this, selection).open();
      }));
    }));
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      menu.addItem((item) => {
        item.setTitle("Canonization").setIcon("network");
        const submenu = item.setSubmenu();
        this.populateCanonizationMenu(submenu, file);
      });
    }));
    this.registerEvent(this.app.vault.on("modify", async (file) => { if (file.path.startsWith(`${this.store.root("01_TERMS")}/`)) await this.refreshTermIndex(); }));
    this.registerDomEvent(window, "message", (event) => this.handleNerveMessage(event));
    await this.refreshTermIndex();
    this.registerEditorExtension(this.buildUnderlineExtension());
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.settings.classificationProfiles = cloneClassificationProfiles(this.settings.classificationProfiles);
    this.settings.postProcessing = Object.assign({}, DEFAULT_SETTINGS.postProcessing, this.settings.postProcessing || {});
  }
  async saveSettings() { await this.saveData(this.settings); }

  async sha256Text(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return `sha256:${Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  }

  canonicalJson(value) {
    if (Array.isArray(value)) return `[${value.map((item) => this.canonicalJson(item)).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${this.canonicalJson(value[key])}`).join(",")}}`;
    return JSON.stringify(value);
  }

  safePacketName(value) {
    return String(value || "candidate").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "candidate";
  }

  async importCandidatePipelineBatches() {
    const batchRoot = normalizePath(this.settings.candidateBatchRoot || DEFAULT_SETTINGS.candidateBatchRoot);
    const files = this.app.vault.getFiles().filter((file) => file.path.startsWith(`${batchRoot}/batch_`));
    const capsuleFiles = files.filter((file) => file.path.includes("/capsules/") && file.path.endsWith(".capsule.json"));
    if (!capsuleFiles.length) {
      new Notice(`No capsule batches found under ${batchRoot}.`);
      return { imported: 0, skipped: 0, failed: 0 };
    }

    let imported = 0, skipped = 0, failed = 0;
    for (const capsuleFile of capsuleFiles) {
      try {
        const capsuleRaw = await this.app.vault.read(capsuleFile);
        const capsule = JSON.parse(capsuleRaw);
        if (capsule.candidate_label !== CANDIDATE_STATUS || capsule.canonical_promotion_requested !== false) throw new Error("Unsafe capsule authority fields");
        const batchPath = capsuleFile.path.split("/capsules/")[0];
        const batchName = batchPath.split("/").pop();
        const batchFiles = files.filter((file) => file.path.startsWith(`${batchPath}/`));
        const receiptFiles = batchFiles.filter((file) => file.path.includes("/receipts/") && file.path.endsWith(".json"));
        let receipt = null, receiptFile = null, receiptRaw = null;
        for (const possible of receiptFiles) {
          const raw = await this.app.vault.read(possible);
          const parsed = JSON.parse(raw);
          if (parsed.capsule_hash === await this.sha256Text(this.canonicalJson(capsule))) { receipt = parsed; receiptFile = possible; receiptRaw = raw; break; }
        }
        if (!receipt) throw new Error("No hash-matched pipeline receipt");
        if (receipt.canonical_promotion_performed !== false) throw new Error("Receipt claims a canonical promotion");

        const stage = (name) => receipt.stages?.find((item) => item.name === name)?.output || {};
        const discovery = stage("discovery"), classification = stage("classification"), reconciliation = stage("reconciliation");
        const projectionFile = batchFiles.find((file) => file.path.endsWith(`/projections/${receipt.run_id}.projection.md`)) || null;
        const candidateId = capsule.source_governance?.declared_id || receipt.run_id;
        const destinationFolder = normalizePath(`${this.settings.candidateReviewRoot}/_candidate_packets/PIPELINE_IMPORTS/${batchName}`);
        await this.store.ensureFolder(destinationFolder);
        const destination = normalizePath(`${destinationFolder}/${this.safePacketName(candidateId)}.${receipt.run_id}.candidate.json`);
        if (await this.app.vault.adapter.exists(destination)) { skipped += 1; continue; }

        const openMatters = [...new Set([...(classification.unresolved || []), ...(discovery.open_questions || []), ...(capsule.source_governance?.limitations || [])])];
        const packet = {
          packet_version: "candidate-review-packet/1.1.0",
          status: CANDIDATE_STATUS,
          id: candidateId,
          candidate_version: "1.0-candidate",
          title: capsule.claim,
          declared_warrant_intent: classification.warrant_class || capsule.claim_type || "OPEN",
          depends_on: capsule.source_governance?.depends_on || discovery.dependencies || [],
          lifecycle: "candidate",
          admission_event: null,
          canonical_admission: false,
          review_card: {
            exact_claim: capsule.claim,
            plain_language_meaning: capsule.plain_language || reconciliation.safe_public_wording || capsule.claim,
            object_type_and_register: {
              declared_claim_type: capsule.claim_type || "OPEN",
              declared_warrant_intent: classification.warrant_class || "OPEN",
              automated_object_type: classification.object_type || "OPEN",
              automated_register: classification.register || "OPEN"
            },
            warrant: classification.warrant_class || "OPEN",
            dependencies: capsule.source_governance?.depends_on || discovery.dependencies || [],
            supporting_material: [],
            defeat_conditions: capsule.source_governance?.defeat_conditions || [capsule.defeat_condition].filter(Boolean),
            open_matters: openMatters,
            countermodels_and_objections: discovery.countermodels || [],
            automated_review_results: {
              provider: receipt.provider,
              model: receipt.model,
              final_status: receipt.final_status,
              stage_statuses: Object.fromEntries((receipt.stages || []).map((item) => [item.name, item.status])),
              receipt_path: receiptFile.path,
              capsule_path: capsuleFile.path,
              projection_path: projectionFile?.path || null
            },
            kimi_exact_criticism: [],
            proposed_response: [],
            human_decision: null,
            reconciliation: {
              recommended_operation: reconciliation.recommended_operation || capsule.operation || "OPEN",
              preserved: reconciliation.preserved || [],
              lost: reconciliation.lost || [],
              bridge_statement: reconciliation.bridge_statement || null,
              bridge_propagates_proof: false
            }
          },
          kimi_review: { state: "NOT_SUPPLIED", affected: false, objection_ids: [], finalization_blocked: false },
          candidate_approval: null,
          review_receipt: {
            import_type: "PRESERVED_PIPELINE_BATCH",
            imported_at: new Date().toISOString(),
            batch_path: batchPath,
            source_path: capsule.source?.path_or_uri || null,
            source_hash: capsule.source?.source_hash || null,
            capsule_path: capsuleFile.path,
            capsule_hash: await this.sha256Text(capsuleRaw),
            receipt_path: receiptFile.path,
            receipt_hash: await this.sha256Text(receiptRaw),
            projection_path: projectionFile?.path || null,
            originals_modified: false,
            canonical_admission_performed: false
          }
        };
        packet.candidate_packet_hash = await this.sha256Text(JSON.stringify(packet));
        await this.app.vault.create(destination, JSON.stringify(packet, null, 2) + "\n");
        imported += 1;
      } catch (error) {
        failed += 1;
        console.warn("Candidate pipeline import failed", capsuleFile.path, error);
      }
    }
    new Notice(`Pipeline import complete: ${imported} new, ${skipped} already present, ${failed} blocked. No admissions.`);
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CANON);
    for (const leaf of leaves) await leaf.view.render();
    return { imported, skipped, failed };
  }

  classificationProfiles() { return this.settings.classificationProfiles.filter((profile) => profile.enabled !== false); }

  classificationProfile(id) {
    return this.classificationProfiles().find((profile) => profile.id === id) || this.classificationProfiles()[0] || null;
  }

  profileInstruction(profile) {
    if (!profile) return "";
    const categories = Array.isArray(profile.categories) && profile.categories.length ? `\nCLASSIFICATION CATEGORIES: ${profile.categories.join(", ")}` : "";
    return `${profile.prompt || ""}${categories}`;
  }

  resolveNerveBuilderUrl() {
    const configured = String(this.settings.nerveBuilderUrl || DEFAULT_SETTINGS.nerveBuilderUrl).trim();
    if (/^(https?:|nerve:|app:|file:)/i.test(configured)) return configured;
    return this.app.vault.adapter.getResourcePath(normalizePath(configured));
  }

  async refreshTermIndex() {
    const entries = [];
    for (const file of await this.store.cards()) {
      const meta = this.store.meta(file);
      const names = [meta.term, ...(Array.isArray(meta.aliases) ? meta.aliases : [])].filter(Boolean);
      for (const name of names) entries.push({ term: String(name), status: meta.status || this.settings.underlineStatus, file });
    }
    this.termEntries = entries.sort((a, b) => b.term.length - a.term.length);
    this.app.workspace.updateOptions();
  }

  buildUnderlineExtension() {
    const plugin = this;
    return ViewPlugin.fromClass(class {
      constructor(view) { this.decorations = this.build(view); }
      update(update) { if (update.docChanged || update.viewportChanged) this.decorations = this.build(update.view); }
      build(view) {
        const builder = new RangeSetBuilder();
        const text = view.state.doc.toString();
        const occupied = [];
        for (const entry of plugin.termEntries) {
          const escaped = entry.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const expression = new RegExp(`\\b${escaped}\\b`, "gi");
          let match;
          while ((match = expression.exec(text))) {
            const start = match.index, end = start + match[0].length;
            if (occupied.some(([a, b]) => start < b && end > a)) continue;
            occupied.push([start, end]);
            const safeStatus = String(entry.status).replace(/[^a-z-]/gi, "").toLowerCase();
            builder.add(start, end, Decoration.mark({ class: `canonization-term canonization-${safeStatus}` }));
          }
        }
        return builder.finish();
      }
    }, { decorations: (value) => value.decorations });
  }

  async createDraft(file) {
    try {
      const draft = await this.store.createDraft(file);
      await this.openFile(draft);
      new Notice(`Created ${draft.basename}. Review and lock through the Canon Engine.`);
    } catch (error) { new Notice(error.message || String(error)); }
  }

  async scanCurrentNote() {
    const file = this.app.workspace.getActiveFile();
    if (!file) return new Notice("Open a note first.");
    const text = await this.app.vault.read(file);
    const hits = this.termEntries.filter((entry) => new RegExp(`\\b${entry.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
    new Notice(hits.length ? `Found ${hits.length} canonical terms. Editor underlines show their current status.` : "No known canonical terms found in this note.");
  }

  validateCandidate(packet, file) {
    const blocks = [];
    if (!packet || typeof packet !== "object") blocks.push({ id: "PKT-00", message: "Packet is not a JSON object." });
    if (!packet?.id) blocks.push({ id: "IDN-00", message: "Persistent candidate ID is required." });
    if (packet?.status !== CANDIDATE_STATUS) blocks.push({ id: "AUTH-01", message: `Status must remain ${CANDIDATE_STATUS}.` });
    if (packet?.lifecycle !== "candidate") blocks.push({ id: "AUTH-02", message: "Lifecycle must remain candidate." });
    if (packet?.canonical_admission !== false || packet?.admission_event !== null) blocks.push({ id: "AUTH-03", message: "Candidate contains contradictory admission state." });
    if (!packet?.review_card?.exact_claim) blocks.push({ id: "IDN-01", message: "Exact independently gradable claim is required." });
    if (!packet?.review_card?.object_type_and_register?.automated_object_type) blocks.push({ id: "TYP-03", message: "Primary object type is unresolved." });
    if (packet?.kimi_review?.affected && packet?.kimi_review?.state !== "ADJUDICATED") blocks.push({ id: "KIMI-01", message: "Affected candidate remains blocked pending Kimi adjudication." });
    return { file: file.path, candidate: packet?.id || file.basename, valid: blocks.length === 0, blocks, authority_boundary: "Deterministic candidate validation only. No truth grade, admission, or source rewrite occurred." };
  }

  async validateCandidateFiles(files, scopeLabel) {
    if (!files.length) return new Notice(`No .candidate.json packets found in ${scopeLabel}.`);
    new Notice(`Validating ${files.length} candidate packets with four bounded workers…`);
    const results = await mapLimit(files, 4, async (file) => {
      try { return this.validateCandidate(await this.store.candidatePacket(file), file); }
      catch (error) { return { file: file.path, candidate: file.basename, valid: false, blocks: [{ id: "JSON-01", message: error.message || String(error) }], authority_boundary: "Parse failure; no mutation occurred." }; }
    });
    const root = normalizePath(`${this.settings.candidateReviewRoot}/_batch_validation`);
    await this.store.ensureFolder(root);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const safeScope = slug(scopeLabel) || "ALL";
    const receipt = { packet: results.every((row) => row.valid) ? "PASS — CANDIDATES VALIDATED" : "EXPORT_BLOCKED — INVALID CANDIDATES PRESENT", created_at: new Date().toISOString(), scope: scopeLabel, concurrency_limit: 4, validation_receipts: results, canonical_admission_performed: false };
    const jsonPath = normalizePath(`${root}/${stamp}-${safeScope}.validation.json`);
    const mdPath = normalizePath(`${root}/${stamp}-${safeScope}.review.md`);
    await this.app.vault.create(jsonPath, JSON.stringify(receipt, null, 2) + "\n");
    const lines = ["---", `title: \"Candidate Batch Validation — ${escapeYaml(scopeLabel)}\"`, `date: ${new Date().toISOString()}`, `status: \"${receipt.packet}\"`, "authority: \"CANDIDATE REVIEW ONLY — NOT ADMITTED\"", "---", "", `# Candidate Batch Validation — ${scopeLabel}`, "", `- **Packets:** ${results.length}`, `- **Valid:** ${results.filter((row) => row.valid).length}`, `- **Blocked:** ${results.filter((row) => !row.valid).length}`, "- **Canonical admissions:** 0", ""];
    for (const row of results) { lines.push(`## ${row.candidate}`, "", `- **File:** \`${row.file}\``, `- **Result:** ${row.valid ? "PASS" : "BLOCKED"}`, ""); if (row.blocks.length) { lines.push("### Blocking findings", ""); for (const block of row.blocks) lines.push(`- **${block.id}:** ${block.message}`); lines.push(""); } lines.push(`> ${row.authority_boundary}`, ""); }
    await this.app.vault.create(mdPath, lines.join("\n") + "\n");
    new Notice(`Batch complete: ${results.filter((row) => row.valid).length} valid, ${results.filter((row) => !row.valid).length} blocked. Review opened.`);
    await this.openFile(this.app.vault.getAbstractFileByPath(mdPath));
  }

  async validateCurrentFolder() {
    const active = this.app.workspace.getActiveFile();
    if (!active) return new Notice("Open a file inside the folder you want to validate.");
    const prefix = active.parent?.path ? `${active.parent.path}/` : "";
    const files = this.app.vault.getFiles().filter((file) => file.path.startsWith(prefix) && file.path.endsWith(".candidate.json"));
    return this.validateCandidateFiles(files, active.parent?.path || "vault root");
  }

  async validateAllCandidateFolders() {
    const prefix = normalizePath(`${this.settings.candidateReviewRoot}/`);
    const files = this.app.vault.getFiles().filter((file) => file.path.startsWith(prefix) && file.path.endsWith(".candidate.json"));
    return this.validateCandidateFiles(files, `${this.settings.candidateReviewRoot} — all candidate folders`);
  }

  populateCanonizationMenu(menu, target) {
    const isFolder = Array.isArray(target?.children);
    const isMarkdown = target?.extension === "md";
    if (!isFolder && !isMarkdown) {
      menu.addItem((item) => item.setTitle("Canonization requires a Markdown note or folder").setDisabled(true));
      return;
    }
    for (const [passId, pass] of Object.entries(CANONIZATION_PASSES)) {
      menu.addItem((item) => item.setTitle(pass.label).setIcon(passId === "full" ? "network" : "scan-search").onClick(() => {
        if (isFolder) this.runSemanticCanonizationFolder(target, passId);
        else this.runSemanticCanonizationCurrentNote(target, passId);
      }));
    }
  }

  async runSemanticCanonizationFolder(folder, passId = "claims") {
    if (!this.settings.useSemanticCanonization) return new Notice("Select ‘Use Semantic AI for canonization’ in the Canon Workbench first.");
    const semantic = this.app.plugins?.getPlugin?.("semantic-ai");
    if (!semantic?.classifier) return new Notice("Semantic AI is not loaded. Enable it in Community Plugins and try again.");
    if (!semantic.settings?.categories?.some((entry) => entry.id === "Canonization" && entry.enabled)) return new Notice("The Semantic AI Canonization category is missing or disabled.");
    const configuration = semantic.classifier.validateConfiguration();
    if (!configuration.valid) return new Notice(`Semantic AI is not ready: ${configuration.error}`);
    const prefix = folder.path ? `${folder.path}/` : "";
    const files = this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(prefix));
    if (!files.length) return new Notice("That folder contains no Markdown notes.");
    if (files.length > 25 && !window.confirm(`Run ${CANONIZATION_PASSES[passId]?.label || passId} on ${files.length} Markdown notes? This may make many Semantic AI calls.`)) return;
    const notice = new Notice(`Canonization: running ${CANONIZATION_PASSES[passId]?.label || passId} on ${files.length} notes with two bounded workers…`, 0);
    const results = await mapLimit(files, 2, async (file) => {
      const result = await this.runSemanticCanonizationCurrentNote(file, passId, { quiet: true, openResult: false });
      return { file: file.path, ok: Array.isArray(result?.proposals), proposals: result?.proposals?.length || 0, error: result?.error || null };
    });
    notice.hide();
    const passed = results.filter((row) => row.ok).length;
    const proposals = results.reduce((sum, row) => sum + row.proposals, 0);
    const root = normalizePath(`${this.settings.candidateReviewRoot}/_semantic_ai_intake`); await this.store.ensureFolder(root);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const receipt = { packet_version: "semantic-ai-folder-canonization/1.0.0", status: CANDIDATE_STATUS, folder: folder.path, pass: passId, file_count: files.length, completed: passed, proposal_count: proposals, results, canonical_admission_performed: false };
    const path = normalizePath(`${root}/${stamp}-${slug(folder.name) || "FOLDER"}-${passId}-${crypto.randomUUID().slice(0, 8)}-folder-receipt.json`);
    await this.app.vault.create(path, JSON.stringify(receipt, null, 2) + "\n");
    new Notice(`Folder canonization complete: ${passed}/${files.length} notes, ${proposals} proposals, zero admissions.`);
  }

  async runClassificationProfile(forcedFile = null, options = {}) {
    const profile = this.classificationProfile(this.settings.activeClassificationProfile);
    if (!profile) return new Notice("No enabled classification profile is configured.");
    const profileContext = this.profileInstruction(profile);
    if (profile.mode === "pipeline") return this.runThreeStageCandidatePipeline(forcedFile, { ...options, profile, profileContext });
    return this.runSemanticCanonizationCurrentNote(forcedFile, profile.passId || "claims", { ...options, profile, profileContext });
  }

  canonizationTagsFromParsedResponse(parsedResponse) {
    if (!Array.isArray(parsedResponse)) return [];
    return parsedResponse.flatMap((response) => {
      if (!response || typeof response !== "object") return [];
      const label = response.label || response.exact_claim || response.proposed_text || response.title || response.name;
      if (!label) return [];
      const metadata = response.metadata && typeof response.metadata === "object" ? { ...response.metadata } : {};
      for (const key of ["exact_claim", "proposed_text", "target_canon_id", "target_section", "source_file", "source_span", "proposed_object_type", "register", "warrant", "dependencies", "support", "defeat_conditions", "open_fields", "proposed_lane", "truth_predicates", "truth_statements", "bfp_dg", "exact_negation", "countermodels", "discriminating_tests", "contradiction_hooks"]) {
        if (metadata[key] === void 0 && response[key] !== void 0) metadata[key] = response[key];
      }
      return [{ uuid: response.uuid || null, label: String(label), metadata }];
    });
  }

  exchangeJsonRoot() {
    const configured = String(this.settings.exchangeCandidateJsonPath || "").trim();
    if (configured) return configured;
    return nodePath.resolve(this.app.vault.adapter.getBasePath(), "..", "..", "60_EXCHANGE", "CANDIDATE_JSON");
  }

  async exchangeJsonDestination(packet, fileName, run = null) {
    const paper = safeFilePart((packet.source_file || packet.folder || "UNSCOPED").split("/").pop().replace(/\.md$/i, "")) || "UNSCOPED";
    const runId = safeFilePart(run?.runFolder?.split("/").pop() || new Date().toISOString().replace(/[-:.]/g, "")) || "UNSCOPED_RUN";
    const folder = nodePath.join(this.exchangeJsonRoot(), paper, runId);
    await fs.promises.mkdir(folder, { recursive: true });
    return nodePath.join(folder, fileName);
  }

  async writeExchangeJson(filePath, value) {
    await fs.promises.writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
  }

  externalFileUri(filePath) {
    return `file:///${encodeURI(String(filePath).replace(/\\/g, "/"))}`;
  }

  async prepareBfpRun(file, bundle) {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const paper = slug(file.basename) || "NOTE";
    const runFolder = normalizePath(`${this.settings.candidateReviewRoot}/01_RUNS/${paper}/${stamp}-${crypto.randomUUID().slice(0, 8)}`);
    const sourceFolder = normalizePath(`${runFolder}/SOURCE`);
    const masterPath = normalizePath(`${this.settings.candidateReviewRoot}/00_TEMPLATE/DEEPSEEK_DISCOVERY_GRAMMAR_TO_ATOM_BUILDER_TEMPLATE_v2.1.md`);
    const master = this.app.vault.getAbstractFileByPath(masterPath);
    if (!(master instanceof TFile)) throw new Error(`BFP-DG master template is missing: ${masterPath}`);
    let folderCursor = "";
    for (const segment of sourceFolder.split("/")) {
      folderCursor = folderCursor ? `${folderCursor}/${segment}` : segment;
      await this.store.ensureFolder(folderCursor);
    }
    const sourceSnapshot = normalizePath(`${sourceFolder}/${safeFilePart(file.name)}`);
    const templateCopy = normalizePath(`${runFolder}/BFP_DG_TO_ATOM__${paper}.md`);
    const sourceText = await this.app.vault.read(file);
    const sourceHash = await this.sha256Text(sourceText);
    const templateText = await this.app.vault.read(master);
    const runContext = `\n\n> [!info] Run context\n> **Source:** \`${file.path}\`  \n> **Run folder:** \`${runFolder}\`  \n> **Source snapshot:** [[${sourceSnapshot}]]  \n> **Status:** ${CANDIDATE_STATUS}\n`;
    const preparedTemplate = templateText.replace("{{RAW_INPUT}}", sourceText)
      .replace("{{SOURCE_TITLE}}", file.basename)
      .replace("{{SOURCE_PATH_OR_URL}}", file.path)
      .replace("{{AUTHOR_OR_SPEAKER}}", "UNKNOWN")
      .replace("{{DATE_OR_TIMESTAMP}}", new Date(file.stat.mtime).toISOString())
      .replace("{{SOURCE_SPAN}}", "whole note")
      .replace("{{HASH_OR_RECEIPT}}", `SHA-256:${sourceHash}`) + runContext;
    await this.app.vault.create(sourceSnapshot, sourceText);
    await this.app.vault.create(templateCopy, preparedTemplate);
    return { runFolder, sourceSnapshot, templateCopy, sourceFile: file.path };
  }

  async writeBfpRunProjection(run, packet) {
    if (!run || packet.canonization_pass !== "discovery") return null;
    const template = this.app.vault.getAbstractFileByPath(run.templateCopy);
    if (!(template instanceof TFile)) return null;
    const sourceTemplate = await this.app.vault.read(template);
    const proposalOutput = packet.proposals.map((proposal) => ({
      candidate_id: proposal.candidate_id,
      source_span: proposal.source_span,
      truth_statements: proposal.truth_statements,
      exact_negation: proposal.exact_negation,
      countermodels: proposal.countermodels,
      discriminating_tests: proposal.discriminating_tests,
      contradiction_hooks: proposal.contradiction_hooks,
      defeat_conditions: proposal.defeat_conditions,
      bfp_dg: proposal.bfp_dg,
      open_fields: proposal.open_fields
    }));
    const filled = `${sourceTemplate}\n\n# Generated nondiscriminatory BFP-DG output\n\n> [!warning] ${CANDIDATE_STATUS}\n> This section is generated from the authoritative JSON packet. It does not classify, admit, or replace the preserved template.\n\n**Authoritative JSON:** [open external packet](${packet.packet_path ? this.externalFileUri(packet.packet_path) : "#"})\n\n\`\`\`json\n${JSON.stringify(proposalOutput, null, 2)}\n\`\`\`\n`;
    const outputPath = normalizePath(`${run.runFolder}/01_DISCOVERY_FILLED__${slug(packet.source_file.split("/").pop() || "NOTE")}.md`);
    await this.app.vault.create(outputPath, filled);
    return outputPath;
  }

  async runThreeStageCandidatePipeline(forcedFile = null, options = {}) {
    const file = forcedFile || this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") return { error: "Open the Markdown note you want Semantic AI to examine." };
    const stages = ["discovery", "classification", "reconciliation"];
    const results = [];
    let priorStage = null;
    const notice = options.quiet ? null : new Notice("Semantic AI: running three-stage candidate pipeline…", 0);
    for (const stage of stages) {
      const result = await this.runSemanticCanonizationCurrentNote(file, stage, { quiet: true, openResult: false, priorStage, run: priorStage?.run || null, profile: options.profile || null, profileContext: options.profileContext || "" });
      if (result?.error) {
        notice?.hide();
        if (!options.quiet) new Notice(`Candidate pipeline stopped at ${CANONIZATION_PASSES[stage].label}: ${result.error}`, 10000);
        return { error: result.error, stage, results };
      }
      results.push({ stage, packet: result.packet, jsonFile: result.jsonFile, mdFile: result.mdFile, run: result.run || null, proposalCount: result.proposals?.length || 0 });
      priorStage = result;
    }
    const root = normalizePath(`${this.settings.candidateReviewRoot}/_semantic_ai_intake`);
    await this.store.ensureFolder(root);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const receipt = {
      packet_version: "semantic-ai-three-stage-pipeline/1.0.0",
      status: CANDIDATE_STATUS,
      source_file: file.path,
      classification_profile: options.profile?.id || "candidate-pipeline",
      stages: results.map((row) => ({ stage: row.stage, packet: row.jsonFile.path, proposals: row.proposalCount })),
      canonical_admission_performed: false,
      human_ruling_required: true
    };
    const receiptPath = await this.exchangeJsonDestination(receipt, `00_THREE_STAGE_RECEIPT_${stamp}.json`, results[0]?.run || null);
    await this.writeExchangeJson(receiptPath, receipt);
    const receiptFile = { path: receiptPath, name: nodePath.basename(receiptPath), extension: "json" };
    notice?.hide();
    if (!options.quiet) {
      new Notice(`Three-stage pipeline complete: ${results.reduce((total, row) => total + row.proposalCount, 0)} candidate proposals; zero admissions.`);
      await this.openFile(results[2].mdFile);
    }
    return { packet: results[2].packet, proposals: results[2].packet.proposals || [], results, receiptFile };
  }

  async runSemanticCanonizationCurrentNote(forcedFile = null, passId = "full", options = {}) {
    if (passId === "full") return this.runThreeStageCandidatePipeline(forcedFile, options);
    if (!this.settings.useSemanticCanonization) return new Notice("Select ‘Use Semantic AI for canonization’ in the Canon Workbench first.");
    const pass = CANONIZATION_PASSES[passId] || CANONIZATION_PASSES.full;
    const file = forcedFile || this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") return new Notice("Open the Markdown note you want Semantic AI to examine.");
    const semantic = this.app.plugins?.getPlugin?.("semantic-ai");
    if (!semantic?.classifier) return new Notice("Semantic AI is not loaded. Enable it in Community Plugins and try again.");
    const semanticCategory = options.profile?.semanticCategory || "Canonization";
    if (!semantic.settings?.categories?.some((entry) => entry.id === semanticCategory && entry.enabled)) return new Notice(`The Semantic AI ${semanticCategory} category is missing or disabled.`);
    const validation = semantic.classifier.validateConfiguration();
    if (!validation.valid) return new Notice(`Semantic AI is not ready: ${validation.error}`);
    const notice = options.quiet ? null : new Notice(`Semantic AI: ${pass.label}…`, 0);
    const progress = options.quiet ? null : new CanonizationProgressModal(this.app, pass.label, file.path);
    progress?.open();
    try {
      progress?.setStatus("Reading and preserving the source", "Preparing the source bundle and provenance before analysis.");
      const bundle = await this.store.sourceBundleForCard(file);
      const bfpRun = options.run || (passId === "discovery" ? await this.prepareBfpRun(file, bundle) : null);
      const priorContext = options.priorStage?.packet ? `\n\nPRIOR STAGE OUTPUT — ${options.priorStage.packet.canonization_pass_label || "candidate-only"}\nThis is prior candidate output, not truth or admission. Retain its OPEN fields and correct it only by making an explicit new proposal:\n${JSON.stringify(options.priorStage.packet.proposals || [], null, 2)}` : "";
      const profileContext = options.profileContext ? `\nPROFILE: ${options.profile?.name || "Custom"}\n${options.profileContext}` : "";
      const sourceChunks = semanticChunks(bundle.text);
      const instruction = `CANONIZATION PASS: ${pass.label}\nSTAGE: ${pass.stage || "specialized"}\nEXTRACTION MODE: PROSPECTIVE AND EXHAUSTIVE. Do not scan for material already called canonized. Identify source content that could possibly become a candidate after human review. Existing canonization labels are neither required nor evidence of admission.\nBOUNDARY: ${pass.instruction}${profileContext}\nEvery output remains CANDIDATE_DRAFT — NOT ADMITTED.${priorContext.slice(0, 12000)}`;
      const allTags = [];
      let lastRawResponse = "";
      let lastParsedCount = 0;
      for (let chunkIndex = 0; chunkIndex < sourceChunks.length; chunkIndex++) {
        progress?.setStatus(`DeepSeek is analyzing section ${chunkIndex + 1} of ${sourceChunks.length}`, `Large notes are processed in bounded sections. ${allTags.length} parseable objects found so far.`);
        const directedText = `${instruction}\n\nSOURCE SECTION ${chunkIndex + 1} OF ${sourceChunks.length}:\n${sourceChunks[chunkIndex]}`;
        const chunkResult = await semantic.classifier.classifySingleType(directedText, semanticCategory, file.path);
        lastRawResponse = chunkResult.rawResponse || "";
        lastParsedCount = chunkResult.parsedResponseCount || 0;
        const convertedTags = Array.isArray(chunkResult.tags) ? chunkResult.tags : [];
        const fallbackTags = convertedTags.length ? [] : this.canonizationTagsFromParsedResponse(chunkResult.parsedResponse);
        allTags.push(...(convertedTags.length ? convertedTags : fallbackTags));
      }
      const seenTags = new Set();
      const result = { tags: allTags.filter((tag) => {
        const exact = tag.metadata?.exact_claim || tag.label || tag.uuid;
        const key = String(exact).trim().toLowerCase().replace(/\s+/g, " ");
        if (seenTags.has(key)) return false;
        seenTags.add(key); return true;
      }) };
      progress?.setStatus("Validating returned objects", `Semantic AI returned ${result.tags.length} unique parseable object${result.tags.length === 1 ? "" : "s"} from ${sourceChunks.length} section${sourceChunks.length === 1 ? "" : "s"}. Applying pass boundaries now.`);
      if (!result.tags.length) {
        const preview = allTags.length ? "Tags existed before deduplication." : "No tags survived Semantic AI conversion.";
        const error = new Error(`DeepSeek returned no parseable canonization objects from any source section. ${preview} The run was stopped instead of writing an empty success packet.`);
        error.semanticDiagnostics = {
          source_sections: sourceChunks.length,
          raw_response_excerpt: String(lastRawResponse || "").slice(0, 6000),
          parsed_response_count: lastParsedCount
        };
        throw error;
      }
      const allowedLanes = new Set(["definition", "mathematical_component", "theological_component", "bridge_claim", "scripture_anchor", "dependency_graph", "proposal", "review_queue", "receipt"]);
      let proposals = result.tags.map((tag, index) => {
        const metadata = tag.metadata && typeof tag.metadata === "object" ? tag.metadata : {};
        const requested = String(metadata.proposed_lane || "proposal").toLowerCase();
        return {
          candidate_id: `SEM-${String(index + 1).padStart(3, "0")}`,
          label: tag.label,
          exact_claim: metadata.exact_claim || tag.label,
          proposed_text: metadata.proposed_text || metadata.exact_claim || tag.label,
          target_canon_id: metadata.target_canon_id || this.store.meta(file).canon_id || "OPEN",
          target_section: metadata.target_section || SECTION_BY_LANE[requested] || "Open Research Questions",
          source_file: metadata.source_file || file.path,
          category: "Canonization",
          proposed_lane: allowedLanes.has(requested) ? requested : "proposal",
          proposed_object_type: metadata.proposed_object_type || "OPEN",
          register: metadata.register || "OPEN",
          warrant: metadata.warrant || "OPEN",
          source_span: metadata.source_span || "OPEN",
          dependencies: asArray(metadata.dependencies),
          support: asArray(metadata.support),
          defeat_conditions: asArray(metadata.defeat_conditions),
          truth_statements: asArray(metadata.truth_statements).length ? asArray(metadata.truth_statements) : [metadata.exact_claim || tag.label],
          exact_negation: metadata.exact_negation || "OPEN",
          countermodels: asArray(metadata.countermodels),
          discriminating_tests: asArray(metadata.discriminating_tests),
          contradiction_hooks: asArray(metadata.contradiction_hooks),
          bfp_dg: metadata.bfp_dg && typeof metadata.bfp_dg === "object" ? metadata.bfp_dg : {},
          open_fields: asArray(metadata.open_fields).length ? asArray(metadata.open_fields) : ["Human review required"],
          truth_predicates: metadata.truth_predicates && typeof metadata.truth_predicates === "object" ? metadata.truth_predicates : {},
          semantic_uuid: tag.uuid || null
        };
      });
      if (pass.lanes) proposals = proposals.filter((item) => pass.lanes.includes(item.proposed_lane));
      if (pass.requireTruthPredicates) proposals = proposals.filter((item) => item.truth_predicates && Object.keys(item.truth_predicates).length);
      const root = normalizePath(`${this.settings.candidateReviewRoot}/_semantic_ai_intake`);
      await this.store.ensureFolder(root);
      const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
      const base = `${stamp}-${passId}-${slug(file.basename) || "NOTE"}-${crypto.randomUUID().slice(0, 8)}`;
      const updates = [];
      const directMeta = this.store.meta(file);
      if (directMeta.canon_id) {
        updates.push({ canon_id: directMeta.canon_id, card: file.path, outcomes: await this.store.accumulateProposals(file, proposals, bundle.paths) });
      } else {
        const byTarget = new Map();
        for (const item of proposals) {
          if (!item.target_canon_id || item.target_canon_id === "OPEN") continue;
          if (!byTarget.has(item.target_canon_id)) byTarget.set(item.target_canon_id, []);
          byTarget.get(item.target_canon_id).push(item);
        }
        const cards = await this.store.cards();
        for (const [target, items] of byTarget) {
          const card = cards.find((entry) => this.store.meta(entry).canon_id === target);
          if (card) updates.push({ canon_id: target, card: card.path, outcomes: await this.store.accumulateProposals(card, items, bundle.paths) });
        }
      }
      const packet = { packet_version: "semantic-ai-canonization-intake/2.4.0", status: CANDIDATE_STATUS, canonization_pass: passId, canonization_pass_label: pass.label, canonization_stage: pass.stage || null, classification_profile: options.profile?.id || null, classification_profile_name: options.profile?.name || null, classification_categories: options.profile?.categories || [], prior_stage_packet: options.priorStage?.jsonFile?.path || null, source_file: file.path, bundled_sources: bundle.paths, source_mtime: file.stat.mtime, semantic_category: semanticCategory, provider: semantic.settings.provider, run_folder: bfpRun?.runFolder || null, source_snapshot: bfpRun?.sourceSnapshot || null, template_copy: bfpRun?.templateCopy || null, result_count: proposals.length, proposals, candidate_card_updates: updates, canonical_admission_performed: false, source_modified: false, human_ruling_required: true };
      const stageNumber = String(pass.stage || 0).padStart(2, "0");
      const packetPath = await this.exchangeJsonDestination(packet, `${stageNumber}_${String(passId).toUpperCase()}_PACKET.json`, bfpRun);
      packet.packet_path = packetPath;
      await this.writeExchangeJson(packetPath, packet);
      const jsonFile = { path: packetPath, name: nodePath.basename(packetPath), extension: "json" };
      const filledTemplateFile = await this.writeBfpRunProjection(bfpRun, packet);
      const postgresHandoff = await this.writePostgresHandoff(packet, jsonFile);
      const lines = ["---", `title: \"Semantic AI Canonization Intake — ${escapeYaml(file.basename)}\"`, `date: ${new Date().toISOString()}`, `source: \"${escapeYaml(file.path)}\"`, `canonization_pass: \"${passId}\"`, `status: \"${CANDIDATE_STATUS}\"`, "authority: \"DISCOVERY ONLY — HUMAN REVIEW REQUIRED\"", "---", "", `# Semantic AI Canonization Intake — ${file.basename}`, "", `> [!warning] ${CANDIDATE_STATUS}`, "> Semantic AI categorized possible canonization objects. It did not validate truth, move the source, or admit anything.", "", `- **Pass:** ${pass.label}`, `- **Proposals:** ${proposals.length}`, `- **Authoritative JSON:** [open external packet](${this.externalFileUri(jsonFile.path)})`, ""];
      for (const item of proposals) { lines.push(`## ${item.candidate_id} — ${item.label}`, "", `- **Proposed lane:** ${item.proposed_lane}`, `- **Object type:** ${item.proposed_object_type}`, `- **Register:** ${item.register}`, `- **Warrant:** ${item.warrant}`, `- **Source span:** ${item.source_span}`, "", "### Defeat conditions", ""); if (item.defeat_conditions.length) item.defeat_conditions.forEach((value) => lines.push(`- ${value}`)); else lines.push("- OPEN"); lines.push("", "### OPEN fields", ""); item.open_fields.forEach((value) => lines.push(`- [ ] ${value}`)); lines.push(""); }
      for (const item of proposals) { lines.push(`### BFP-DG statement record — ${item.candidate_id}`, "", "#### Truth statements", ""); item.truth_statements.forEach((value) => lines.push(`- ${value}`)); lines.push("", "#### Tests and contradiction hooks", "", `- **Exact negation:** ${item.exact_negation}`); if (item.countermodels.length) lines.push(`- **Countermodels/rivals:** ${item.countermodels.join("; ")}`); if (item.discriminating_tests.length) lines.push(`- **Discriminating tests:** ${item.discriminating_tests.join("; ")}`); if (item.contradiction_hooks.length) lines.push(`- **Contradiction hooks:** ${item.contradiction_hooks.join("; ")}`); if (Object.keys(item.bfp_dg).length) lines.push("", "#### BFP-DG answers", "", "```json", JSON.stringify(item.bfp_dg, null, 2), "```"); lines.push(""); }
      if (updates.length) { lines.push("## Candidate-card accumulation", ""); for (const update of updates) lines.push(`- **${update.canon_id}:** ${update.outcomes.filter((row) => row.inserted).length} proposed blocks added; ${update.outcomes.filter((row) => !row.inserted).length} duplicates or blocked.`); lines.push(""); }
      const receiptPath = bfpRun ? normalizePath(`${bfpRun.runFolder}/${stageNumber}_${String(passId).toUpperCase()}_RECEIPT.md`) : normalizePath(`${root}/${base}.md`);
      const mdFile = await this.app.vault.create(receiptPath, lines.join("\n") + "\n");
      notice?.hide();
      progress?.finish(proposals.length);
      if (!options.quiet) new Notice(`${pass.label}: ${proposals.length} candidate object${proposals.length === 1 ? "" : "s"}; ${updates.length} card${updates.length === 1 ? "" : "s"} accumulated. Zero admissions.`);
      if (options.openResult !== false) { if (directMeta.canon_id) new CanonCardReviewModal(this.app, this, file).open(); else await this.openFile(mdFile); }
      return { packet, proposals, jsonFile, mdFile, postgresHandoff, run: bfpRun, filledTemplateFile };
    } catch (error) {
      notice?.hide();
      const message = error.message || String(error);
      progress?.fail(message);
      let failureFile = null;
      try {
        const failureRoot = normalizePath(`${this.settings.candidateReviewRoot}/_semantic_ai_intake/_failures`);
        await this.store.ensureFolder(failureRoot);
        const failureStamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
        const failure = {
          packet_version: "semantic-ai-canonization-failure/1.0.0",
          status: "FAILED — NO CANDIDATE PACKET CREATED",
          source_file: file.path,
          canonization_pass: passId,
          canonization_pass_label: pass.label,
          semantic_category: semanticCategory,
          provider: semantic.settings.provider,
          error: message,
          diagnostics: error.semanticDiagnostics || null,
          canonical_admission_performed: false,
          source_modified: false,
          created_at: new Date().toISOString()
        };
        failureFile = await this.app.vault.create(normalizePath(`${failureRoot}/${failureStamp}-${passId}-${slug(file.basename) || "NOTE"}-${crypto.randomUUID().slice(0, 8)}.json`), JSON.stringify(failure, null, 2) + "\n");
      } catch (receiptError) { console.error("Could not write Semantic AI failure receipt", receiptError); }
      if (!options.quiet) new Notice(`Semantic AI canonization failed: ${message}${failureFile ? ` Failure receipt: ${failureFile.path}` : ""}`, 15000);
      return { error: message, failureFile };
    }
  }

  async writePostgresHandoff(packet, sourcePacket) {
    if (!this.settings.postProcessing?.postgresHandoff) return null;
    const root = normalizePath(`${this.settings.candidateReviewRoot}/_postgres_handoff_outbox`);
    await this.store.ensureFolder(root);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const handoff = {
      format: "canonization-postgres-handoff/1.0.0",
      status: CANDIDATE_STATUS,
      source_packet: sourcePacket.path,
      vault: this.app.vault.getName(),
      requested_at: new Date().toISOString(),
      operation: "UPSERT_CANDIDATE_ONLY",
      packet,
      canonical_admission_performed: false,
      helper_contract: "A local helper may ingest this outbox item into a candidate table. It must reject admission, active-pointer, and source-rewrite operations."
    };
    return this.app.vault.create(normalizePath(`${root}/${stamp}-${crypto.randomUUID().slice(0, 8)}-candidate-handoff.json`), JSON.stringify(handoff, null, 2) + "\n");
  }

  async runPropagationPreview() {
    const file = this.app.workspace.getActiveFile();
    const meta = file ? this.store.meta(file) : {};
    if (!meta.canon_id) return new Notice("Open a canonical card before running propagation preview.");
    try {
      const major = Number(String(meta.version || "1.0").split(".")[0]);
      const response = await fetch(`${this.settings.engineUrl}/propagation/preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ card_id: meta.canon_id, old: `${Math.max(1, major - 1)}.0`, new: String(meta.version) }) });
      if (!response.ok) throw new Error(`Engine returned ${response.status}`);
      const result = await response.json();
      new Notice(`Preview ${result.run_id}: ${result.proposal_ids.length} proposals, zero automatic writes.`);
      await this.activateView();
    } catch (error) { new Notice(`Canon Engine unavailable: ${error.message || error}`); }
  }

  nerveAtoms(packet) {
    if (Array.isArray(packet?.atoms)) return packet.atoms;
    if (packet?.atom && typeof packet.atom === "object") return [packet.atom];
    if (packet?.['@type'] === "tp:Atom") return [packet];
    return [];
  }

  nerveProjection(atom, packetPath) {
    const identity = atom.identity || {}, axes = atom.axes || {}, claim = atom.claim || {}, admission = atom.admission || {};
    const edges = Array.isArray(atom.edge_proposals) ? atom.edge_proposals : [];
    const depends = edges.filter((edge) => edge.predicate === "dependsOn").map((edge) => `${edge.target?.atom || "OPEN"}@${edge.target?.version || "UNPINNED"}`);
    const supports = edges.filter((edge) => edge.predicate === "supports").map((edge) => `${edge.target?.atom || "OPEN"}@${edge.target?.version || "UNPINNED"}`);
    const contradicts = edges.filter((edge) => ["contradicts", "falsifies", "challenges"].includes(edge.predicate)).map((edge) => `${edge.target?.atom || "OPEN"}@${edge.target?.version || "UNPINNED"}`);
    const list = (name, values) => values.length ? `${name}:\n${values.map((value) => `  - ${yamlQuoted(`[[${value}]]`)}`).join("\n")}` : `${name}: []`;
    return `---
canonical_id: ${yamlQuoted(identity.atom_family || identity.id || "OPEN")}
atom_uuid: ${yamlQuoted(atom['@id'] || "OPEN")}
object_type: ${yamlQuoted(identity.object_type || "OPEN")}
register: ${yamlQuoted(axes.register || atom.register_anatomy?.register || "OPEN")}
epistemic_status: ${yamlQuoted(axes.status || "OPEN")}
lifecycle: ${yamlQuoted(axes.lifecycle_state || "candidate")}
proof_status: ${yamlQuoted(axes.proof_class || "NOT_APPLICABLE")}
why_closure: ${yamlQuoted(axes.why_outcome || "OPEN")}
needs_review: true
canonical_admission: false
schema_version: ${yamlQuoted("claim-atom/1.1")}
source_packet: ${yamlQuoted(packetPath)}
property_ownership: ${yamlQuoted("generated_projection")}
${list("depends_on", depends)}
${list("supports", supports)}
${list("contradicts", contradicts)}
---

# ${claim.statement_plain || claim.statement_technical || identity.atom_family || "Nerve candidate"}

> [!warning] CANDIDATE DRAFT — VALIDATED BY NERVE FORMAT ONLY — NOT ADMITTED
> This note is an Obsidian projection of the preserved Nerve JSON packet. Edit human-owned fields through the governed round-trip workflow; do not treat this projection as a second source of truth.

## Exact technical statement

${claim.statement_technical || "OPEN"}

## Plain-language statement

${claim.statement_plain || "OPEN"}

## Scope

${claim.scope || "OPEN"}

## Truth space

- **Exact negation:** ${atom.truth_space?.exact_negation || "OPEN"}
- **Kill condition:** ${atom.truth_space?.kill_condition || "OPEN"}
- **Countermodels:** ${atom.truth_space?.countermodels || "OPEN"}
- **Terminus:** ${atom.terminus?.kind || "OPEN"}
- **Next discriminating test:** ${atom.terminus?.next_discriminating_test || "OPEN"}

## Authority boundary

- Candidate graph: ${admission.graph || "candidate"}
- Human ruling: ${admission.human_ruling || "not_performed"}
- Admission event: ${admission.admission_event ? "PRESENT — VERIFY SEPARATELY" : "none"}
- Full-fidelity source: [[${packetPath}]]
`;
  }

  async persistNervePacket(packet) {
    const atoms = this.nerveAtoms(packet);
    if (!atoms.length) throw new Error("No candidate atom was present in the Nerve packet.");
    for (const atom of atoms) {
      const admission = atom?.admission || {};
      if (admission.graph !== "candidate" || admission.human_ruling !== "not_performed" || admission.admission_event) {
        throw new Error("Incoming packet crossed the candidate-only boundary and was refused.");
      }
    }
    const root = normalizePath(`${this.settings.canonRoot}/03_CANDIDATE_PACKETS/NERVE_IMPORTS`);
    await this.store.ensureFolder(root);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const run = `${stamp}-${crypto.randomUUID().slice(0, 8)}`;
    const packetPath = normalizePath(`${root}/${run}-nerve-candidate-packet.json`);
    const jsonFile = await this.app.vault.create(packetPath, JSON.stringify(packet, null, 2) + "\n");
    for (const atom of atoms) {
      const identity = atom.identity || {};
      const name = `${safeFilePart(identity.atom_family || identity.id || "ATOM")}-v${safeFilePart(identity.version || "OPEN")}.md`;
      await this.app.vault.create(normalizePath(`${root}/${run}-${safeFilePart(atom['@id'] || "atom")}-${name}`), this.nerveProjection(atom, jsonFile.path));
    }
    new Notice(`Nerve packet preserved: ${atoms.length} Obsidian projection${atoms.length === 1 ? "" : "s"}; zero admissions.`);
    return jsonFile;
  }

  async persistNerveDraft(packet) {
    const root = normalizePath(`${this.settings.canonRoot}/00_DRAFTS/NERVE`); await this.store.ensureFolder(root);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const file = await this.app.vault.create(normalizePath(`${root}/${stamp}-${crypto.randomUUID().slice(0, 8)}-nerve-editable-draft.json`), JSON.stringify(packet, null, 2) + "\n");
    new Notice("Editable Nerve draft preserved in Obsidian; not validated or admitted."); return file;
  }

  async handleNerveMessage(event) {
    const message = event?.data;
    if (!message || message.source !== "nerve-atom-builder") return;
    try {
      if (message.type === "candidate-packet") await this.persistNervePacket(message.payload);
      else if (message.type === "editable-draft") await this.persistNerveDraft(message.payload);
    } catch (error) { new Notice(`Nerve/Obsidian bridge failed safely: ${error.message || error}`); }
  }

  async importActiveNerveDraft() {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "json") return new Notice("Open a Nerve editable-draft JSON file first.");
    try {
      const payload = JSON.parse(await this.app.vault.read(file));
      if (!(payload.nerve_draft || payload.draft_snapshot || (payload.atoms && payload.html))) return new Notice("This is a candidate packet, not an editable Nerve draft snapshot.");
      const leaf = await this.activateNerveBuilder();
      setTimeout(() => leaf?.view?.frame?.contentWindow?.postMessage({ type: "nerve-import-draft", payload }, "*"), 900);
    } catch (error) { new Notice(`Could not import Nerve draft: ${error.message || error}`); }
  }

  async openFile(file) { await this.app.workspace.getLeaf(false).openFile(file); }
  async activateNerveBuilder() {
    const leaf = this.app.workspace.getRightLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE_NERVE_BUILDER, active: true });
    this.app.workspace.revealLeaf(leaf); return leaf;
  }
  async activateView() {
    const leaf = this.app.workspace.getRightLeaf(false);
    await leaf.setViewState({ type: VIEW_TYPE_CANON, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
};
