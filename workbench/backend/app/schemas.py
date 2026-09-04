"""Pydantic request/response schemas for the API."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


# ------------------------------------------------------------------ auth ----
class LoginRequest(BaseModel):
    password: str


# ---------------------------------------------------------------- sources ----
class SourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str
    source_url: str | None
    source_type: str
    original_location: str | None
    sha256: str
    imported_by: str
    author: str | None
    created_at: datetime


class SourceDetail(SourceOut):
    transformations: list


# ------------------------------------------------------------------ jobs ----
class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    source_id: uuid.UUID
    status: str
    stage: str | None
    error_summary: str | None
    created_at: datetime
    updated_at: datetime


class JobDetail(JobOut):
    receipt: dict[str, Any]


class ModelRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    call_number: int
    provider: str
    model: str
    tokens_used: int | None
    latency_ms: int | None
    succeeded: bool
    created_at: datetime


class FailureReceiptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_id: uuid.UUID | None
    model_run_id: uuid.UUID | None
    error_class: str
    detail: dict[str, Any]
    created_at: datetime


# ------------------------------------------------------- knowledge objects ----
class SourceAnchor(BaseModel):
    exact_quote: str
    start_line: int | None = None
    end_line: int | None = None


class GovernedOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    canon_status: str
    version: int
    source_id: uuid.UUID | None
    source_anchor: SourceAnchor | None
    provenance: dict[str, Any]
    payload: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class QuestionOut(GovernedOut):
    exact_question: str
    question_type: str
    why_pressure: str | None
    importance: str
    answer_status: str
    job_id: uuid.UUID | None


class QuestionUpdate(BaseModel):
    exact_question: str | None = None
    question_type: str | None = None
    why_pressure: str | None = None
    importance: str | None = None
    answer_status: str | None = None
    source_anchor: SourceAnchor | None = None


class ClaimOut(GovernedOut):
    exact_claim: str
    plain_language: str | None
    claim_mode: str | None
    job_id: uuid.UUID | None


class StatementOut(GovernedOut):
    exact_statement: str
    plain_meaning: str | None
    statement_mode: str
    scope: str | None
    assumptions: list
    confidence_vector: dict[str, Any]
    verification_status: str
    contradiction_status: str
    job_id: uuid.UUID | None


class StatementCreate(BaseModel):
    """Manual candidate creation — always lands as CANDIDATE_DRAFT — NOT ADMITTED."""
    exact_statement: str
    plain_meaning: str | None = None
    statement_mode: Literal[
        "DEFINITION", "LOGICAL", "MATHEMATICAL", "FORMAL_VERIFIED", "EMPIRICAL",
        "HISTORICAL", "PHILOSOPHICAL", "THEOLOGICAL", "BRIDGE", "ANALOGY", "CONJECTURE",
    ]
    scope: str | None = None
    assumptions: list[str] = Field(default_factory=list)
    source_id: uuid.UUID | None = None
    source_anchor: SourceAnchor | None = None


class StatementUpdate(BaseModel):
    exact_statement: str | None = None
    plain_meaning: str | None = None
    statement_mode: str | None = None
    scope: str | None = None
    assumptions: list[str] | None = None
    source_anchor: SourceAnchor | None = None


# ---------------------------------------------------------------- evidence ----
class BurdenEntry(BaseModel):
    state: Literal[
        "NOT_STARTED", "PARTIAL", "SATISFIED", "SATISFIED_WITH_LIMITATION",
        "NOT_APPLICABLE", "IMPOSSIBLE_TO_RECOVER", "CONTRADICTED", "UNKNOWN",
    ]
    rationale: str | None = None
    detail: dict[str, Any] = Field(default_factory=dict)


class AlternativeEntry(BaseModel):
    explanation: str
    status: Literal["UNTESTED", "PARTIALLY_EXCLUDED", "STRONGLY_EXCLUDED", "FALSIFIED", "SURVIVES"]
    note: str | None = None


class EvidenceCreate(BaseModel):
    """Nine-burden Evidence Atom. fully_opened means epistemically exposed —
    every burden addressed or explicitly marked inapplicable/impossible with a
    rationale. It does NOT mean high quality."""
    title: str
    evidence_class: str
    epistemic_source_class: str
    summary: str | None = None
    distance: str | None = None
    relation_to_target: str | None = None
    uncertainty_type: str | None = None
    reported_uncertainty: str | None = None
    calibration_uncertainty: str | None = None
    systematic_error: str | None = None
    random_error: str | None = None
    detection_limit: str | None = None
    resolution: str | None = None
    missing_data_rate: str | None = None
    known_bias: str | None = None
    unknown_uncertainty: str | None = None
    effect_exceeds_uncertainty: bool | None = None
    sampling_regime: str | None = None
    selection_timing: str | None = None
    hypothesis_timing: str | None = None
    replication_status: str | None = None
    replication_relation: str | None = None
    controls: list[str] = Field(default_factory=list)
    alternatives: list[AlternativeEntry] = Field(default_factory=list)
    nine_burden: dict[str, BurdenEntry] = Field(default_factory=dict)
    source_id: uuid.UUID | None = None
    source_anchor: SourceAnchor | None = None


class EvidenceUpdate(EvidenceCreate):
    title: str | None = None
    evidence_class: str | None = None
    epistemic_source_class: str | None = None


class EvidenceOut(GovernedOut):
    title: str
    evidence_class: str
    epistemic_source_class: str
    summary: str | None
    distance: str | None
    relation_to_target: str | None
    uncertainty_type: str | None
    sampling_regime: str | None
    selection_timing: str | None
    hypothesis_timing: str | None
    replication_status: str | None
    replication_relation: str | None
    controls: list
    alternatives: list
    nine_burden: dict
    fully_opened: bool
    quality_vector: dict[str, Any]


# ----------------------------------------------------------- evidence edges ----
class EvidenceEdgeCreate(BaseModel):
    """Bearing belongs to the typed EDGE, never to the evidence object itself."""
    evidence_id: uuid.UUID
    target_statement_id: uuid.UUID | None = None
    target_claim_id: uuid.UUID | None = None
    bearing: str
    directness: str | None = None
    relevant_rival: str | None = None
    expected_under_target: str | None = None
    expected_under_rival: str | None = None
    discrimination: str | None = None
    dependency: str | None = None
    applicable_scope: str | None = None
    strength: str | None = None
    residual_ambiguity: str | None = None


class EvidenceEdgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    evidence_id: uuid.UUID
    target_statement_id: uuid.UUID | None
    target_claim_id: uuid.UUID | None
    bearing: str
    directness: str | None
    relevant_rival: str | None
    expected_under_target: str | None
    expected_under_rival: str | None
    discrimination: str | None
    dependency: str | None
    applicable_scope: str | None
    strength: str | None
    residual_ambiguity: str | None
    human_ruling: str | None
    admitted: bool
    created_at: datetime


class EvidenceEdgeUpdate(BaseModel):
    bearing: str | None = None
    directness: str | None = None
    relevant_rival: str | None = None
    expected_under_target: str | None = None
    expected_under_rival: str | None = None
    discrimination: str | None = None
    dependency: str | None = None
    applicable_scope: str | None = None
    strength: str | None = None
    residual_ambiguity: str | None = None
    human_ruling: str | None = None
    admitted: bool | None = None


# -------------------------------------------------------- discovery commons ----
class CommonsCreate(BaseModel):
    content: str
    tags: list[str] = Field(default_factory=list)
    possible_relationships: list[str] = Field(default_factory=list)
    ratings: dict[str, Any] = Field(default_factory=dict)
    unresolved_questions: list[str] = Field(default_factory=list)
    unclassified_reason: str
    promotion_eligibility: str = "UNKNOWN"
    source_id: uuid.UUID | None = None
    source_anchor: SourceAnchor | None = None


class CommonsOut(GovernedOut):
    content: str
    tags: list
    possible_relationships: list
    ratings: dict[str, Any]
    unresolved_questions: list
    unclassified_reason: str
    promotion_eligibility: str


# ------------------------------------------------------------- predictions ----
class PredictionCreate(BaseModel):
    """Register a prediction. Registration is immutable; corrections create a
    new version (POST /api/predictions/{id}/versions)."""
    exact_prediction: str
    parent_statement_id: uuid.UUID | None = None
    parent_claim_id: uuid.UUID | None = None
    expected_observation: str | None = None
    conditions: str | None = None
    timeframe: str | None = None
    competing_predictions: list[str] = Field(default_factory=list)
    confirmation_condition: str | None = None
    weakening_condition: str | None = None
    falsification_condition: str | None = None
    prospective: bool = True
    status: Literal["PROPOSED", "REGISTERED"] = "REGISTERED"


class PredictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    exact_prediction: str
    parent_statement_id: uuid.UUID | None
    parent_claim_id: uuid.UUID | None
    registered_at: datetime
    expected_observation: str | None
    conditions: str | None
    timeframe: str | None
    competing_predictions: list
    confirmation_condition: str | None
    weakening_condition: str | None
    falsification_condition: str | None
    result: str | None
    status: str
    prospective: bool
    human_ruling: str | None
    version: int
    canon_status: str
    created_at: datetime


class PredictionUpdate(BaseModel):
    """Only mutable pre-registration review fields; registered_at is immutable."""
    expected_observation: str | None = None
    conditions: str | None = None
    timeframe: str | None = None
    competing_predictions: list[str] | None = None
    confirmation_condition: str | None = None
    weakening_condition: str | None = None
    falsification_condition: str | None = None
    result: str | None = None
    status: str | None = None
    prospective: bool | None = None
    human_ruling: str | None = None


# ----------------------------------------------------------------- rulings ----
class RulingCreate(BaseModel):
    object_type: str
    object_uuid: uuid.UUID
    decision: Literal["PROMOTE", "DEMOTE", "DEFER", "REJECT", "SUPERSEDE", "EDIT", "RESTORE"]
    reason: str = Field(min_length=1)
    supporting_objects: list[uuid.UUID] = Field(default_factory=list)
    reverses_ruling_id: uuid.UUID | None = None
    edit_payload: dict[str, Any] | None = None


class BulkRulingCreate(BaseModel):
    items: list[RulingCreate] = Field(min_length=1, max_length=500)


class RulingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    object_type: str
    object_uuid: uuid.UUID
    prior_status: str
    new_status: str
    decision: str
    reason: str
    decided_by: str
    canon_version: int
    supporting_objects: list
    reverses_ruling_id: uuid.UUID | None
    edit_payload: dict[str, Any] | None
    created_at: datetime


# ----------------------------------------------------------------- search ----
class SearchResult(BaseModel):
    object_uuid: str
    object_type: str
    title: str
    snippet: str
    canon_status: str
    statement_mode: str | None
    source_id: str | None


class SearchResponse(BaseModel):
    total: int
    results: list[SearchResult]


# --------------------------------------------------------------- dashboard ----
class Dashboard(BaseModel):
    sources: int
    jobs_running: int
    jobs_failed: int
    failure_receipts: int
    rulings_required: int  # UNDER_REVIEW objects awaiting final promotion
    candidates: int
    canonical: int
    discovery_commons: int
    unanswered_questions: int
    claims_lacking_evidence: int
    evidence_lacking_edges: int
    untested_predictions: int
    active_contradictions: int
    canon_version: int
    recent_rulings: list[RulingOut]


# ----------------------------------------------------------------- exports ----
class ExportReceiptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: str
    path: str
    sha256: str
    object_count: int | None
    created_at: datetime
