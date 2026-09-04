# ATOM Builder Prompt Rail — Codex Implementation Brief

## Objective

Extend the existing Claim Atom Builder into a prompt-driven construction workbench. Do not replace or visually redesign the builder. Preserve its fields, vocabulary, validation, JSON view, candidate-packet semantics, and governance boundary.

Historical source reference:

`D:\GitHub\Canonizationv1\Canonization\web\nerve-source\atom-builder.html`

That file is preserved source and must not be edited in place. Integrate a working copy/component into `workbench/`.

## Governing distinction

The implementation has two complementary lanes:

1. **Schema-bound prompt rail** — prompts whose answers map one-for-one to existing ATOM fields.
2. **Open-discovery rail** — questions and findings that matter but do not honestly fit any existing field. These remain unclassified candidates in Discovery Commons until a human maps them, creates a new field, or leaves them open.

Never force open discoveries into the nearest available box.

## Prompt hierarchy

Every model request is composed from versioned layers:

1. global canonization governance prompt;
2. ATOM Builder system prompt explaining the complete record and workflow;
3. object/section prompt such as Claims, Evidence, Proof, Process, Lineage, or Discovery;
4. individual field prompt;
5. preserved source text and verified source coordinates;
6. previously human-accepted fields needed as context;
7. exact JSON response schema.

The UI must make the effective prompt inspectable. Users can edit a draft prompt, rerun it, compare responses, and deliberately lock a successful prompt version. Do not silently overwrite prompt history.

## Field prompt rail

Attach a compact prompt control immediately above, below, or beside every existing ATOM field. Use stable human-readable sequence codes such as:

- `ID001` identity and UUID explanation
- `C001` claim statement
- `C002` claim mode
- `E001` evidence object
- `PF001` proof/formal statement
- `PR001` process or derivation step
- `L001` lineage or graph relationship

The stable field key, not its screen position, is authoritative.

Each collapsed rail shows:

- sequence code;
- prompt status: unconfigured, draft, tested, or locked;
- answer status: unanswered, proposed, accepted, revised, deferred, or rejected;
- enable/disable switch;
- Generate or Regenerate action.

Each expanded rail shows:

- field purpose;
- editable field question/prompt;
- inherited section system prompt;
- effective composed prompt preview;
- expected response type and allowed enum values;
- proposed answer;
- verified source anchors;
- model/provider/version and run receipt;
- confidence and warnings;
- response history;
- Accept, Revise, Reject, Defer, Regenerate, and Lock Prompt controls.

For controlled vocabulary fields, render model output as a suggested dropdown selection. Preserve the raw proposal and rationale. A suggestion never changes canon status.

## Primary interaction: sticky walkthrough tray

Do not require dozens of prompt editors to remain open in the form. Add one sticky prompt tray at the bottom of the existing builder. It controls and highlights the currently active field or open question.

The tray displays:

- stable code and field/question name;
- current position and total, such as `17 / 84`;
- editable effective question;
- proposed answer and evidence anchors;
- Generate, Accept, Revise, Reject, Defer, Regenerate, Previous, Next, and Jump actions;
- an `Accept and advance` action for rapid review;
- pause/resume state persisted across sessions.

Example progression:

```text
C001 Raw Statement
  -> C002 Statement Preview
  -> C003 Atom Family
  -> C004 Claim Mode
  -> E001 Evidence Object
  -> PF001 Formal Statement
  -> PR001 Derivation Step
```

Accepting a proposal fills the candidate packet and advances to the next enabled item. It never grants canon status.

The prompt tray has two first-class modes:

1. `ATOM FIELDS` — ordered schema-bound questions that may populate existing fields.
2. `OPEN DISCOVERY` — important questions or findings that are not constrained to any existing field.

Users can switch modes, interleave them, or run enabled items from both in a single Builder pass.

## Dedicated Prompt Library

Add one page dedicated to all reusable prompts. This is the configuration and prompt-development surface; the sticky tray is the paper-specific answering surface.

The Prompt Library must support:

- search, section filter, status filter, and ordering;
- stable code, section, target field or open purpose, prompt status, and version;
- global Builder prompt;
- section system prompts;
- field prompts;
- open-discovery prompts;
- draft/test/lock lifecycle;
- immutable prior versions and comparison;
- test against a selected preserved source without changing canon;
- enable/disable and drag/reorder without changing stable identity.

### Per-prompt generation controls

Every global, section, field, and open-discovery prompt may define generation controls. Provide sensible inherited defaults and permit a field-level override:

- `temperature` — provider-supported numeric value, with plain-language labels such as Direct, Balanced, and Exploratory;
- `extraction_strictness` — Conservative, Balanced, or Exhaustive;
- `materiality_threshold` — minimum argumentative importance required for extraction;
- `max_results` — optional output ceiling;
- `deduplicate_by_argumentative_role` — collapse paraphrases that perform the same job while preserving their source anchors;
- `include_background_statements` — normally false for claim extraction;
- `require_source_anchor` — normally true;
- `require_why_it_matters` — require the model to explain the item's role in the argument;
- `novelty_policy` — source-only, source-implied, or exploratory;
- `confidence_floor` — items below the floor go to Open Discovery or are omitted according to the prompt policy.

Do not treat temperature as an importance filter. Temperature changes response variability. Claim noise is governed primarily by extraction strictness, materiality, argumentative-role deduplication, and result limits.

Suggested presets:

| Preset | Temperature | Strictness | Intended use |
|---|---:|---|---|
| Direct | 0.0-0.2 | Conservative | Canonical claim extraction, evidence anchors, UUID/lineage explanation |
| Balanced | 0.2-0.4 | Balanced | Definitions, relationships, ordinary ATOM construction |
| Exploratory | 0.6-0.9 | Exhaustive | Open questions, implications, possible connections, Discovery Commons |

For claims, the default should be Direct plus Conservative. Extract a statement only when it performs a material argumentative role: premise, conclusion, definition, dependency, objection, bridge, prediction, boundary, or required background proposition. A merely true sentence is not automatically a claim worth canonizing.

Every run receipt records the resolved values actually sent to the provider. If the selected provider does not support a control, display that fact rather than pretending it was applied.

Suggested namespaces:

- `ID###` — identity and lineage metadata
- `C###` — claims
- `E###` — evidence
- `PF###` — proof and formal verification
- `PR###` — process and derivation
- `L###` — lineage and graph relations
- `Q###` — open questions
- `D###` — open discoveries
- `X###` — cross-field or cross-object relationships

Codes are stable identifiers, not merely display numbering. Reordering changes sequence metadata, not the code.

## Section prompts

Claims, Evidence, Proof, Process/Derivation, Identity/Lineage, and other coherent groups each have an editable, versioned system prompt. The section prompt explains the job of that section once; field prompts ask only the field-specific question.

Allow sections and individual fields to be enabled or disabled for a run.

## Open-discovery rail

Provide an always-available panel titled `Questions Beyond the Schema` or `Discovery Commons`.

It accepts:

- user-authored questions;
- model-proposed questions created by the source;
- novel relationships;
- unresolved tensions;
- candidate fields the existing ATOM schema does not express;
- observations explicitly marked `NO CURRENT FIELD`.

Each item receives a UUID, source anchors where available, provenance, prompt/run receipt, and candidate status. It can later be mapped to an ATOM field, converted into a question/claim/evidence object, retained in Discovery Commons, or rejected by human ruling.

An open question or discovery may map to zero, one, or many fields. Never impose one-question-to-one-field cardinality. Supported dispositions are:

- populate one existing field;
- contribute to several existing fields;
- create a new claim, evidence, proof task, process step, prediction, objection, or relationship object;
- propose a new reusable schema field;
- remain open in Discovery Commons;
- defer or reject by human ruling.

The governing flow is:

```text
question -> discovery -> human disposition
                         -> one field
                         -> multiple fields
                         -> new object
                         -> proposed schema extension
                         -> remain open
```

## Execution model

Avoid one expensive request per field as the default.

### Pass 1 — Builder

Send the global prompt, relevant section prompts, all enabled field questions, preserved source, and accepted context. Return one structured JSON packet containing proposed answers per stable field key plus open-discovery candidates.

### Pass 2 — Audit and repair

Audit the proposed packet for:

- missing or unverifiable anchors;
- duplicated or sentence-fragment claims;
- claims that perform the same argumentative job;
- cross-field contradiction;
- improper claim-mode classification;
- unsupported strengthening or weakening;
- evidence/proof/category confusion;
- information forced into an unsuitable field;
- important unanswered questions outside the schema.

Return corrections, warnings, suggested rulings, and a repaired candidate packet. Do not admit anything to canon.

### Exception calls

Allow field-level or section-level regeneration after the two-pass run. The request includes the current packet so repairs remain context-aware.

## Required JSON shape

```json
{
  "builder_run_uuid": "program-generated UUID",
  "prompt_versions": {
    "global": "version/hash",
    "builder": "version/hash",
    "sections": {},
    "fields": {}
  },
  "field_results": [
    {
      "field_key": "C002",
      "enabled": true,
      "suggested_value": "PHILOSOPHICAL",
      "allowed_values": ["LOGICAL", "MATHEMATICAL", "EMPIRICAL", "HISTORICAL", "PHILOSOPHICAL", "THEOLOGICAL", "BRIDGE", "ANALOGY", "CONJECTURE"],
      "rationale": "...",
      "source_anchors": ["verbatim source quotation"],
      "confidence": 0.82,
      "warnings": [],
      "answer_status": "PROPOSED"
    }
  ],
  "open_discoveries": [
    {
      "discovery_uuid": "program-generated UUID",
      "question_or_finding": "...",
      "reason_no_current_field": "...",
      "source_anchors": [],
      "candidate_status": "CANDIDATE_DRAFT — NOT ADMITTED"
    }
  ],
  "candidate_packet_status": "CANDIDATE_DRAFT — NOT ADMITTED"
}
```

UUID values are generated by application code, never invented by the model. An identity field may ask the model to explain lineage or recommend relationships, but not create authoritative identity.

## Governance requirements

- Generation creates proposals only.
- `Accept` places a value into the candidate ATOM packet; it does not canonize it.
- Canon promotion remains a separate authenticated ruling.
- Bulk acceptance/ruling requires explicit selection and confirmation.
- Every bulk action creates an individual immutable audit record per affected object.
- Preserve raw model output, parsed output, repairs, prompt hashes, timestamps, provider/model, and failures.
- Failed or malformed calls must never produce an empty success packet.

## Acceptance criteria

1. The existing builder remains recognizable and functionally intact.
2. Every visible ATOM field has a matching stable prompt rail.
3. Every section has a versioned system prompt.
4. The effective prompt for any field is inspectable.
5. Enabled fields can run together in a two-pass Builder/Audit sequence.
6. Any field or section can be regenerated independently.
7. Controlled fields provide editable dropdown suggestions.
8. Open discoveries survive without forced classification.
9. Prompt and response history is append-only.
10. No AI action grants canon status.
11. Completed candidate packets can later be submitted to the existing governed Canonization service without changing JSON authority.
12. Automated tests cover prompt composition, response validation, UUID generation, history preservation, bulk atomicity, open-discovery preservation, and authority boundaries.
13. A sticky bottom tray supports accept-and-advance across all enabled items.
14. A dedicated Prompt Library manages all global, section, field, and open-discovery prompts.
15. Open questions can map to zero, one, or many ATOM fields or create new governed candidate objects.
16. Prompt-level temperature and extraction controls are editable, inherited, visible in receipts, and provider-aware.
17. Conservative claim extraction rejects incidental truths that perform no material argumentative role.

## First implementation slice

Implement one vertical slice before expanding across every field:

1. integrate a working copy of the existing builder;
2. add section prompts for Claims and Evidence;
3. add prompt rails for five representative fields of different types: free text, enum/dropdown, list, source-anchor, and identity explanation;
4. implement the two-pass Builder/Audit API contract;
5. implement open-discovery capture;
6. persist prompt versions, raw responses, parsed proposals, and human field decisions;
7. prove that accepted values remain candidate-only;
8. then generate the remaining field rails from a declarative field registry rather than hand-coding them.
