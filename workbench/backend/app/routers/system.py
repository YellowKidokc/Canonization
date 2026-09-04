"""System endpoints: dashboard, search, graph, exports, health, meta."""
from __future__ import annotations

import uuid as uuidlib

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db, pg_version
from ..models.entities import (
    CanonVersion,
    Claim,
    DiscoveryCommons,
    Evidence,
    EvidenceEdge,
    ExportReceipt,
    FailureReceipt,
    Prediction,
    ProcessingJob,
    Question,
    Ruling,
    Source,
    TrueStatement,
)
from ..schemas import Dashboard, ExportReceiptOut, SearchResponse
from ..services import exports as export_service
from ..services import rulings as ruling_service
from ..services import search as search_service

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    return {
        "status": "ok",
        "postgres_version": pg_version(),
        "canon_version": db.scalar(select(func.max(CanonVersion.id))) or 0,
    }


@router.get("/dashboard", response_model=Dashboard)
def dashboard(db: Session = Depends(get_db)):
    def count(model, *conds):
        stmt = select(func.count()).select_from(model)
        for c in conds:
            stmt = stmt.where(c)
        return db.scalar(stmt) or 0

    # Claims lacking evidence: no evidence edge pointing at the claim
    claims_with_edges = select(EvidenceEdge.target_claim_id).where(EvidenceEdge.target_claim_id.isnot(None))
    claims_lacking = count(Claim, Claim.id.notin_(claims_with_edges))

    # Evidence lacking an edge
    evidence_with_edges = select(EvidenceEdge.evidence_id)
    evidence_lacking = count(Evidence, Evidence.id.notin_(evidence_with_edges))

    recent = db.scalars(select(Ruling).order_by(Ruling.created_at.desc()).limit(10)).all()

    return Dashboard(
        sources=count(Source),
        jobs_running=count(ProcessingJob, ProcessingJob.status.in_(["RUNNING", "PENDING"])),
        jobs_failed=count(ProcessingJob, ProcessingJob.status == "FAILED"),
        failure_receipts=count(FailureReceipt),
        rulings_required=count(TrueStatement, TrueStatement.canon_status == "UNDER_REVIEW")
        + count(Question, Question.canon_status == "UNDER_REVIEW")
        + count(Claim, Claim.canon_status == "UNDER_REVIEW")
        + count(Evidence, Evidence.canon_status == "UNDER_REVIEW"),
        candidates=count(TrueStatement, TrueStatement.canon_status == "CANDIDATE_DRAFT — NOT ADMITTED")
        + count(Question, Question.canon_status == "CANDIDATE_DRAFT — NOT ADMITTED")
        + count(Claim, Claim.canon_status == "CANDIDATE_DRAFT — NOT ADMITTED"),
        canonical=count(TrueStatement, TrueStatement.canon_status == "CANONICAL"),
        discovery_commons=count(DiscoveryCommons),
        unanswered_questions=count(Question, Question.answer_status == "UNANSWERED"),
        claims_lacking_evidence=claims_lacking,
        evidence_lacking_edges=evidence_lacking,
        untested_predictions=count(Prediction, Prediction.status.in_(["REGISTERED", "TESTING"])),
        active_contradictions=count(TrueStatement, TrueStatement.contradiction_status == "ACTIVE"),
        canon_version=db.scalar(select(func.max(CanonVersion.id))) or 0,
        recent_rulings=recent,
    )


@router.get("/search", response_model=SearchResponse)
def search(
    q: str | None = None,
    object_type: str | None = None,
    canon_status: str | None = None,
    source_id: uuidlib.UUID | None = None,
    statement_mode: str | None = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    return search_service.search(
        db,
        query=q,
        object_type=object_type,
        canon_status=canon_status,
        source_id=source_id,
        statement_mode=statement_mode,
        limit=limit,
        offset=offset,
    )


STATUS_COLORS = {
    "CANDIDATE_DRAFT — NOT ADMITTED": "#3b82f6",  # blue
    "UNDER_REVIEW": "#eab308",  # yellow
    "CANONICAL": "#22c55e",  # green
    "DEFERRED": "#94a3b8",  # slate
    "REJECTED": "#ef4444",  # red
    "SUPERSEDED": "#a855f7",  # purple
    "CONTRADICTED": "#ef4444",  # red
}


@router.get("/graph")
def graph(
    source_id: uuidlib.UUID | None = None,
    limit: int = Query(300, le=1000),
    db: Session = Depends(get_db),
):
    """Nodes + typed edges for the knowledge map (React Flow)."""
    nodes, edges = [], []
    seen = set()

    def add_node(uuid_, type_, label, status, extra=None):
        key = str(uuid_)
        if key in seen:
            return
        seen.add(key)
        nodes.append(
            {
                "id": key,
                "type": "governed",
                "data": {
                    "label": (label or "")[:90],
                    "object_type": type_,
                    "canon_status": status,
                    "color": STATUS_COLORS.get(status, "#94a3b8"),
                    **(extra or {}),
                },
            }
        )

    def add_edge(src, dst, label, admitted=True, edge_type="RELATES"):
        edges.append(
            {
                "id": f"{src}->{dst}:{edge_type}:{len(edges)}",
                "source": str(src),
                "target": str(dst),
                "label": label,
                "type": "solid" if admitted else "dashed",
            }
        )

    stmt_filter = TrueStatement.source_id == source_id if source_id else True
    statements = db.scalars(select(TrueStatement).where(stmt_filter).limit(limit)).all()
    for st in statements:
        add_node(st.id, "TRUE_STATEMENT", st.exact_statement, st.canon_status,
                 {"statement_mode": st.statement_mode})
        if st.source_id:
            src = db.get(Source, st.source_id)
            if src:
                add_node(src.id, "SOURCE", src.original_filename, "DEFERRED")
                add_edge(src.id, st.id, "source of", True, "SOURCE_OF")

    for q in db.scalars(select(Question).where(Question.source_id == source_id if source_id else True).limit(limit)):
        add_node(q.id, "QUESTION", q.exact_question, q.canon_status)
        if q.source_id:
            add_node(q.source_id, "SOURCE", (db.get(Source, q.source_id).original_filename if db.get(Source, q.source_id) else "?"), "DEFERRED")
            add_edge(q.source_id, q.id, "raises", True, "RAISES")

    for edge in db.scalars(select(EvidenceEdge).limit(limit)):
        ev = db.get(Evidence, edge.evidence_id)
        if ev:
            add_node(ev.id, "EVIDENCE", ev.title, ev.canon_status, {"fully_opened": ev.fully_opened})
        target = None
        if edge.target_statement_id:
            target = db.get(TrueStatement, edge.target_statement_id)
        elif edge.target_claim_id:
            target = db.get(Claim, edge.target_claim_id)
        if target is not None:
            add_node(target.id, "TRUE_STATEMENT" if isinstance(target, TrueStatement) else "CLAIM",
                     getattr(target, "exact_statement", getattr(target, "exact_claim", "?")), target.canon_status)
            add_edge(edge.evidence_id, target.id, edge.bearing, edge.admitted, "EVIDENCE_EDGE")

    for p in db.scalars(select(Prediction).limit(limit)):
        add_node(p.id, "PREDICTION", p.exact_prediction, p.canon_status, {"status": p.status})
        if p.parent_statement_id:
            add_edge(p.parent_statement_id, p.id, "predicts", True, "PREDICTS")

    for c in db.scalars(select(DiscoveryCommons).limit(limit)):
        add_node(c.id, "DISCOVERY_COMMONS", c.content, c.canon_status)

    return {"nodes": nodes, "edges": edges}


@router.post("/export/json", response_model=ExportReceiptOut, status_code=201)
def export_json(db: Session = Depends(get_db)):
    receipt = export_service.export_json(db)
    db.commit()
    return receipt


@router.post("/export/markdown", response_model=ExportReceiptOut, status_code=201)
def export_markdown(db: Session = Depends(get_db)):
    receipt = export_service.export_markdown(db)
    db.commit()
    return receipt


@router.get("/exports", response_model=list[ExportReceiptOut])
def list_exports(db: Session = Depends(get_db)):
    return db.scalars(select(ExportReceipt).order_by(ExportReceipt.created_at.desc()).limit(100)).all()
