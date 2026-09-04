"""Three-call pipeline runner.

Authority boundary: this module NEVER changes canon_status beyond the governed
default (CANDIDATE_DRAFT — NOT ADMITTED). It does not import services.rulings.
A Call 3 "recommended_human_ruling" is stored as payload metadata only.

Every run is recorded: processing job, per-call model runs (with prompt version
hash), failure receipts on any error. Reruns append new rows; history is never
overwritten.
"""
from __future__ import annotations

import hashlib
import json
import queue
import threading
import uuid as uuidlib
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models.entities import (
    Claim,
    FailureReceipt,
    ModelRun,
    ProcessingJob,
    PromptVersion,
    Question,
    TrueStatement,
)
from ..services import search as search_service
from ..vocab import CANDIDATE_STATUS
from . import prompts
from .provider import ProviderError, call_deepseek, extract_json_object

RAW_ARTIFACT_DIR_NAME = "model-run-artifacts"


@dataclass
class ProgressEvent:
    job_id: str
    stage: str
    message: str
    percent: int
    ts: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def sse(self) -> str:
        return f"data: {json.dumps(self.__dict__)}\n\n"


class JobProgressHub:
    """In-memory SSE hub for pipeline progress (single-process local app)."""

    def __init__(self) -> None:
        self._subscribers: dict[str, list[queue.Queue]] = {}
        self._lock = threading.Lock()

    def publish(self, event: ProgressEvent) -> None:
        with self._lock:
            subs = list(self._subscribers.get(event.job_id, []))
        for q in subs:
            q.put(event)

    def subscribe(self, job_id: str) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=200)
        with self._lock:
            self._subscribers.setdefault(job_id, []).append(q)
        return q

    def unsubscribe(self, job_id: str, q: queue.Queue) -> None:
        with self._lock:
            if q in self._subscribers.get(job_id, []):
                self._subscribers[job_id].remove(q)


hub = JobProgressHub()


def _artifact_path(job_id: uuidlib.UUID, call_number: int) -> Path:
    d = get_settings().pg_data_dir.parent / RAW_ARTIFACT_DIR_NAME / str(job_id)
    d.mkdir(parents=True, exist_ok=True)
    return d / f"call{call_number}.json"


def _sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def get_or_create_prompt_version(db: Session, call_number: int) -> PromptVersion:
    version = prompts.PROMPT_VERSIONS[call_number]
    prompt_text = prompts.prompt_for_call(call_number, "<source>")
    # Jobs run in independent threads. Two first runs may attempt to register
    # the same immutable prompt version at once, so use PostgreSQL's atomic
    # conflict handling instead of a race-prone SELECT followed by INSERT.
    db.execute(
        insert(PromptVersion)
        .values(
            call_number=call_number,
            name=f"call{call_number}_three_call_pipeline",
            version=version,
            prompt_text=prompt_text,
            sha256=_sha(prompt_text),
        )
        .on_conflict_do_nothing(
            index_elements=[PromptVersion.call_number, PromptVersion.version]
        )
    )
    pv = db.scalar(
        select(PromptVersion).where(
            PromptVersion.call_number == call_number,
            PromptVersion.version == version,
        )
    )
    if pv is None:  # defensive: the INSERT or existing row must be visible
        raise RuntimeError(f"Prompt version {call_number}:{version} was not persisted")
    return pv


def _record_run(
    db: Session,
    *,
    job_id: uuidlib.UUID,
    call_number: int,
    prompt_version_id,
    input_text: str,
    result_text: str | None,
    tokens: int | None,
    latency_ms: int | None,
    succeeded: bool,
) -> ModelRun:
    path = _artifact_path(job_id, call_number)
    path.write_text(result_text or "", encoding="utf-8")
    run = ModelRun(
        job_id=job_id,
        call_number=call_number,
        provider="deepseek",
        model=get_settings().deepseek_model,
        prompt_version_id=prompt_version_id,
        input_hash=_sha(input_text),
        output_ref=str(path),
        output_hash=_sha(result_text) if result_text else None,
        tokens_used=tokens,
        latency_ms=latency_ms,
        succeeded=succeeded,
    )
    db.add(run)
    db.flush()
    return run


def _record_failure(
    db: Session,
    *,
    job_id,
    model_run_id,
    error: ProviderError | Exception,
    error_class: str,
    input_text: str,
) -> FailureReceipt:
    detail = getattr(error, "detail", {}) or {}
    detail = {**detail, "message": str(error)}
    receipt = FailureReceipt(
        job_id=job_id,
        model_run_id=model_run_id,
        error_class=error_class,
        detail=detail,
        payload_hash=_sha(input_text),
    )
    db.add(receipt)
    db.flush()
    return receipt


def _verify_anchor(quote: str | None, source_text: str) -> dict | None:
    """Return a source anchor dict, or None if the quote is not verbatim."""
    if not quote:
        return None
    idx = source_text.find(quote)
    if idx == -1:
        return None
    line_no = source_text[:idx].count("\n") + 1
    return {"exact_quote": quote, "start_line": line_no, "end_line": line_no + quote.count("\n")}


def _insert_candidates(db: Session, job_id, source_id, call1: dict, source_text: str) -> dict:
    """Insert Call-1 extraction results as CANDIDATE objects. Anchors must verify
    against the source text — unverifiable items are dropped, never fabricated."""
    counts = {"questions": 0, "claims": 0, "true_statements": 0, "dropped_unanchored": 0}

    for q in call1.get("questions") or []:
        anchor = _verify_anchor(q.get("anchor_quote"), source_text)
        if anchor is None and q.get("anchor_quote"):
            counts["dropped_unanchored"] += 1
            continue
        db.add(
            Question(
                exact_question=q.get("exact_question", "").strip(),
                question_type=q.get("question_type", "OTHER"),
                why_pressure=q.get("why_pressure"),
                importance=q.get("importance", "UNKNOWN"),
                answer_status="UNANSWERED",
                source_id=source_id,
                source_anchor=anchor,
                job_id=job_id,
                canon_status=CANDIDATE_STATUS,
                provenance={"origin": "CALL1_LOSSLESS_EXTRACTION", "job_id": str(job_id)},
            )
        )
        counts["questions"] += 1

    for c in call1.get("claims") or []:
        anchor = _verify_anchor(c.get("anchor_quote"), source_text)
        if anchor is None and c.get("anchor_quote"):
            counts["dropped_unanchored"] += 1
            continue
        db.add(
            Claim(
                exact_claim=c.get("exact_claim", "").strip(),
                plain_language=c.get("plain_language"),
                claim_mode=c.get("claim_mode"),
                source_id=source_id,
                source_anchor=anchor,
                job_id=job_id,
                canon_status=CANDIDATE_STATUS,
                provenance={"origin": "CALL1_LOSSLESS_EXTRACTION", "job_id": str(job_id)},
            )
        )
        counts["claims"] += 1

    for s in call1.get("true_statements") or []:
        anchor = _verify_anchor(s.get("anchor_quote"), source_text)
        if anchor is None and s.get("anchor_quote"):
            counts["dropped_unanchored"] += 1
            continue
        db.add(
            TrueStatement(
                exact_statement=s.get("exact_statement", "").strip(),
                plain_meaning=s.get("plain_meaning"),
                statement_mode=s.get("statement_mode", "CONJECTURE"),
                scope=s.get("scope"),
                assumptions=s.get("assumptions") or [],
                source_id=source_id,
                source_anchor=anchor,
                job_id=job_id,
                canon_status=CANDIDATE_STATUS,
                provenance={"origin": "CALL1_LOSSLESS_EXTRACTION", "job_id": str(job_id)},
            )
        )
        counts["true_statements"] += 1

    db.flush()
    return counts


def _suggest_ruling(evaluation: dict) -> dict:
    score_fields = (
        "logical_validity", "internal_coherence", "definition_precision",
        "evidence_adequacy", "explanatory_compression", "rival_discrimination",
        "testability", "cross_domain_integrity", "adversarial_robustness",
        "epistemic_calibration",
    )
    scored = {name: evaluation.get(name) for name in score_fields if isinstance(evaluation.get(name), (int, float))}
    average = round(sum(scored.values()) / len(scored), 2) if scored else None
    if average is None:
        decision = "DEFER"
        reason = "Call 2 supplied no applicable scores; retain for human review."
    else:
        decision = "PROMOTE" if average >= 7 else "DEFER" if average >= 5 else "REJECT"
        weakest = sorted(scored.items(), key=lambda pair: pair[1])[:2]
        weakness = ", ".join(f"{name.replace('_', ' ')} {value}/10" for name, value in weakest)
        reason = (
            f"Advisory Call 2 assessment: {average}/10 across {len(scored)} applicable dimensions. "
            f"Mode note: {evaluation.get('mode_note') or 'none supplied'}. "
            f"Lowest dimensions: {weakness or 'none'}. Human confirmation required."
        )
    return {"decision": decision, "reason": reason, "average_score": average, "scores": scored}


def attach_call2_evaluations(db: Session, job_id, evaluations: list[dict]) -> int:
    """Attach Call 2 advice to matching objects without changing canon status."""
    objects = [
        *db.scalars(select(Question).where(Question.job_id == job_id)).all(),
        *db.scalars(select(Claim).where(Claim.job_id == job_id)).all(),
        *db.scalars(select(TrueStatement).where(TrueStatement.job_id == job_id)).all(),
    ]
    by_anchor: dict[str, list] = {}
    for obj in objects:
        quote = (obj.source_anchor or {}).get("exact_quote")
        if quote:
            by_anchor.setdefault(quote, []).append(obj)
    attached = 0
    for evaluation in evaluations:
        quote = evaluation.get("anchor_quote")
        matches = by_anchor.get(quote) or []
        if not matches:
            continue
        obj = matches.pop(0)
        obj.provenance = {
            **(obj.provenance or {}),
            "call2_evaluation": evaluation,
            "suggested_ruling": _suggest_ruling(evaluation),
        }
        attached += 1
    db.flush()
    return attached


def run_pipeline(db: Session, job_id: uuidlib.UUID) -> None:
    """Execute the three calls synchronously (invoked in a worker thread)."""
    from ..services.sources import read_source_bytes

    job = db.get(ProcessingJob, job_id)
    if job is None:
        return
    settings = get_settings()
    source_text = read_source_bytes(job.source).decode("utf-8", errors="replace")
    job.status = "RUNNING"
    db.flush()
    hub.publish(ProgressEvent(str(job_id), "start", "Three-call pipeline started", 5))

    call1_result: dict | None = None

    def run_call(call_number: int, input_text: str) -> dict:
        prompt_text = prompts.prompt_for_call(call_number, source_text, call1_result)
        pv = get_or_create_prompt_version(db, call_number)
        hub.publish(ProgressEvent(str(job_id), f"call{call_number}", f"Call {call_number} in flight", 10 + call_number * 25))
        try:
            result = call_deepseek(prompt_text)
        except ProviderError as e:
            run = _record_run(
                db,
                job_id=job_id,
                call_number=call_number,
                prompt_version_id=pv.id,
                input_text=input_text,
                result_text=None,
                tokens=None,
                latency_ms=None,
                succeeded=False,
            )
            _record_failure(
                db,
                job_id=job_id,
                model_run_id=run.id,
                error=e,
                error_class=e.error_class,
                input_text=input_text,
            )
            raise

        run = _record_run(
            db,
            job_id=job_id,
            call_number=call_number,
            prompt_version_id=pv.id,
            input_text=input_text,
            result_text=result.text,
            tokens=result.tokens_used,
            latency_ms=result.latency_ms,
            succeeded=True,
        )
        try:
            parsed = extract_json_object(result.text)
            hub.publish(ProgressEvent(str(job_id), f"call{call_number}", f"Call {call_number} complete", 15 + call_number * 25))
            return parsed
        except ProviderError as e:
            run.succeeded = False
            _record_failure(
                db,
                job_id=job_id,
                model_run_id=run.id,
                error=e,
                error_class=e.error_class,
                input_text=input_text,
            )
            raise

    try:
        # CALL 1 — lossless extraction (question-first)
        call1_result = run_call(1, source_text)
        counts = _insert_candidates(db, job_id, job.source_id, call1_result, source_text)
        hub.publish(ProgressEvent(str(job_id), "candidates", f"Inserted {counts['true_statements']} candidate statements, {counts['questions']} questions, {counts['claims']} claims", 55))

        # CALL 2 — rigorous evaluation (recorded for the review UI)
        call2_result = run_call(2, json.dumps(call1_result))
        attached_evaluations = attach_call2_evaluations(
            db, job_id, call2_result.get("evaluations", [])
        )
        job.receipt = {
            **job.receipt,
            "call2_evaluations": call2_result.get("evaluations", []),
            "call2_cross_cutting": call2_result.get("cross_cutting_findings", []),
            "call2_attached_suggestions": attached_evaluations,
        }

        # CALL 3 — adversarial synthesis (recommendation is NOT admission)
        call3_result = run_call(3, json.dumps(call1_result))
        recommendation = call3_result.get("recommended_human_ruling")
        job.receipt = {
            **job.receipt,
            "call3_recommendation": recommendation,
            "call3_recommendation_reason": call3_result.get("recommendation_reason"),
            "call3_strongest_objection": call3_result.get("strongest_objection"),
            "call3_countermodels": call3_result.get("countermodels", []),
            "call3_final_ratings": call3_result.get("final_ratings"),
            "governing_note": "Recommendation only. No object was admitted. Human ruling required.",
            "candidate_counts": counts,
        }
        job.status = "SUCCEEDED"
        hub.publish(ProgressEvent(str(job_id), "done", "Pipeline succeeded — all objects remain CANDIDATE_DRAFT — NOT ADMITTED", 100))
    except ProviderError as e:
        job.status = "FAILED"
        job.error_summary = f"{e.error_class}: {e}"
        hub.publish(ProgressEvent(str(job_id), "failed", f"Pipeline failed: {e.error_class}", 100))
    finally:
        db.commit()
        search_service.reindex_all(db)
        db.commit()
        hub.publish(ProgressEvent(str(job_id), "closed", "Job closed", 100))


def start_pipeline_thread(db_factory, job_id: uuidlib.UUID) -> threading.Thread:
    def _work() -> None:
        db = db_factory()
        try:
            run_pipeline(db, job_id)
        finally:
            db.close()

    t = threading.Thread(target=_work, name=f"pipeline-{job_id}", daemon=True)
    t.start()
    return t


def is_job_thread_active(job_id: uuidlib.UUID) -> bool:
    """True only while this process still has a live worker for the job."""
    expected = f"pipeline-{job_id}"
    return any(t.name == expected and t.is_alive() for t in threading.enumerate())
