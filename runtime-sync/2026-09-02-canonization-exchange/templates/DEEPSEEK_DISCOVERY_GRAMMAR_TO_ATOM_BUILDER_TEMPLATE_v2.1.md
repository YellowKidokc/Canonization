# DeepSeek Fillable Template v2.1 - Discovery Grammar -> ATOM Builder

> [!warning] Candidate-only intake
> This template creates local candidate analysis packets only. It does **not** admit a canon object, mutate `index.sqlite`, call an API, or promote Candidate to Admitted.

## Canon Workbench field map

### What the UI asks for

| Step | Field | What it asks for | Required? | Notes |
|---|---|---|---|---|
| 01 SELECT | Select intake | New object / New version / Correction / Edge update | yes | Selection changes nothing. |
| 01 SELECT | Source URI or local path | File path, URL, source object ID, or receipt path | yes | Preserve source before interpreting. |
| 01 SELECT | Source span | Line/section/paragraph span | recommended | Needed for correction printing and provenance. |
| 01 SELECT | Target atom family | Existing family or NEW | conditional | Required for successor/correction/edge update. |
| 01 SELECT | Current version | Existing version being corrected/superseded | conditional | Never overwrite sealed versions. |
| 02 ACT | Proposed operation | Proposed candidate action | yes | Create candidate, successor, correction, or edge update. |
| 03 STAGE | Gaps and impact | Missing fields and downstream impact | yes | Expose blast radius before ruling. |
| 04 PREVIEW | Candidate packet | Inspect generated packet | yes | View only; still not admitted. |
| 05 APPROVE | Ruling actor | Named human reviewer | yes | Human gate only. |
| 05 APPROVE | Proposed ruling | Return/revise/admit/reject/etc. | yes | Preparing ruling packet is not applying ruling. |
| 05 APPROVE | Ruling date | Exact date | yes | Use concrete date. |
| 05 APPROVE | Rationale | Why ruling is warranted | yes | Required before any external promotion flow. |

### What the object is trying to define

| Layer | Defines | Template section | Authority |
|---|---|---|---|
| Source preservation | raw text, source, span, hash/receipt, loss | 1 | descriptive only |
| Forward discovery | what the expression does/requires | 2 | analysis only |
| Truth predicates | condensed true/false-testable statements local to the unit | 2.5 | candidate predicates only |
| Reverse reconstruction | what observations recover from below | 3 | analysis only |
| Invariant signature | identity/distinction/relation/operation/dependency signature | 4 | analysis only |
| Convergence | forward/reverse agreement | 5 | analysis only |
| Classification proposal | object type, role/species, register, scope | 6 | proposed only |
| Register-native opening | claim/evidence/proof/process/bridge opening packet | 7 | proposed only |
| Predicate weighting | truth predicates dominate; falsifiers are capped whole-paper endcap | 8 | review required |
| Why-Closure | why structure holds or remains open | 9 | proposed closure |
| Delta/loss | what was added, inferred, lost, unresolved | 10 | audit only |
| Atom lineage | UUIDs, graph links, evidence/proof/countermodel references | 11 | candidate packet |
| Human ruling | reviewer decision fields | 12 | human only |
| Compact view | readable projection | 13 | projection only |
| Census | completeness and flags | 14 | computed audit |

## Operating rules for the model

1. Preserve the source before interpreting it.
2. Answer Q0-Q18 without using controlled taxonomy labels as conclusions.
3. Do not classify the object in Q14-Q18. Q14 describes function; Q15-Q18 expose atomicity, use/assertion, level, and domain-ablated structure.
4. Run reverse reconstruction independently.
5. Compare forward and reverse signatures before classification.
6. Extract truth predicates as candidate compressed statements before classification, but do not canonize them.
7. Only then propose object, role/species, register, and scope.
7. Test/rival/failure analysis comes before Why-Closure.
8. Canon status remains `CANDIDATE_DRAFT - NOT ADMITTED` until human ruling.
9. Mark source/inference/speculation boundaries explicitly.
10. Compute the census from prior answers. Do not invent completeness.

---

# 1. RAW INPUT / SOURCE

## 1.1 Raw expression or passage

INPUT:
```text
{{RAW_INPUT}}
```

ANSWER:
```text
[Preserve the raw expression exactly. If exact preservation is impossible, state the loss.]
```

QUESTION ACCOUNTING:
```yaml
status: "FULL/PARTIAL/OPEN/UNKNOWN/CONTRADICTED/NOT_APPLICABLE"
confidence: "low/medium/high"
source_refs: []
flags: []
human_review_required: "yes/no"
```

## 1.2 Source metadata

ANSWER:
```yaml
source_title: "{{SOURCE_TITLE}}"
source_path_or_url: "{{SOURCE_PATH_OR_URL}}"
author_or_speaker: "{{AUTHOR_OR_SPEAKER}}"
date_or_timestamp: "{{DATE_OR_TIMESTAMP}}"
page_section_or_span: "{{SOURCE_SPAN}}"
hash_or_receipt: "{{HASH_OR_RECEIPT}}"
extraction_notes: ""
verbatim_preserved: "yes/no/partial"
known_loss_or_uncertainty: ""
human_cleanup_needed: "yes/no"
```

---

# 2. FORWARD DISCOVERY - Q0 THROUGH Q18

> [!warning] Firewall
> No final controlled classification in this section. Use functional descriptions only. Say "appears to function as" rather than "is a Claim/Evidence/Bridge."

Use this answer block for each Q0-Q18:

```yaml
question_id: "Q#"
question: ""
answer: ""
basis:
  explicit: []
  inferred: []
  speculative: []
question_accounting:
  status: "FULL/PARTIAL/OPEN/UNKNOWN/CONTRADICTED/NOT_APPLICABLE"
  confidence: "low/medium/high"
  source_refs: []
  flags: []
  human_review_required: "yes/no"
```

## Q0 - What exactly was expressed?
ANSWER:
```text

```

## Q1 - What is being picked out?
ANSWER:
```text
[Referent, cardinality, stability, ontic status.]
```

## Q2 - What makes it this rather than not-this?
ANSWER:
```text
[Identity and distinction conditions.]
```

## Q3 - What must already hold for this to mean anything?
ANSWER:
```text
[Formulation, coherence, existence dependencies.]
```

## Q4 - What may vary while this remains the same thing?
ANSWER:
```text
[State versus invariant.]
```

## Q5 - What can it do, undergo, combine with, preserve, forbid?
ANSWER:
```text
[Operational signature.]
```

## Q6 - What connects one valid state to another?
ANSWER:
```text
[Transition, rule, mechanism.]
```

## Q7 - What limits the possibilities?
ANSWER:
```text
[Constraints, boundaries, domain limits.]
```

## Q8 - What follows, and with what necessity?
ANSWER:
```yaml
logically_necessary: []
conditional: []
probabilistic_or_expected: []
interpretive: []
speculative: []
non_consequences: []
```

## Q9 - In what forms can it be represented?
ANSWER:
```text
[Plain language, formal logic, mathematics, diagram, code, narrative, table, etc.]
```

## Q10 - What does each representation preserve and lose?
ANSWER:
```yaml
representations:
  - form: ""
    preserves: []
    loses: []
    distortion_risk: ""
```

## Q11 - What would reality look like if true?
ANSWER:
```yaml
observable: []
expected: []
allowed_but_not_required: []
unexpected: []
strongly_discriminating: []
non_discriminating: []
```

## Q12 - What would reality look like if false?
ANSWER:
```yaml
observable: []
expected: []
allowed_but_not_required: []
unexpected: []
strongly_discriminating: []
non_discriminating: []
```

## Q13 - What evidence discriminates between true-space and false-space?
ANSWER:
```yaml
discriminators:
  - evidence_or_test: ""
    supports_true_if: ""
    supports_false_if: ""
    does_not_discriminate_when: ""
    evidence_needed: ""
```

## Q14 - What role did the expression actually play in its native context?
ANSWER:
```text
[Describe function only. Do not use the controlled classification list here.]
```
ROLE DESCRIPTION:
```text

```
WHAT IT WAS USED TO DO:
```text

```
WHAT DEPENDED ON IT:
```text

```
WHAT IT DID NOT DO:
```text

```

## Q15 - What is the smallest independently reviewable unit here?
ANSWER:
```yaml
atomization:
  smallest_unit: ""
  contains_multiple_units: "yes/no/unknown"
  candidate_units:
    - unit_id: "a1"
      text_or_span: ""
      independently_reviewable_as: "true/false/valid/invalid/revisable/other"
      depends_on_units: []
  split_recommended: "yes/no"
  split_reason: ""
```

## Q16 - What is being asserted, and what is merely being used?
ANSWER:
```yaml
asserted: []
presupposed: []
used_as_premise: []
quoted_or_reported: []
illustrative_only: []
not_asserted_here: []
contamination_risk: ""
```

## Q17 - At what level is this operating?
ANSWER:
```yaml
level:
  primary: "object-level/model-level/meta-level/method-level/language-level/workflow-level/mixed/unresolved"
  secondary: []
level_shift_detected: "yes/no/unknown"
level_shift_description: ""
illicit_level_jump_risk: ""
```

## Q18 - What remains if domain-specific vocabulary is removed?
ANSWER:
```yaml
domain_specific_terms_removed: []
domain_ablated_signature:
  identities: []
  distinctions: []
  relations: []
  operations: []
  dependencies: []
  constraints: []
  invariants: []
  collapse_conditions: []
  observable_consequences: []
plain_domain_ablated_summary: ""
bridge_testing_use: "Compare this signature against other domain-ablated signatures, not against surface vocabulary."
```

---

# 3. REVERSE RECONSTRUCTION - B0 THROUGH B8

> [!warning] Rival preservation rule
> Preserve rivals. Do not collapse ground-class analysis into the preferred project conclusion.

Use this answer block for each B0-B8:

```yaml
question_id: "B#"
question: ""
answer: ""
inference_type: "descriptive/inductive/comparative/mechanistic/deductive/abductive/mixed"
question_accounting:
  status: "FULL/PARTIAL/OPEN/UNKNOWN/CONTRADICTED/NOT_APPLICABLE"
  confidence: "low/medium/high"
  source_refs: []
  flags: []
  human_review_required: "yes/no"
```

## B0 - What is actually observed / experienced?
ANSWER:
```text

```

## B1 - What pattern repeats?
ANSWER:
```text

```

## B2 - What remains invariant across cases?
ANSWER:
```text

```

## B3 - What operation / transformation preserves or produces it?
ANSWER:
```text

```

## B4 - What constraints are required?
ANSWER:
```text

```

## B5 - What dependencies do those constraints require?
ANSWER:
```text

```

## B6 - What is the minimal structure capable of supplying them?
ANSWER:
```text

```

## B7 - What candidate ground classes could account for that structure?
ANSWER:
```yaml
candidate_ground_classes:
  - class: ""
    explains: []
    fails_to_explain: []
    extra_assumptions: []
    unique_prediction: ""
```

## B8 - What competing ground classes remain?
ANSWER:
```yaml
remaining_competitors:
  - class: ""
    still_viable_because: ""
    weakened_by: []
    discriminator_needed: ""
```

---

# 4. INVARIANT SIGNATURES

## 4.1 Forward signature S_F(x)
ANSWER:
```yaml
identities: []
distinctions: []
relations: []
operations: []
dependencies: []
constraints: []
invariants: []
collapse_conditions: []
observable_consequences: []
```

## 4.2 Reverse signature S_R(x)
ANSWER:
```yaml
identities: []
distinctions: []
relations: []
operations: []
dependencies: []
constraints: []
invariants: []
collapse_conditions: []
observable_consequences: []
```

---

# 5. CONVERGENCE CHECK - FIELD-BY-FIELD COMPARISON

## 5.1 Signature scorecard
ANSWER:
```yaml
scorecard:
  - invariant: "identity"
    forward: []
    reverse: []
    match: "exact/partial/conflict/absent/unresolved"
    notes: ""
  - invariant: "distinction"
    forward: []
    reverse: []
    match: "exact/partial/conflict/absent/unresolved"
    notes: ""
  - invariant: "relation"
    forward: []
    reverse: []
    match: "exact/partial/conflict/absent/unresolved"
    notes: ""
  - invariant: "operation"
    forward: []
    reverse: []
    match: "exact/partial/conflict/absent/unresolved"
    notes: ""
  - invariant: "dependency"
    forward: []
    reverse: []
    match: "exact/partial/conflict/absent/unresolved"
    notes: ""
  - invariant: "constraint"
    forward: []
    reverse: []
    match: "exact/partial/conflict/absent/unresolved"
    notes: ""
  - invariant: "invariant"
    forward: []
    reverse: []
    match: "exact/partial/conflict/absent/unresolved"
    notes: ""
  - invariant: "collapse_condition"
    forward: []
    reverse: []
    match: "exact/partial/conflict/absent/unresolved"
    notes: ""
  - invariant: "observable_consequence"
    forward: []
    reverse: []
    match: "exact/partial/conflict/absent/unresolved"
    notes: ""
```

## 5.2 Convergence totals
ANSWER:
```yaml
exact_matches: 0
partial_matches: 0
conflicts: 0
forward_only: 0
reverse_only: 0
unresolved: 0
result: "strong/moderate/weak/failed"
reason: ""
```

## 5.3 Tensions, underdetermination, and recovery
ANSWER:
```yaml
matching_structures: []
tensions_or_mismatches: []
underdetermination: []
minimal_recovery: ""
unique_recovery: "unique/plausible_only/failed/unknown"
notes: ""
```

---

# 6. EMERGENT CLASSIFICATION / REGISTER PROPOSAL

> [!warning] Classification gate
> Classification is now allowed, but only as a proposal supported by Sections 2-5. It remains non-authoritative until human ruling.

ANSWER:
```yaml
structural_class:
  value: "state/relation/function/operator/trajectory/proof/evidence_record/process/node/source/media/bridge/other/unresolved"
  confidence: "low/medium/high"
  reason: ""
epistemic_class:
  value: "axiomatic/definitional/deductive/conditional/empirical/historical/abductive/disclosed/interpretive/hypothesis/workflow/unresolved"
  confidence: "low/medium/high"
  reason: ""
register_class:
  primary: "math/physics/empirical_science/theology/scripture/history/philosophy/phenomenology/formal_systems/computation/information/bridge/semantic/canon/workflow/media/other/unresolved"
  secondary: []
  confidence: "low/medium/high"
  reason: ""
primary_object:
  value: "CLAIM/EVIDENCE/PROOF/PROCESS/NODE/SOURCE/MEDIA/BRIDGE/OTHER/UNRESOLVED"
  confidence: "low/medium/high"
  reason: "derived from structural_class + epistemic_class + register_class"
secondary_object:
  value: ""
  confidence: "low/medium/high/not_applicable"
  reason: ""
role_species:
  value: "axiom/definition/theorem/lemma/prediction/bridge/model/method/protocol/evidence_record/proof_step/process_step/correction/ruling/hypothesis/interpretation/analogy/formalization_target/other/unresolved"
  confidence: "low/medium/high"
scope:
  value: ""
classification_basis:
  forward_features: []
  reverse_features: []
  convergence_features: []
  structural_signature_features: []
human_confirmation_required: "yes/no"
review_reason: ""
```

---

# 7. REGISTER-NATIVE OPENING

Fill the matching block. If secondary classification matters, fill a second block and mark it secondary.

## 7.1 Claim opening
ANSWER:
```yaml
claim_statement: ""
claim_type: "descriptive/causal/mathematical/theological/bridge/historical/other"
scope: ""
dependencies: []
rivals: []
failure_conditions: []
```

## 7.2 Evidence opening
ANSWER:
```yaml
source: ""
provenance: ""
protocol_or_method: ""
conditions: ""
raw_record: ""
derived_artifacts: []
controls: []
independence: ""
discriminating_power: ""
```

## 7.3 Proof opening
ANSWER:
```yaml
premises: []
inference_rules: []
derivation_steps: []
conclusion: ""
assumptions: []
receipt: ""
interpretation_boundary: ""
```

## 7.4 Process opening
ANSWER:
```yaml
purpose: ""
inputs: []
preconditions: []
steps: []
decision_points: []
outputs: []
discriminating_power: ""
failure_modes: []
version: ""
run_receipt: ""
```

## 7.5 Bridge opening
ANSWER:
```yaml
domain_a: ""
domain_b: ""
shared_structure: ""
translation_rule: ""
what_is_preserved: []
what_is_lost: []
category_error_risk: ""
boundary_warning: ""
```

---

# 8. PREDICATE WEIGHTING / RIVALS TO REMEMBER

> [!warning] Before closure
> Do not let failure-mode extraction replace truth-predicate extraction. Truth predicates are extracted throughout the paper. Falsifiers are handled like an academic paper: two or three major whole-paper falsification conditions at the end, not dozens of local critiques scattered through the body.

ANSWER:
```yaml
truth_predicate_priority:
  minimum_truth_predicates: "as_many_as_the_source_requires"
  maximum_whole_paper_failure_modes: 3
  falsifier_style: "academic_endcap"
  note: "Extract what the paper positively says throughout. Falsifiers are two or three major whole-paper conditions at the bottom, not local critique spam."
whole_paper_rivals_to_remember_later:
  - rival: ""
    why_it_matters: ""
    discriminator_needed: ""
reclassification_triggers: []
```

---

# 9. WHY-CLOSURE

## 9.1 Main why answer
QUESTION:
```text
Why does this structure hold rather than fail or take a relevant alternative form?
```
ANSWER:
```text

```

## 9.2 Explanation types
ANSWER:
```yaml
descriptive: ""
mechanistic: ""
structural: ""
boundary: ""
historical: ""
grounding: ""
purposive: ""
```

## 9.3 Closure assessment
ANSWER:
```yaml
closure_status: "WHY_CLOSED/WHY_OPEN/WHY_FAILED"
closure_level: "surface/operational/structural/grounding/purposive"
non_restatement_check: ""
remaining_why_gap: ""
```

---

# 10. EPISTEMIC DELTA + LOSS AUDIT

QUESTION:
```text
What do we know after this analysis that was not contained in the raw expression?
```
ANSWER:
```yaml
epistemic_delta:
  explicit_source_content: []
  recovered_structure: []
  derived_results: []
  model_inferences: []
  speculative_extensions: []
  classifications_added: []
  information_lost: []
  unresolved_ambiguities: []
loss_audit:
  source_to_discovery: "lossless/partially_lossy/lossy/not_tested"
  discovery_to_signature: "lossless/partially_lossy/lossy/not_tested"
  signature_to_classification: "lossless/partially_lossy/lossy/not_tested"
  classification_to_compact_output: "lossless/partially_lossy/lossy/not_tested"
  notes: ""
```

---

# 11. ATOM PACKET / UUID / GRAPH LINEAGE

ANSWER:
```yaml
atom_uuid: "pending"
source_uuid: "pending"
expression_uuid: "pending"
discovery_run_uuid: "pending"
reverse_run_uuid: "pending"
convergence_uuid: "pending"
classification_uuid: "pending"
opening_uuid: "pending"
test_uuids: []
receipt_uuid: "pending"
human_ruling_uuid: "pending human ruling"
parent_atom_uuids: []
child_atom_uuids: []
supersedes_uuid: ""
superseded_by_uuid: ""
derived_from_uuids: []
evidence_uuids: []
proof_uuids: []
countermodel_uuids: []
bridge_uuids: []
status: "CANDIDATE_DRAFT_NOT_ADMITTED"
human_ruling: "PENDING"
```

---

# 11.5 WHOLE-PAPER FAILURE ENDCAP

## Academic falsifier rule

Do not attach a falsifier to every truth predicate. Extract truth predicates wherever the paper makes condensed truth-bearing statements. Then, at the bottom, name only the two or three major results that would falsify or seriously weaken the whole paper. Local objections belong in notes, audits, or predicate-level review fields; they do not replace the positive predicate extraction.

> [!warning] Endcap only
> List only the two or three strongest whole-paper failure modes. Do not multiply local objections here. Local tensions belong with their predicates or node notes. Truth predicates are extracted throughout; falsifiers are limited to the main two or three whole-paper conditions.

ANSWER:
```yaml
whole_paper_failure_modes:
  - id: "FM-001"
    statement: ""
    would_break_or_weaken: ""
    blast_radius: "INERT/LOCAL/STRUCTURAL"
    evidence_or_result_needed: ""
  - id: "FM-002"
    statement: ""
    would_break_or_weaken: ""
    blast_radius: "INERT/LOCAL/STRUCTURAL"
    evidence_or_result_needed: ""
  - id: "FM-003"
    statement: "optional"
    would_break_or_weaken: ""
    blast_radius: "INERT/LOCAL/STRUCTURAL"
    evidence_or_result_needed: ""
falsifier_endcap_check:
  truth_predicate_count: 0
  failure_mode_count: 0
  failure_modes_capped_at_three: "yes/no"
  local_critiques_kept_out_of_endcap: "yes/no"
```

---

# 12. HUMAN RULING GATE

ANSWER:
```yaml
generated_by: "DeepSeek/model/API/human"
reviewed_by_human: "yes/no"
admitted_to_canon: "NO"
canon_status: "CANDIDATE_DRAFT - NOT ADMITTED"
human_ruling_required_before_promotion: "YES"
human_ruling_notes: "human only"
```

---

# 13. FINAL COMPACT OUTPUT - VIEW ONLY

> [!warning] Projection only
> This is a projection/view generated from the packet, not a new epistemic stage.

## 13.1 One-paragraph result
ANSWER:
```text

```

## 13.2 What this most likely is
ANSWER:
```text

```

## 13.3 What would break it
ANSWER:
```text

```

## 13.4 What should happen next
ANSWER:
```text

```

---

# 14. ANALYSIS CENSUS / QUESTION ACCOUNTING

> [!warning] Computed only
> Compute this section from all preceding answer blocks. Do not invent completeness. A question may carry multiple flags, so overlapping category totals do not have to equal the total question count.

## 14.1 Overall accounting

ANSWER:
```yaml
declared_questions:
  forward_q0_q18: 19
  truth_predicate_blocks: 3
  reverse_b0_b8: 9
  convergence_checks: 6
  total_core_questions: 38

disposition:
  evaluated: 0
  fully_answered: 0
  partially_answered: 0
  open: 0
  unknown: 0
  contradicted: 0
  not_applicable: 0

quality_flags:
  anomalies: 0
  open_holes: 0
  contradictions: 0
  unsupported_inferences: 0
  classification_uncertainties: 0
  human_review_required: 0

losslessness:
  lossless: 0
  partially_lossy: 0
  lossy: 0
  not_tested: 0
  not_applicable: 0
```

## 14.2 Per-question ledger

ANSWER:
```yaml
questions:
  - question_id: "Q0"
    status: "FULL/PARTIAL/OPEN/UNKNOWN/CONTRADICTED/NOT_APPLICABLE"
    confidence: "low/medium/high"
    basis: "EXPLICIT/INFERRED/SPECULATIVE/MIXED"
    classifications: []
    evidence_refs: []
    anomaly: false
    open_hole: false
    contradiction: false
    unsupported_inference: false
    losslessness: "LOSSLESS/PARTIALLY_LOSSY/LOSSY/NOT_TESTED/NOT_APPLICABLE"
    human_review_required: false
    review_reason: ""
```

Repeat one ledger record for every Q0-Q18, each truth-predicate block, B0-B8, the whole-paper failure endcap, and each separately scored convergence question.

## 14.3 Classification totals

ANSWER:
```yaml
object_types:
  claim: 0
  evidence: 0
  proof: 0
  process: 0
  definition: 0
  bridge: 0
  model: 0
  method: 0
  other: 0
  unresolved: 0

inference_basis:
  explicit: 0
  inferred: 0
  speculative: 0
  mixed: 0

inference_types:
  descriptive: 0
  inductive: 0
  comparative: 0
  mechanistic: 0
  deductive: 0
  abductive: 0

closure:
  why_closed: 0
  why_open: 0
  why_failed: 0
```

## 14.4 Coverage and support

ANSWER:
```yaml
source_preservation:
  verbatim_preserved: "yes/no/partial"
  source_spans_cited: 0
  uncited_interpretations: 0
  known_losses: []

support_coverage:
  claims_identified: 0
  claims_with_evidence: 0
  claims_with_proof: 0
  claims_with_failure_conditions: 0
  claims_with_rivals: 0
  claims_needing_support: 0
  truth_predicates_extracted: 0
  whole_paper_failure_modes: 0
  failure_modes_capped_at_three: "yes/no"

testing_coverage:
  proposed_tests: 0
  passed: 0
  partial: 0
  failed: 0
  untested: 0
```

## 14.5 Exceptions requiring inspection

ANSWER:
```yaml
anomalies:
  - question_id: ""
    source_passage_or_receipt: ""
    trigger: ""
    why_it_matters: ""
    recommended_next_action: ""
open_holes: []
contradictions: []
lossy_transformations: []
unsupported_inferences: []
classification_disputes: []
truth_predicate_disputes: []
predicate_contradictions: []
human_rulings_required: []
```

## 14.6 Census interpretation

ANSWER:
```text
Explain what the totals mean, including the principal strengths, unresolved burdens, anomalies, information loss, and limits of the analysis. State explicitly that overlapping flags mean the displayed category totals may exceed the number of unique questions.
```

---

# APPENDIX G - CATEGORY / REGISTER / OPERATOR ANSWER GUIDE

> [!warning] Use after discovery, not before
> These categories are **answer guides** for Sections 6-8 after Q0-Q18, B0-B8, and convergence have been completed. They are not allowed to control the initial reading of the source.

## G0. Anti-premature-classification rule

Early intake should say:

```yaml
classification: "UNCLASSIFIED"
classification_status: "NOT_YET_ALLOWED"
possible_functions: []
```

Only after convergence may it say:

```yaml
classification_status: "PROPOSED_ONLY"
primary_object:
  value: "..."
entry_route_candidates: []
human_confirmation_required: "yes"
```

The correct language is: **This unit appears to function as...** not **This unit is canonically...**

## G1. Primary object categories

| Category | What it is trying to define | Good answer looks like | Do not use when |
|---|---|---|---|
| CLAIM | A statement that can be affirmed, denied, supported, weakened, or defeated | exact statement, scope, dependencies, rivals, failure conditions | unit is only a source record or media file |
| EVIDENCE | A record or observation offered in support of a claim | provenance, method, raw record, controls, what it supports, what it does not support | unit merely interprets evidence |
| PROOF | A formal or semi-formal derivation from premises to conclusion | premises, inference rules, conclusion, assumptions, receipt, boundary | reasoning is abductive/interpretive only |
| PROCESS | A sequence of operations or workflow | inputs, steps, outputs, decision points, failure modes, run receipt | unit is a static claim |
| NODE | A durable canon/case-file object with identity, dependencies, children, and status | canonical id, exact statement, entry route, graph lineage, max defensible position | unit is just a paragraph or source quote |
| SOURCE | Preserved original material | path/URL, span, hash, author, date, extraction loss | source itself is treated as admitted truth |
| MEDIA | Audio/video/image/slide asset | local path, hosted URL, transcript, claim connection, rights/status | media has no transcript and no claim connection yet |
| AUDIT_RULING | Judgment about right/wrong/overstated/status | actor, date, rationale, changed claim, blast radius | no human or named reviewer has ruled |
| OBJECTION | Challenge to a claim | strongest form, target, force, answer needed, kill potential | only a mild question or note |
| COUNTERMODEL | Rival model where the claim fails or weakens | assumptions, model behavior, affected claim, discriminator | no coherent alternative is specified |
| BRIDGE | Mapping between domains/registers | source domain, target domain, preserved/lost/introduced/forbidden | similarity is vague or merely poetic |
| DERIVATION | Dependency path from premises to result | P1/P2/rule/therefore/weakest step | result is only suggested by analogy |
| FORMAL_RECEIPT | Machine-check/process receipt | theorem name, tool, hash, axioms, sorry/admit, verified/not verified | no actual receipt exists |
| VERSION | Successor or repair of a prior object | supersedes, changed fields, reason, source hash, migration note | it overwrites instead of versioning |
| EDGE_UPDATE | Proposed relationship between objects | typed edge, source uuid, target uuid, version pins, rationale | relation is untyped or unversioned |
| OTHER | Does not fit categories yet | describe function without forcing category | known category fits cleanly |
| UNRESOLVED | Discovery was insufficient/conflicting | open questions, missing evidence, why classification failed | evidence is enough for proposal |

## G2. Register categories

| Register | Native question | Strong answer includes | Boundary warning |
|---|---|---|---|
| math | What follows by definition/proof/structure? | variables, domains, assumptions, proof status | math correspondence is not theological proof |
| physics | What does physical theory/measurement say? | model, observable, experiment, uncertainty | physics does not directly identify Trinity/Grace/Christ |
| empirical_science | What can be observed/tested statistically? | protocol, controls, data, effect size, replication | correlation is not metaphysical closure |
| theology | What is claimed from Christian doctrine/revelation? | Scripture/doctrinal warrant, tradition, scope | disclosure is not lab measurement |
| scripture | What does the text say? | passage, translation, context, interpretive rivals | proof-texting risk |
| history | What happened or is historically argued? | sources, dating, witnesses, rival explanations | historical probability is not formal proof |
| philosophy | What conceptual argument is made? | premises, rivals, entailments, objections | strength depends on accepted premises |
| phenomenology | What is experienced first-person? | experience described, invariants, limits | experience is not automatically universal proof |
| formal_systems | What can a system express/prove/model? | axioms, inference rules, consistency/independence | model result not automatically reality result |
| computation | What follows from computation theory? | algorithm, state, complexity, limits | computation metaphor can overreach ontology |
| information | What is signal/fidelity/meaning/entropy? | definition, channel, semantics boundary | Shannon information is not Logos by identity |
| bridge | What maps between registers? | source/target, preserved/lost/introduced | bridge is not identity by default |
| semantic | What meaning/role is being assigned? | definitions, usage, exclusions | labels are proposals until ruled |
| canon | What status in the admitted framework? | status, ruling, provenance, version | candidate is not admitted |
| workflow | What operation changes/queues/reviews something? | step, actor, inputs, outputs | preparing packet is not applying it |
| media | What asset communicates or records? | file, transcript, claim links | media is not evidence until processed |
| unresolved | Unknown/mixed | why unclear, next discriminator | keep human review required |

## G3. Entry route categories

| Entry route | Meaning | Good answer | Overclaim risk |
|---|---|---|---|
| CONSTITUTIVE | follows from what term/root means | denial changes stipulated meaning | smuggling rich content into definition |
| SELF_DISCLOSED | enters because God/text/revelation declares it | source of disclosure, interpretive warrant | pretending disclosure is derivation |
| DERIVED | follows from named premises/rules | P1/P2/rule/therefore | hiding assumptions |
| MODEL_WITNESSED | shown inside a model | model scope and assumptions | model = reality |
| EMPIRICALLY_WITNESSED | supported by observation/data | data/protocol/controls | correlation = proof |
| HISTORICALLY_WITNESSED | supported by historical record | sources/rivals/probability | history = formal certainty |
| BRIDGE | mapped across domains | preserved/lost/introduced/forbidden | analogy = identity |
| CONVERGENCE | independent structures point similarly | independent sources/common signature | convergence = proof |
| INTERPRETATION | a reading of evidence/text/model | lens and alternatives | interpretation = fact |
| HYPOTHESIS | proposed for testing | test and falsifier | live idea = established claim |
| PROTOCOL | method/run procedure | steps and receipt | workflow = truth |
| CORRECTION | repair to prior object | old/new/blast/rationale | unreviewed repair = admitted change |
| HUMAN_RULING | named reviewer decision | actor/date/rationale | unsigned preference = ruling |

## G4. Operator / edge vocabulary

Use these for graph/API edges. No generic unlabeled arrows.

```yaml
allowed_edges:
  - DECLARES
  - DEFINES
  - DISCLOSES
  - DERIVES
  - REQUIRES
  - GROUNDS
  - EXPECTS
  - WITNESSES
  - SUPPORTS
  - EVIDENCES
  - BRIDGES
  - RESONATES_WITH
  - COUNTERMODELS
  - ATTACKS
  - DEFEATS
  - WEAKENS
  - REPAIRS
  - SUPERSEDES
  - PRESERVES
  - LOSES
  - INTRODUCES
  - FORBIDS
  - FULFILLS
  - CORRECTS
  - RETURNS_FOR_REVISION
  - ADMITS
  - REJECTS
  - RETIRES
```

## G5. Answer patterns by domain

### Physics unit

```yaml
primary_object:
  value: "CLAIM"
role_species:
  value: "hypothesis"
register:
  primary: "physics"
entry_route_candidates: ["EMPIRICALLY_WITNESSED", "MODEL_WITNESSED"]
claim_statement: "Physical law displays stable mathematical regularity."
what_it_supports: "lawfulness/readability witness"
what_it_does_not_support: "direct proof of Trinity, Grace, or Christ"
strongest_failure_condition: "cited physical pattern is false, misquoted, or better explained by rival model without relevant remainder"
```

### Mathematical theorem/proof unit

```yaml
primary_object:
  value: "PROOF"
role_species:
  value: "theorem"
register:
  primary: "math"
entry_route_candidates: ["DERIVED"]
premises: []
inference_rules: []
conclusion: ""
interpretation_boundary: "The theorem establishes only the formal result, not the theological interpretation."
```

### Theology disclosure unit

```yaml
primary_object:
  value: "CLAIM"
role_species:
  value: "interpretation"
register:
  primary: "theology"
entry_route_candidates: ["SELF_DISCLOSED", "INTERPRETATION"]
claim_statement: "God is disclosed as personal/loving/triune."
dependencies: ["Scriptural warrant", "doctrinal interpretation"]
rivals: ["non-Trinitarian monotheism", "deism", "pantheism", "atheism"]
failure_conditions: ["cited disclosure does not support claim", "interpretation collapses under stronger rival reading"]
```

### Bridge unit

```yaml
primary_object:
  value: "BRIDGE"
role_species:
  value: "bridge"
register:
  primary: "bridge"
entry_route_candidates: ["BRIDGE", "CONVERGENCE"]
domain_a: "formal/math/physics"
domain_b: "theology/semantic/narrative"
shared_structure: ""
what_is_preserved: []
what_is_lost: []
category_error_risk: "Treating correspondence as identity or proof."
boundary_warning: "Bridge does not upgrade either domain beyond native warrant."
```

### Media unit

```yaml
primary_object:
  value: "MEDIA"
role_species:
  value: "evidence_record"
register:
  primary: "media"
entry_route_candidates: ["SOURCE", "MEDIA"]
source: "local file or hosted URL"
transcript: "pending|required"
claim_links: []
what_it_supports: "communication/explanation until transcript is tied to a claim"
what_it_does_not_support: "truth of claim merely by existing"
```

### Operator/process unit

```yaml
primary_object:
  value: "PROCESS"
role_species:
  value: "process_step"
register:
  primary: "workflow"
entry_route_candidates: ["PROTOCOL"]
purpose: "prepare candidate packet / version / correction / edge update"
inputs: []
outputs: []
mutation_boundary: "No candidate becomes admitted here."
failure_modes: ["source not preserved", "classification applied too early", "missing human ruling"]
```

## G6. Recommended answer when unsure

```yaml
primary_object:
  value: "OTHER"
  confidence: "low"
  reason: "Forward/reverse/convergence did not support a stable classification."
role_species:
  value: "unresolved"
register:
  primary: "unresolved"
entry_route_candidates: []
human_confirmation_required: "yes"
review_reason: "Classification uncertain; preserve as semantic unit until more evidence is available."
```

Do not force the object into CLAIM or BRIDGE just because the paper is argumentative.


## G7. Truth predicate guide

Truth predicates are the compressed statements the contradiction engine should compare. They should be small enough to be true, false, conditional, or revised without dragging an entire paragraph with them.

Good predicate forms:

```yaml
- statement: "Roothood entails non-derivation."
  predicate_kind: "dependency"
  truth_status: "candidate_true"
  warrant_level: "logical_from_source"
  scope: "within the Root(G) definition"
  does_not_assert: ["Trinity follows from roothood", "Christianity is proven"]

- statement: "Science can witness lawfulness without identifying God directly."
  predicate_kind: "negative_boundary"
  truth_status: "candidate_true"
  warrant_level: "interpretive"
  scope: "Theophysics science interface"
  contradiction_scan_keys: ["science", "witness", "identity", "God"]
```

Bad predicate forms:

```yaml
- statement: "This proves everything."
  problem: "too broad, no scope, no warrant, no failure condition"

- statement: "Physics is grace."
  problem: "category collapse unless explicitly framed as analogy and bounded"
```

Contradiction scan rule:

```text
Compare predicate to predicate, not paragraph to paragraph.
Compare scoped claim to scoped claim, not slogan to slogan.
If scopes differ, flag as possible tension, not contradiction.
```
