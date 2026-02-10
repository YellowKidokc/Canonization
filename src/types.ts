// CKG Axis 1: "What is this?" — Epistemic classification types
// CKG Axis 2: "Where does this resonate?" — Domain mapping (see Domain type below)
//
// Every element gets tagged on BOTH axes:
//   TagType  = epistemic identity (Axiom, Claim, Hypothesis, …)
//   Domain[] = resonance domains  (Physics, Theology, Mathematics, …)

// Tag types supported by the plugin
export type TagType =
  // --- Core CKG epistemic types ---
  | 'Axiom'           // Foundational truth, no prior proof needed
  | 'Claim'           // Asserted position, can be supported/refuted
  | 'Hypothesis'      // Testable conjecture not yet confirmed
  | 'Definition'      // Formal specification of meaning
  | 'Theory'          // Coherent explanatory framework
  | 'Observation'     // Empirical or experiential datum
  | 'Law'             // Universal regularity (physical, logical, moral)
  | 'Theorem'         // Formally derived from axioms
  | 'Lemma'           // Supporting result used to prove a theorem
  | 'Canonical'       // Authoritative/settled element in the framework
  | 'EvidenceBundle'  // Collection of evidence supporting a claim/axiom
  // --- Structural / relational types ---
  | 'ScientificProcess'
  | 'Relationship'
  | 'InternalLink'
  | 'ExternalLink'
  | 'ProperName'
  | 'ForwardLink'
  | 'WordOntology'
  | 'Sentence'
  | 'Paragraph'
  | 'Custom';

// CKG Axis 2: Domain resonance — "Where does this resonate?"
export type Domain =
  | 'Physics'
  | 'Theology'
  | 'Mathematics'
  | 'InformationTheory'
  | 'Consciousness'
  | 'Morality'
  | 'Cosmology'
  | 'Biology'
  | 'Philosophy'
  | 'History';

// All domain values for iteration
export const ALL_DOMAINS: Domain[] = [
  'Physics', 'Theology', 'Mathematics', 'InformationTheory',
  'Consciousness', 'Morality', 'Cosmology', 'Biology',
  'Philosophy', 'History'
];

// Core CKG epistemic types (Axis 1) for quick reference
export const CKG_TYPES: TagType[] = [
  'Axiom', 'Claim', 'Hypothesis', 'Definition', 'Theory',
  'Observation', 'Law', 'Theorem', 'Lemma', 'Canonical', 'EvidenceBundle'
];

// A semantic tag with UUID and hierarchy support
export interface SemanticTag {
  type: TagType;
  uuid: string;
  label: string;
  parentUuid: string | null;
  customType?: string; // For custom tag types
  domains?: Domain[]; // CKG Axis 2: which domains this element resonates in
  metadata?: Record<string, unknown>;
}

// Parsed tag from file content
export interface ParsedTag {
  raw: string;
  tag: SemanticTag;
  lineNumber: number;
}

// Classification result from AI
export interface ClassificationResult {
  tags: SemanticTag[];
  mermaidGraph?: string;
  summary?: string;
}

// Batch processing result
export interface BatchResult {
  file: string;
  success: boolean;
  tagCounts: Record<TagType, number>;
  error?: string;
}

// Prompt template for a tag type
export interface PromptTemplate {
  type: TagType | 'Custom';
  name: string;
  prompt: string;
  isDefault: boolean;
  customKeyword?: string;
}

// Custom classifier definition
export interface CustomClassifier {
  id: string;
  keyword: string;
  prompt: string;
  enabled: boolean;
}

// Plugin settings
export interface SemanticAISettings {
  // AI Provider settings
  aiProvider: 'openai' | 'anthropic' | 'ollama' | 'custom';
  apiKey: string;
  apiEndpoint: string;
  modelName: string;

  // Prompt templates
  prompts: Record<TagType, string>;

  // Custom classifiers
  customClassifiers: CustomClassifier[];

  // UI settings
  showHiddenTags: boolean;
  autoGenerateMermaid: boolean;
  mermaidPosition: 'append' | 'panel';

  // Graph settings
  graphDirection: 'TD' | 'LR' | 'BT' | 'RL';
  graphTheme: 'default' | 'forest' | 'dark' | 'neutral';

  // Batch processing
  confirmBatchProcessing: boolean;
  showTokenEstimate: boolean;

  // Backend sync (Phase 2)
  enablePostgresSync: boolean;
  postgresConnections: PostgresConnection[];
  activeConnectionId: string | null;
  pythonServiceUrl: string;

  // CKG Domain Mapping (Axis 2)
  enableDomainMapping: boolean;
  domainMappingPrompt: string;

  // Legacy (for migration)
  postgresConnectionString?: string;
}

// Postgres connection profile
export interface PostgresConnection {
  id: string;
  name: string;
  connectionString: string;
  lastTested: string | null;
  lastTestStatus: 'success' | 'failed' | 'never';
  lastTestMessage: string | null;
}

// Default prompts for each tag type
export const DEFAULT_PROMPTS: Record<TagType, string> = {
  // --- Core CKG epistemic types (Axis 1) ---
  Axiom: `Identify core foundational truths in this document. These are axioms — statements that do not rely on prior proof and support other claims. They are self-evident starting points of a deductive chain. Return each axiom with a clear, concise label.`,

  Claim: `Identify any claims made by the author. A claim asserts a position that can be supported or refuted by evidence or argument. It is not self-evident (unlike an axiom) and requires justification. Return each claim with a descriptive label.`,

  Hypothesis: `Identify testable conjectures or proposed explanations that have not yet been confirmed or refuted. A hypothesis is a predictive statement derived from theory or observation that awaits empirical or formal validation. Return each hypothesis with a label stating what it predicts.`,

  Definition: `Identify formal definitions — statements that specify the precise meaning of a term, symbol, or concept within the framework. A definition establishes what something IS, not what it does or implies. Return each definition with its term and concise meaning.`,

  Theory: `Identify coherent explanatory frameworks — structured sets of principles, axioms, and derived results that together explain a domain of phenomena. A theory is broader than a single claim or hypothesis; it organises multiple elements into a unified account. Return each theory with a label naming the framework.`,

  Observation: `Identify empirical or experiential data points — specific things noted, measured, or witnessed. An observation is a raw datum, not yet interpreted as evidence for a particular claim. Return each observation with a label describing what was observed.`,

  Law: `Identify universal regularities stated as laws — physical laws, logical laws, or moral laws that assert invariant relationships. A law is more established than a hypothesis and typically expressed as a precise equation or rule. Return each law with its name or formulation.`,

  Theorem: `Identify formally derived results — propositions that follow deductively from axioms, definitions, and previously proved results. A theorem has a proof chain back to foundational axioms. Return each theorem with a label and note which axioms or lemmas it depends on.`,

  Lemma: `Identify supporting results used as stepping stones toward proving a theorem. A lemma is a subsidiary proposition proved for use in a larger proof. Return each lemma with a label and note what it supports.`,

  Canonical: `Identify authoritative, settled elements in the framework — items that have achieved canonical status through review, proof, or community acceptance. These are the load-bearing pillars of the knowledge graph. Return each canonical element with a label and its basis for canonical status.`,

  EvidenceBundle: `Identify evidence used to support claims or axioms. This may be empirical data, quotes, citations, logical arguments, or experimental results grouped together. Return each piece of evidence with a label describing what it supports.`,

  // --- Structural / relational types ---
  ScientificProcess: `Identify any scientific processes, methodologies, or experimental procedures described in the text. Return each with a label describing the process.`,

  Relationship: `Identify explicit or implicit relationships between concepts, entities, or events in the text. Return each relationship with a label describing the connection.`,

  InternalLink: `Identify references to other notes or sections within this document or vault. Return each with a label.`,

  ExternalLink: `Identify references to external sources, URLs, or citations. Return each with a descriptive label.`,

  ProperName: `Identify proper names of people, places, organizations, or specific entities mentioned in the text. Return each with contextual information.`,

  ForwardLink: `Identify concepts or topics that could be expanded in future notes or require further exploration. Return each with a suggested focus.`,

  WordOntology: `Identify specialized terms and link them to their definitions, origins, or ontological categories. Return each term with its category and definition.`,

  Sentence: `Identify key sentences that contain important claims, evidence, or concepts. Return each with a label describing its significance.`,

  Paragraph: `Identify paragraphs that form logical units of thought. Return each with a summary label.`,

  Custom: `Analyze the text according to the specified criteria. Return findings with descriptive labels.`
};

// Default domain mapping prompt (CKG Axis 2)
export const DEFAULT_DOMAIN_PROMPT = `For each semantic element identified, also determine which knowledge domains it resonates in. A single element can belong to multiple domains.

Available domains:
- Physics: Classical mechanics, quantum mechanics, thermodynamics, electromagnetism, relativity, field theory
- Theology: Scripture, doctrine, divine attributes, soteriology, eschatology, pneumatology
- Mathematics: Algebra, topology, analysis, logic, set theory, category theory, proof theory
- InformationTheory: Entropy, information, computation, signal, encoding, complexity
- Consciousness: Qualia, awareness, perception, phenomenology, neural correlates, hard problem
- Morality: Ethics, virtue, justice, moral law, deontology, teleology, moral ontology
- Cosmology: Origin, cosmic structure, dark energy, inflation, fine-tuning, multiverse
- Biology: Evolution, genetics, ecology, neuroscience, abiogenesis, systems biology
- Philosophy: Metaphysics, epistemology, ontology, philosophy of mind, philosophy of science
- History: Historical events, historical theology, history of science, historiography

Return domains as a JSON array of strings for each element, e.g. "domains": ["Physics", "Mathematics"]`;

// Default settings
export const DEFAULT_SETTINGS: SemanticAISettings = {
  aiProvider: 'openai',
  apiKey: '',
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  modelName: 'gpt-4o-mini',

  prompts: { ...DEFAULT_PROMPTS },
  customClassifiers: [],

  showHiddenTags: false,
  autoGenerateMermaid: true,
  mermaidPosition: 'panel',

  graphDirection: 'TD',
  graphTheme: 'default',

  confirmBatchProcessing: true,
  showTokenEstimate: true,

  enableDomainMapping: true,
  domainMappingPrompt: DEFAULT_DOMAIN_PROMPT,

  enablePostgresSync: false,
  postgresConnections: [
    {
      id: 'default',
      name: 'Local Development',
      connectionString: 'postgresql://postgres:password@localhost:5432/theophysics',
      lastTested: null,
      lastTestStatus: 'never',
      lastTestMessage: null
    }
  ],
  activeConnectionId: null,
  pythonServiceUrl: 'http://localhost:5000'
};

// AI response format
export interface AIClassificationResponse {
  type: TagType;
  label: string;
  parentLabel?: string;
  confidence?: number;
  domains?: Domain[]; // CKG Axis 2: domain resonance from AI
  metadata?: Record<string, unknown>;
}

// Token estimation
export interface TokenEstimate {
  inputTokens: number;
  estimatedOutputTokens: number;
  estimatedCost: number;
}
