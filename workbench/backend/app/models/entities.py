"""Core entity models: sources, jobs, pipeline records, knowledge objects.

Authority rule: every knowledge object carries canon_status, but NOTHING in this
package may transition it to a non-candidate state except services/rulings.py,
which writes an append-only ruling row in the same transaction. The pipeline
package does not import rulings.
"""
from __future__ import annotations

import uuid

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..vocab import (
    ANSWER_STATUSES,
    BEARINGS,
    CONSTRAINT_STATUSES,
    EPISTEMIC_SOURCE_CLASSES,
    EVIDENCE_CLASSES,
    EVIDENCE_DISTANCES,
    EXPECTED_UNDER_VALUES,
    HYPOTHESIS_TIMINGS,
    IMPORTANCE_LEVELS,
    JOB_STATUSES,
    PREDICTION_STATUSES,
    PROMOTION_ELIGIBILITY,
    QUESTION_TYPES,
    RELATIONS_TO_TARGET,
    REPLICATION_RELATIONS,
    REPLICATION_STATUSES,
    SAMPLING_REGIMES,
    SOURCE_TYPES,
    STATEMENT_MODES,
    TIMING_OPTIONS,
    UNCERTAINTY_TYPES,
    VERIFICATION_STATUSES,
)
from ..db import Base
from .base import Timestamps, UUIDPrimaryKey, canon_status_column, canon_status_constraint


def _check(name: str, column: str, values: list[str]) -> sa.CheckConstraint:
    allowed = ", ".join(f"'{v}'" for v in values)
    return sa.CheckConstraint(f"{column} IN ({allowed})", name=name)


# ---------------------------------------------------------------- sources ----
class Source(Base, UUIDPrimaryKey, Timestamps):
    __tablename__ = "sources"

    original_filename: Mapped[str] = mapped_column(sa.Text, nullable=False)
    source_url: Mapped[str | None] = mapped_column(sa.Text)
    source_type: Mapped[str] = mapped_column(
        sa.Text, nullable=False, server_default="MARKDOWN_FILE"
    )
    original_location: Mapped[str | None] = mapped_column(sa.Text)
    sha256: Mapped[str] = mapped_column(sa.Text, nullable=False, unique=True)
    preserved_path: Mapped[str] = mapped_column(sa.Text, nullable=False)
    author: Mapped[str | None] = mapped_column(sa.Text)
    imported_by: Mapped[str] = mapped_column(sa.Text, nullable=False)
    transformations: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'[]'::jsonb"))

    __table_args__ = (_check("sources_type_vocab", "source_type", SOURCE_TYPES),)


class SourceVersion(Base, UUIDPrimaryKey, Timestamps):
    __tablename__ = "source_versions"

    source_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    sha256: Mapped[str] = mapped_column(sa.Text, nullable=False)
    note: Mapped[str | None] = mapped_column(sa.Text)


# --------------------------------------------------------------- pipeline ----
class PromptVersion(Base, UUIDPrimaryKey, Timestamps):
    __tablename__ = "prompt_versions"

    call_number: Mapped[int] = mapped_column(sa.Integer, nullable=False)  # 1, 2, 3
    name: Mapped[str] = mapped_column(sa.Text, nullable=False)
    version: Mapped[str] = mapped_column(sa.Text, nullable=False)
    prompt_text: Mapped[str] = mapped_column(sa.Text, nullable=False)
    sha256: Mapped[str] = mapped_column(sa.Text, nullable=False)

    __table_args__ = (
        sa.UniqueConstraint("call_number", "version", name="prompt_versions_call_version"),
        sa.CheckConstraint("call_number IN (1, 2, 3)", name="prompt_versions_call_number"),
    )


class ProcessingJob(Base, UUIDPrimaryKey, Timestamps):
    __tablename__ = "processing_jobs"

    source_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(sa.Text, nullable=False, server_default="PENDING")
    stage: Mapped[str | None] = mapped_column(sa.Text)  # current call / phase
    receipt: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb"))
    error_summary: Mapped[str | None] = mapped_column(sa.Text)

    source: Mapped[Source] = relationship()
    __table_args__ = (_check("jobs_status_vocab", "status", JOB_STATUSES),)


class ModelRun(Base, UUIDPrimaryKey, Timestamps):
    __tablename__ = "model_runs"

    job_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("processing_jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    call_number: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    provider: Mapped[str] = mapped_column(sa.Text, nullable=False)
    model: Mapped[str] = mapped_column(sa.Text, nullable=False)
    prompt_version_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("prompt_versions.id"), nullable=False
    )
    input_hash: Mapped[str] = mapped_column(sa.Text, nullable=False)
    output_ref: Mapped[str | None] = mapped_column(sa.Text)  # path to raw response artifact
    output_hash: Mapped[str | None] = mapped_column(sa.Text)
    tokens_used: Mapped[int | None] = mapped_column(sa.Integer)
    latency_ms: Mapped[int | None] = mapped_column(sa.Integer)
    succeeded: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("true"))

    __table_args__ = (sa.CheckConstraint("call_number IN (1, 2, 3)", name="model_runs_call_number"),)


class FailureReceipt(Base, UUIDPrimaryKey, Timestamps):
    __tablename__ = "failure_receipts"

    job_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid, sa.ForeignKey("processing_jobs.id", ondelete="SET NULL"), index=True
    )
    model_run_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid, sa.ForeignKey("model_runs.id", ondelete="SET NULL")
    )
    error_class: Mapped[str] = mapped_column(sa.Text, nullable=False)  # TIMEOUT, HTTP_ERROR, PARSE_ERROR, VALIDATION_ERROR, CONFIG_ERROR
    detail: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb"))
    payload_hash: Mapped[str | None] = mapped_column(sa.Text)


# ------------------------------------------------------- knowledge objects ----
class GovernedObjectMixin:
    canon_status = canon_status_column()
    version: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="1")
    supersedes_id: Mapped[uuid.UUID | None] = mapped_column(sa.Uuid)
    superseded_by_id: Mapped[uuid.UUID | None] = mapped_column(sa.Uuid)
    source_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid, sa.ForeignKey("sources.id", ondelete="SET NULL"), index=True
    )
    source_anchor: Mapped[dict | None] = mapped_column(JSONB)  # {start_line, end_line, exact_quote}
    provenance: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb"))
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb"))


class Question(Base, UUIDPrimaryKey, Timestamps, GovernedObjectMixin):
    __tablename__ = "questions"

    exact_question: Mapped[str] = mapped_column(sa.Text, nullable=False)
    question_type: Mapped[str] = mapped_column(sa.Text, nullable=False, server_default="OTHER")
    why_pressure: Mapped[str | None] = mapped_column(sa.Text)
    importance: Mapped[str] = mapped_column(sa.Text, nullable=False, server_default="UNKNOWN")
    answer_status: Mapped[str] = mapped_column(sa.Text, nullable=False, server_default="UNANSWERED")
    job_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid, sa.ForeignKey("processing_jobs.id", ondelete="SET NULL")
    )

    __table_args__ = (
        canon_status_constraint(),
        _check("questions_type_vocab", "question_type", QUESTION_TYPES),
        _check("questions_importance_vocab", "importance", IMPORTANCE_LEVELS),
        _check("questions_answer_vocab", "answer_status", ANSWER_STATUSES),
    )


class Claim(Base, UUIDPrimaryKey, Timestamps, GovernedObjectMixin):
    __tablename__ = "claims"
    __table_args__ = (canon_status_constraint(),)

    exact_claim: Mapped[str] = mapped_column(sa.Text, nullable=False)
    plain_language: Mapped[str | None] = mapped_column(sa.Text)
    claim_mode: Mapped[str | None] = mapped_column(sa.Text)
    job_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid, sa.ForeignKey("processing_jobs.id", ondelete="SET NULL")
    )


class TrueStatement(Base, UUIDPrimaryKey, Timestamps, GovernedObjectMixin):
    __tablename__ = "true_statements"

    exact_statement: Mapped[str] = mapped_column(sa.Text, nullable=False)
    plain_meaning: Mapped[str | None] = mapped_column(sa.Text)
    statement_mode: Mapped[str] = mapped_column(sa.Text, nullable=False, server_default="CONJECTURE")
    scope: Mapped[str | None] = mapped_column(sa.Text)
    assumptions: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=sa.text("'[]'::jsonb"))
    confidence_vector: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb"))
    verification_status: Mapped[str] = mapped_column(
        sa.Text, nullable=False, server_default="UNVERIFIED"
    )
    contradiction_status: Mapped[str] = mapped_column(sa.Text, nullable=False, server_default="NONE_KNOWN")
    constraint_status: Mapped[str | None] = mapped_column(
        sa.Text
    )  # truth-constraint engine, Phase 5
    job_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid, sa.ForeignKey("processing_jobs.id", ondelete="SET NULL")
    )

    __table_args__ = (
        canon_status_constraint(),
        _check("statements_mode_vocab", "statement_mode", STATEMENT_MODES),
        _check("statements_verification_vocab", "verification_status", VERIFICATION_STATUSES),
        _check("statements_contradiction_vocab", "contradiction_status", ["NONE_KNOWN", "SUSPECTED", "ACTIVE", "RESOLVED"]),
        _check(
            "statements_constraint_vocab",
            "constraint_status",
            ["CONSISTENT_WITH_TRUTH_SET", "ENTAILED_BY_TRUTH_SET", "REQUIRED_FOR_CLOSURE",
             "NEGATION_CONTRADICTS_TRUTH_SET", "INDEPENDENT", "CONTRADICTED", "UNDERDETERMINED"],
        ),
    )


class Evidence(Base, UUIDPrimaryKey, Timestamps, GovernedObjectMixin):
    __tablename__ = "evidence"
    __table_args__ = (canon_status_constraint(),)

    title: Mapped[str] = mapped_column(sa.Text, nullable=False)
    evidence_class: Mapped[str] = mapped_column(sa.Text, nullable=False)
    epistemic_source_class: Mapped[str] = mapped_column(sa.Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(sa.Text)

    distance: Mapped[str | None] = mapped_column(sa.Text)
    relation_to_target: Mapped[str | None] = mapped_column(sa.Text)
    uncertainty_type: Mapped[str | None] = mapped_column(sa.Text)
    reported_uncertainty: Mapped[str | None] = mapped_column(sa.Text)
    calibration_uncertainty: Mapped[str | None] = mapped_column(sa.Text)
    systematic_error: Mapped[str | None] = mapped_column(sa.Text)
    random_error: Mapped[str | None] = mapped_column(sa.Text)
    detection_limit: Mapped[str | None] = mapped_column(sa.Text)
    resolution: Mapped[str | None] = mapped_column(sa.Text)
    missing_data_rate: Mapped[str | None] = mapped_column(sa.Text)
    known_bias: Mapped[str | None] = mapped_column(sa.Text)
    unknown_uncertainty: Mapped[str | None] = mapped_column(sa.Text)
    effect_exceeds_uncertainty: Mapped[bool | None] = mapped_column(sa.Boolean)

    sampling_regime: Mapped[str | None] = mapped_column(sa.Text)
    selection_timing: Mapped[str | None] = mapped_column(sa.Text)
    hypothesis_timing: Mapped[str | None] = mapped_column(sa.Text)
    replication_status: Mapped[str | None] = mapped_column(sa.Text)
    replication_relation: Mapped[str | None] = mapped_column(sa.Text)
    controls: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=sa.text("'[]'::jsonb"))
    alternatives: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=sa.text("'[]'::jsonb"))

    nine_burden: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb"))
    fully_opened: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.text("false")
    )
    quality_vector: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb"))

    __table_args__ = (
        canon_status_constraint(),
        _check("evidence_class_vocab", "evidence_class", EVIDENCE_CLASSES),
        _check("evidence_epistemic_vocab", "epistemic_source_class", EPISTEMIC_SOURCE_CLASSES),
        _check("evidence_distance_vocab", "distance", EVIDENCE_DISTANCES),
        _check("evidence_relation_vocab", "relation_to_target", RELATIONS_TO_TARGET),
        _check("evidence_uncertainty_vocab", "uncertainty_type", UNCERTAINTY_TYPES),
        _check("evidence_sampling_vocab", "sampling_regime", SAMPLING_REGIMES),
        _check("evidence_selection_timing_vocab", "selection_timing", TIMING_OPTIONS),
        _check("evidence_hypothesis_timing_vocab", "hypothesis_timing", HYPOTHESIS_TIMINGS),
        _check("evidence_replication_vocab", "replication_status", REPLICATION_STATUSES),
        _check("evidence_replication_relation_vocab", "replication_relation", REPLICATION_RELATIONS),
    )


class EvidenceEdge(Base, UUIDPrimaryKey, Timestamps):
    __tablename__ = "evidence_edges"

    evidence_id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, sa.ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_statement_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid, sa.ForeignKey("true_statements.id", ondelete="CASCADE"), index=True
    )
    target_claim_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid, sa.ForeignKey("claims.id", ondelete="CASCADE"), index=True
    )
    bearing: Mapped[str] = mapped_column(sa.Text, nullable=False)
    directness: Mapped[str | None] = mapped_column(sa.Text)
    relevant_rival: Mapped[str | None] = mapped_column(sa.Text)
    expected_under_target: Mapped[str | None] = mapped_column(sa.Text)
    expected_under_rival: Mapped[str | None] = mapped_column(sa.Text)
    discrimination: Mapped[str | None] = mapped_column(sa.Text)
    dependency: Mapped[str | None] = mapped_column(sa.Text)
    applicable_scope: Mapped[str | None] = mapped_column(sa.Text)
    strength: Mapped[str | None] = mapped_column(sa.Text)
    residual_ambiguity: Mapped[str | None] = mapped_column(sa.Text)
    human_ruling: Mapped[str | None] = mapped_column(sa.Text)
    admitted: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("false"))
    provenance: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb"))

    evidence: Mapped[Evidence] = relationship()
    __table_args__ = (
        _check("edges_bearing_vocab", "bearing", BEARINGS),
        _check("edges_expected_target_vocab", "expected_under_target", EXPECTED_UNDER_VALUES),
        _check("edges_expected_rival_vocab", "expected_under_rival", EXPECTED_UNDER_VALUES),
    )


class DiscoveryCommons(Base, UUIDPrimaryKey, Timestamps, GovernedObjectMixin):
    __tablename__ = "discovery_commons"
    __table_args__ = (
        canon_status_constraint(),
        _check("commons_eligibility_vocab", "promotion_eligibility", PROMOTION_ELIGIBILITY),
    )

    content: Mapped[str] = mapped_column(sa.Text, nullable=False)
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=sa.text("'[]'::jsonb"))
    possible_relationships: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=sa.text("'[]'::jsonb"))
    ratings: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb"))
    unresolved_questions: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=sa.text("'[]'::jsonb"))
    unclassified_reason: Mapped[str] = mapped_column(sa.Text, nullable=False)
    promotion_eligibility: Mapped[str] = mapped_column(sa.Text, nullable=False, server_default="UNKNOWN")


class Prediction(Base, UUIDPrimaryKey, Timestamps):
    __tablename__ = "predictions"

    exact_prediction: Mapped[str] = mapped_column(sa.Text, nullable=False)
    parent_statement_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid, sa.ForeignKey("true_statements.id", ondelete="SET NULL"), index=True
    )
    parent_claim_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid, sa.ForeignKey("claims.id", ondelete="SET NULL"), index=True
    )
    registered_at: Mapped[sa.DateTime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )
    expected_observation: Mapped[str | None] = mapped_column(sa.Text)
    conditions: Mapped[str | None] = mapped_column(sa.Text)
    timeframe: Mapped[str | None] = mapped_column(sa.Text)
    competing_predictions: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=sa.text("'[]'::jsonb"))
    confirmation_condition: Mapped[str | None] = mapped_column(sa.Text)
    weakening_condition: Mapped[str | None] = mapped_column(sa.Text)
    falsification_condition: Mapped[str | None] = mapped_column(sa.Text)
    result: Mapped[str | None] = mapped_column(sa.Text)
    supporting_artifact: Mapped[str | None] = mapped_column(sa.Text)
    status: Mapped[str] = mapped_column(sa.Text, nullable=False, server_default="PROPOSED")
    prospective: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=sa.text("true"))
    human_ruling: Mapped[str | None] = mapped_column(sa.Text)
    version: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="1")
    canon_status = canon_status_column()
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb"))

    __table_args__ = (
        _check("predictions_status_vocab", "status", PREDICTION_STATUSES),
        canon_status_constraint(),
    )


# ------------------------------------------------------------- governance ----
class Ruling(Base, UUIDPrimaryKey, Timestamps):
    """Append-only. The ONLY legitimate path of canon_status mutation."""

    __tablename__ = "rulings"

    object_type: Mapped[str] = mapped_column(sa.Text, nullable=False, index=True)
    object_uuid: Mapped[uuid.UUID] = mapped_column(sa.Uuid, nullable=False, index=True)
    prior_status: Mapped[str] = mapped_column(sa.Text, nullable=False)
    new_status: Mapped[str] = mapped_column(sa.Text, nullable=False)
    decision: Mapped[str] = mapped_column(sa.Text, nullable=False)
    reason: Mapped[str] = mapped_column(sa.Text, nullable=False)
    decided_by: Mapped[str] = mapped_column(sa.Text, nullable=False)
    canon_version: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    supporting_objects: Mapped[list] = mapped_column(JSONB, nullable=False, server_default=sa.text("'[]'::jsonb"))
    reverses_ruling_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid, sa.ForeignKey("rulings.id", ondelete="SET NULL")
    )
    edit_payload: Mapped[dict | None] = mapped_column(JSONB)  # for EDIT rulings: changed fields

    __table_args__ = (_check("rulings_decision_vocab", "decision",
                             ["PROMOTE", "DEMOTE", "DEFER", "REJECT", "SUPERSEDE", "EDIT", "RESTORE"]),)


class CanonVersion(Base):
    __tablename__ = "canon_versions"

    id: Mapped[int] = mapped_column(sa.BigInteger, primary_key=True, autoincrement=True)
    label: Mapped[str] = mapped_column(sa.Text, nullable=False)
    created_at: Mapped[sa.DateTime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )
    trigger_ruling_id: Mapped[uuid.UUID | None] = mapped_column(
        sa.Uuid, sa.ForeignKey("rulings.id", ondelete="SET NULL")
    )


class ExportReceipt(Base, UUIDPrimaryKey, Timestamps):
    __tablename__ = "export_receipts"

    kind: Mapped[str] = mapped_column(sa.Text, nullable=False)  # JSON, MARKDOWN, HTML, EXCEL
    path: Mapped[str] = mapped_column(sa.Text, nullable=False)
    sha256: Mapped[str] = mapped_column(sa.Text, nullable=False)
    object_count: Mapped[int | None] = mapped_column(sa.Integer)
    detail: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=sa.text("'{}'::jsonb"))
