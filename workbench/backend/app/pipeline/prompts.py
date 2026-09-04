r"""Prompt templates for the three-call architecture.

Derived from the Canonization build brief and the discovery canons in
D:\GitHub\Faith-through-physics-atoms\_final_api_calls\ (00 three-call pipeline,
01A label-blind question extractor, 02 question→answer resolution canon).

Hard rules encoded in every prompt:
  - LOSSLESS: recover what is present; never rewrite the paper; never answer its questions.
  - Question-first: questions come before classification.
  - Every extracted item is anchored to exact source language (quote + line numbers).
  - All output is CANDIDATE_DRAFT — NOT ADMITTED; a recommendation is never admission.
"""

PROMPT_VERSIONS = {
    1: "1.0.0",
    2: "1.0.0",
    3: "1.0.0",
}

CALL1_LOSSLESS_EXTRACTION = """You are Call 1 (LOSSLESS EXTRACTION) of a three-pass canonization pipeline.

TASK: Recover what is present in the source document WITHOUT classification pressure.
Do NOT rewrite the paper. Do NOT answer its questions. Do NOT generate generic study
questions. Extract only what the text itself presents, each item anchored to exact
source language.

QUESTION-FIRST RULE: ask "What questions does this article itself create pressure
toward?" — questions the text raises, not questions a teacher would ask.

Return ONLY a JSON object with this exact shape:
{{
  "questions": [
    {{"exact_question": "...", "question_type": "DEFINITIONAL|MECHANISTIC|EVIDENTIAL|LOGICAL|MATHEMATICAL|EMPIRICAL|HISTORICAL|PHILOSOPHICAL|THEOLOGICAL|METHODOLOGICAL|BRIDGE|SCOPE|RIVAL_DISCRIMINATION|OTHER",
      "anchor_quote": "verbatim words from the source", "start_line": 0, "end_line": 0,
      "why_pressure": "why the text creates this question", "importance": "LOW|MODERATE|HIGH|CRITICAL|UNKNOWN"}}
  ],
  "claims": [
    {{"exact_claim": "...", "plain_language": "...", "claim_mode": "LOGICAL|EMPIRICAL|HISTORICAL|PHILOSOPHICAL|THEOLOGICAL|MATHEMATICAL|BRIDGE|ANALOGY|CONJECTURE",
      "anchor_quote": "...", "start_line": 0, "end_line": 0}}
  ],
  "definitions": [
    {{"term": "...", "exact_definition": "...", "anchor_quote": "...", "start_line": 0, "end_line": 0}}
  ],
  "true_statements": [
    {{"exact_statement": "one atomic, standalone statement", "plain_meaning": "plain-language meaning",
      "statement_mode": "DEFINITION|LOGICAL|MATHEMATICAL|FORMAL_VERIFIED|EMPIRICAL|HISTORICAL|PHILOSOPHICAL|THEOLOGICAL|BRIDGE|ANALOGY|CONJECTURE",
      "scope": "...", "assumptions": ["..."],
      "anchor_quote": "...", "start_line": 0, "end_line": 0}}
  ],
  "equations": [{{"exact_equation": "...", "anchor_quote": "...", "start_line": 0, "end_line": 0}}],
  "derivations": [{{"summary": "...", "anchor_quote": "...", "start_line": 0, "end_line": 0}}],
  "evidence_references": [{{"description": "...", "anchor_quote": "...", "start_line": 0, "end_line": 0}}],
  "assumptions": [{{"exact_assumption": "...", "anchor_quote": "...", "start_line": 0, "end_line": 0}}],
  "objections": [{{"exact_objection": "...", "anchor_quote": "...", "start_line": 0, "end_line": 0}}],
  "boundaries": [{{"exact_boundary": "what the text says it does NOT establish", "anchor_quote": "...", "start_line": 0, "end_line": 0}}]
}}

RULES:
- anchor_quote MUST be a verbatim substring of the source. If you cannot anchor an
  item to exact source language, drop the item rather than invent an anchor.
- start_line/end_line are 1-based line numbers in the source document.
- true_statements are ATOMIC: one claim per statement, unlimited in number. Do not
  merge. Do not number-limit. Each gets its own object.
- Preserve the distinction between logical, mathematical, empirical, historical,
  philosophical, theological, analogy, and bridge claims. Do not flatten modes.
- Empty arrays are valid. Never invent content to fill a section.

SOURCE DOCUMENT (with line numbers):
{numbered_source}
"""

CALL2_RIGOROUS_EVALUATION = """You are Call 2 (RIGOROUS EVALUATION) of a three-pass canonization pipeline.
You receive the LOSSLESS EXTRACTION from Call 1. You do not add new content; you evaluate.

Evaluate each dimension, preserving the difference between logical, mathematical,
empirical, historical, philosophical, theological, analogy, and bridge claims.
A Lean theorem can verify a formal proposition; it cannot verify a theological
interpretation. Keep modes distinct.

Return ONLY a JSON object:
{{
  "evaluations": [
    {{"item_index": 0, "item_kind": "question|claim|definition|true_statement",
      "logical_validity": 0, "internal_coherence": 0, "definition_precision": 0,
      "evidence_adequacy": 0, "explanatory_compression": 0, "rival_discrimination": 0,
      "testability": 0, "cross_domain_integrity": 0, "adversarial_robustness": 0,
      "epistemic_calibration": 0,
      "scores_are": "0-10 integers; use null where the dimension does not apply to this mode",
      "mode_note": "what changes because of this item's statement mode",
      "anchor_quote": "verbatim anchor from Call 1 (do not modify)"}}
  ],
  "cross_cutting_findings": ["..."]
}}
"""

CALL3_ADVERSARIAL_SYNTHESIS = """You are Call 3 (ADVERSARIAL SYNTHESIS) of a three-pass canonization pipeline.
Your job is to BREAK the strongest charitable reconstruction of the source's argument.
Be adversarial to the argument, charitable to the author.

Return ONLY a JSON object:
{{
  "what_survives": [{{"exact_statement": "...", "anchor_quote": "..."}}],
  "what_fails": [{{"exact_statement": "...", "anchor_quote": "...", "failure_reason": "..."}}],
  "what_is_conditional": [{{"exact_statement": "...", "anchor_quote": "...", "required_conditions": ["..."]}}],
  "what_remains_unresolved": ["..."],
  "strongest_objection": {{"objection": "...", "against": "...", "anchor_quote": "..."}},
  "countermodels": [{{"countermodel": "...", "undermines": "...", "anchor_quote": "..."}}],
  "premise_ablations": [{{"ablated_premise": "...", "result": "argument_survives|argument_collapses|result_weakens", "anchor_quote": "..."}}],
  "rival_explanations": ["..."],
  "final_ratings": {{"overall_strength": 0, "mode_aware_notes": "..."}},
  "recommended_human_ruling": "PROMOTE_TO_REVIEW|DEFER|REJECT|EXTRACT_MORE",
  "recommendation_reason": "..."
}}

RULES:
- recommended_human_ruling is ADVICE to a human. It grants nothing. The human decides.
- Every item must carry a verbatim anchor_quote from the source or from Call 1 output.
"""


def numbered_source(text: str) -> str:
    lines = text.splitlines()
    width = len(str(len(lines)))
    return "\n".join(f"{i+1:>{width}} | {line}" for i, line in enumerate(lines))


def prompt_for_call(call_number: int, source_text: str, call1_result: dict | None = None) -> str:
    if call_number == 1:
        return CALL1_LOSSLESS_EXTRACTION.format(numbered_source=numbered_source(source_text))
    if call_number == 2:
        return CALL2_RIGOROUS_EVALUATION + "\n\nCALL 1 EXTRACTION (JSON):\n" + str(call1_result)
    if call_number == 3:
        return CALL3_ADVERSARIAL_SYNTHESIS + "\n\nCALL 1 EXTRACTION (JSON):\n" + str(call1_result)
    raise ValueError(f"unknown call number {call_number}")
