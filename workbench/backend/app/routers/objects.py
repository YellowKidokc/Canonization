"""Object routers: questions, statements, claims, evidence, edges, commons, predictions.

Guarantee: no endpoint in this module accepts canon_status from the client.
Status changes happen only via POST /api/rulings (routers/governance.py).
"""
from __future__ import annotations

import uuid as uuidlib

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import get_actor
from ..db import get_db
from ..models.entities import (
    Claim,
    DiscoveryCommons,
    Evidence,
    EvidenceEdge,
    Prediction,
    Question,
    TrueStatement,
)
from ..services import search as search_service
from ..vocab import BEARINGS, BURDEN_NAMES, BURDEN_STATES_REQUIRING_RATIONALE, CANDIDATE_STATUS, PROMOTION_ELIGIBILITY, VOCAB
from .. import schemas

router = APIRouter(prefix="/api", tags=["objects"])

MODEL_BY_TYPE = {
    "QUESTION": Question,
    "CLAIM": Claim,
    "TRUE_STATEMENT": TrueStatement,
    "EVIDENCE": Evidence,
    "DISCOVERY_COMMONS": DiscoveryCommons,
    "PREDICTION": Prediction,
}


def _get(db: Session, object_type: str, object_id: uuidlib.UUID):
    model = MODEL_BY_TYPE.get(object_type.upper())
    if model is None:
        raise HTTPException(404, f"Unknown object type {object_type}")
    obj = db.get(model, object_id)
    if obj is None:
        raise HTTPException(404, f"No {object_type} with uuid {object_id}")
    return obj


# ------------------------------------------------------------------ vocab ----
@router.get("/vocab")
def get_vocab():
    return VOCAB


# --------------------------------------------------------------- questions ----
@router.get("/questions", response_model=list[schemas.QuestionOut])
def list_questions(
    db: Session = Depends(get_db),
    canon_status: str | None = None,
    source_id: uuidlib.UUID | None = None,
    answer_status: str | None = None,
    job_id: uuidlib.UUID | None = None,
    limit: int = Query(200, le=1000),
    offset: int = 0,
):
    stmt = select(Question).order_by(Question.created_at.desc()).limit(limit).offset(offset)
    if canon_status:
        stmt = stmt.where(Question.canon_status == canon_status)
    if source_id:
        stmt = stmt.where(Question.source_id == source_id)
    if answer_status:
        stmt = stmt.where(Question.answer_status == answer_status)
    if job_id:
        stmt = stmt.where(Question.job_id == job_id)
    return db.scalars(stmt).all()


@router.get("/questions/{qid}", response_model=schemas.QuestionOut)
def get_question(qid: uuidlib.UUID, db: Session = Depends(get_db)):
    return _get(db, "QUESTION", qid)


@router.patch("/questions/{qid}", response_model=schemas.QuestionOut)
def update_question(qid: uuidlib.UUID, body: schemas.QuestionUpdate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    q = _get(db, "QUESTION", qid)
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(q, k, v)
    q.provenance = {**q.provenance, "last_edited_by": actor}
    db.flush()
    db.commit()
    search_service.reindex_object(db, "QUESTION", q.id)
    db.commit()
    return q


# -------------------------------------------------------------- statements ----
@router.get("/statements", response_model=list[schemas.StatementOut])
def list_statements(
    db: Session = Depends(get_db),
    canon_status: str | None = None,
    source_id: uuidlib.UUID | None = None,
    statement_mode: str | None = None,
    job_id: uuidlib.UUID | None = None,
    limit: int = Query(200, le=2000),
    offset: int = 0,
):
    stmt = select(TrueStatement).order_by(TrueStatement.created_at.desc()).limit(limit).offset(offset)
    if canon_status:
        stmt = stmt.where(TrueStatement.canon_status == canon_status)
    if source_id:
        stmt = stmt.where(TrueStatement.source_id == source_id)
    if statement_mode:
        stmt = stmt.where(TrueStatement.statement_mode == statement_mode)
    if job_id:
        stmt = stmt.where(TrueStatement.job_id == job_id)
    return db.scalars(stmt).all()


@router.post("/statements", response_model=schemas.StatementOut, status_code=201)
def create_statement(body: schemas.StatementCreate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    """Manual candidate creation. Always CANDIDATE_DRAFT — NOT ADMITTED."""
    st = TrueStatement(
        exact_statement=body.exact_statement,
        plain_meaning=body.plain_meaning,
        statement_mode=body.statement_mode,
        scope=body.scope,
        assumptions=body.assumptions,
        source_id=body.source_id,
        source_anchor=body.source_anchor.model_dump() if body.source_anchor else None,
        canon_status=CANDIDATE_STATUS,
        provenance={"origin": "MANUAL_ENTRY", "entered_by": actor},
    )
    db.add(st)
    db.flush()
    db.commit()
    search_service.reindex_object(db, "TRUE_STATEMENT", st.id)
    db.commit()
    return st


@router.get("/statements/{sid}", response_model=schemas.StatementOut)
def get_statement(sid: uuidlib.UUID, db: Session = Depends(get_db)):
    return _get(db, "TRUE_STATEMENT", sid)


@router.patch("/statements/{sid}", response_model=schemas.StatementOut)
def update_statement(sid: uuidlib.UUID, body: schemas.StatementUpdate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    st = _get(db, "TRUE_STATEMENT", sid)
    data = body.model_dump(exclude_unset=True)
    anchor = data.pop("source_anchor", None)
    for k, v in data.items():
        setattr(st, k, v)
    if anchor is not None:
        st.source_anchor = anchor
    st.provenance = {**st.provenance, "last_edited_by": actor}
    db.flush()
    db.commit()
    search_service.reindex_object(db, "TRUE_STATEMENT", st.id)
    db.commit()
    return st


@router.get("/claims", response_model=list[schemas.ClaimOut])
def list_claims(
    db: Session = Depends(get_db),
    canon_status: str | None = None,
    source_id: uuidlib.UUID | None = None,
    job_id: uuidlib.UUID | None = None,
    limit: int = Query(200, le=2000),
):
    stmt = select(Claim).order_by(Claim.created_at.desc()).limit(limit)
    if canon_status:
        stmt = stmt.where(Claim.canon_status == canon_status)
    if source_id:
        stmt = stmt.where(Claim.source_id == source_id)
    if job_id:
        stmt = stmt.where(Claim.job_id == job_id)
    return db.scalars(stmt).all()


@router.get("/claims/{cid}", response_model=schemas.ClaimOut)
def get_claim(cid: uuidlib.UUID, db: Session = Depends(get_db)):
    return _get(db, "CLAIM", cid)


# ---------------------------------------------------------------- evidence ----
def _compute_fully_opened(nine_burden: dict) -> bool:
    """fully_opened = every burden addressed or explicitly marked with rationale.
    Epistemically exposed ≠ high quality."""
    for name in BURDEN_NAMES:
        entry = nine_burden.get(name)
        if not entry:
            return False
        state = entry.get("state", "NOT_STARTED")
        if state == "NOT_STARTED":
            return False
        if state in BURDEN_STATES_REQUIRING_RATIONALE and not (entry.get("rationale") or "").strip():
            return False
    return True


@router.get("/evidence", response_model=list[schemas.EvidenceOut])
def list_evidence(
    db: Session = Depends(get_db),
    canon_status: str | None = None,
    source_id: uuidlib.UUID | None = None,
    fully_opened: bool | None = None,
    limit: int = Query(200, le=2000),
):
    stmt = select(Evidence).order_by(Evidence.created_at.desc()).limit(limit)
    if canon_status:
        stmt = stmt.where(Evidence.canon_status == canon_status)
    if source_id:
        stmt = stmt.where(Evidence.source_id == source_id)
    if fully_opened is not None:
        stmt = stmt.where(Evidence.fully_opened == fully_opened)
    return db.scalars(stmt).all()


@router.post("/evidence", response_model=schemas.EvidenceOut, status_code=201)
def create_evidence(body: schemas.EvidenceCreate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    nine = {k: v.model_dump() for k, v in body.nine_burden.items()}
    ev = Evidence(
        title=body.title,
        evidence_class=body.evidence_class,
        epistemic_source_class=body.epistemic_source_class,
        summary=body.summary,
        distance=body.distance,
        relation_to_target=body.relation_to_target,
        uncertainty_type=body.uncertainty_type,
        reported_uncertainty=body.reported_uncertainty,
        calibration_uncertainty=body.calibration_uncertainty,
        systematic_error=body.systematic_error,
        random_error=body.random_error,
        detection_limit=body.detection_limit,
        resolution=body.resolution,
        missing_data_rate=body.missing_data_rate,
        known_bias=body.known_bias,
        unknown_uncertainty=body.unknown_uncertainty,
        effect_exceeds_uncertainty=body.effect_exceeds_uncertainty,
        sampling_regime=body.sampling_regime,
        selection_timing=body.selection_timing,
        hypothesis_timing=body.hypothesis_timing,
        replication_status=body.replication_status,
        replication_relation=body.replication_relation,
        controls=body.controls,
        alternatives=[a.model_dump() for a in body.alternatives],
        nine_burden=nine,
        fully_opened=_compute_fully_opened(nine),
        source_id=body.source_id,
        source_anchor=body.source_anchor.model_dump() if body.source_anchor else None,
        canon_status=CANDIDATE_STATUS,
        provenance={"origin": "MANUAL_ENTRY", "entered_by": actor},
    )
    db.add(ev)
    db.flush()
    db.commit()
    search_service.reindex_object(db, "EVIDENCE", ev.id)
    db.commit()
    return ev


@router.get("/evidence/{eid}", response_model=schemas.EvidenceOut)
def get_evidence(eid: uuidlib.UUID, db: Session = Depends(get_db)):
    return _get(db, "EVIDENCE", eid)


@router.patch("/evidence/{eid}", response_model=schemas.EvidenceOut)
def update_evidence(eid: uuidlib.UUID, body: schemas.EvidenceUpdate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    ev = _get(db, "EVIDENCE", eid)
    data = body.model_dump(exclude_unset=True)
    anchor = data.pop("source_anchor", None)
    nine = data.pop("nine_burden", None)
    alts = data.pop("alternatives", None)
    for k, v in data.items():
        setattr(ev, k, v)
    if anchor is not None:
        ev.source_anchor = anchor
    if alts is not None:
        ev.alternatives = alts
    if nine is not None:
        ev.nine_burden = {k: (v if isinstance(v, dict) else v) for k, v in nine.items()}
        ev.fully_opened = _compute_fully_opened(ev.nine_burden)
    ev.provenance = {**ev.provenance, "last_edited_by": actor}
    db.flush()
    db.commit()
    search_service.reindex_object(db, "EVIDENCE", ev.id)
    db.commit()
    return ev


# ----------------------------------------------------------- evidence edges ----
@router.get("/evidence-edges", response_model=list[schemas.EvidenceEdgeOut])
def list_edges(
    db: Session = Depends(get_db),
    evidence_id: uuidlib.UUID | None = None,
    target_statement_id: uuidlib.UUID | None = None,
    limit: int = Query(200, le=2000),
):
    stmt = select(EvidenceEdge).order_by(EvidenceEdge.created_at.desc()).limit(limit)
    if evidence_id:
        stmt = stmt.where(EvidenceEdge.evidence_id == evidence_id)
    if target_statement_id:
        stmt = stmt.where(EvidenceEdge.target_statement_id == target_statement_id)
    return db.scalars(stmt).all()


@router.post("/evidence-edges", response_model=schemas.EvidenceEdgeOut, status_code=201)
def create_edge(body: schemas.EvidenceEdgeCreate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    if body.target_statement_id is None and body.target_claim_id is None:
        raise HTTPException(422, "Edge needs target_statement_id or target_claim_id")
    if body.bearing not in BEARINGS:
        raise HTTPException(422, f"bearing must be one of {BEARINGS}")
    _get(db, "EVIDENCE", body.evidence_id)
    if body.target_statement_id:
        _get(db, "TRUE_STATEMENT", body.target_statement_id)
    if body.target_claim_id:
        _get(db, "CLAIM", body.target_claim_id)
    edge = EvidenceEdge(
        **body.model_dump(),
        admitted=False,
        provenance={"origin": "MANUAL_ENTRY", "entered_by": actor},
    )
    db.add(edge)
    db.flush()
    db.commit()
    return edge


@router.get("/evidence-edges/{eid}", response_model=schemas.EvidenceEdgeOut)
def get_edge(eid: uuidlib.UUID, db: Session = Depends(get_db)):
    edge = db.get(EvidenceEdge, eid)
    if edge is None:
        raise HTTPException(404, "No such edge")
    return edge


@router.patch("/evidence-edges/{eid}", response_model=schemas.EvidenceEdgeOut)
def update_edge(eid: uuidlib.UUID, body: schemas.EvidenceEdgeUpdate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    edge = db.get(EvidenceEdge, eid)
    if edge is None:
        raise HTTPException(404, "No such edge")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(edge, k, v)
    edge.provenance = {**edge.provenance, "last_edited_by": actor}
    db.flush()
    db.commit()
    return edge


# -------------------------------------------------------- discovery commons ----
@router.get("/discovery", response_model=list[schemas.CommonsOut])
def list_commons(
    db: Session = Depends(get_db),
    canon_status: str | None = None,
    source_id: uuidlib.UUID | None = None,
    limit: int = Query(200, le=2000),
):
    stmt = select(DiscoveryCommons).order_by(DiscoveryCommons.created_at.desc()).limit(limit)
    if canon_status:
        stmt = stmt.where(DiscoveryCommons.canon_status == canon_status)
    if source_id:
        stmt = stmt.where(DiscoveryCommons.source_id == source_id)
    return db.scalars(stmt).all()


@router.post("/discovery", response_model=schemas.CommonsOut, status_code=201)
def create_commons(body: schemas.CommonsCreate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    if body.promotion_eligibility not in VOCAB["PROMOTION_ELIGIBILITY"]:
        raise HTTPException(422, f"promotion_eligibility must be one of {PROMOTION_ELIGIBILITY}")
    c = DiscoveryCommons(
        **body.model_dump(exclude={"source_anchor"}),
        source_anchor=body.source_anchor.model_dump() if body.source_anchor else None,
        canon_status=CANDIDATE_STATUS,
        provenance={"origin": "MANUAL_ENTRY", "entered_by": actor},
    )
    db.add(c)
    db.flush()
    db.commit()
    search_service.reindex_object(db, "DISCOVERY_COMMONS", c.id)
    db.commit()
    return c


@router.get("/discovery/{cid}", response_model=schemas.CommonsOut)
def get_commons(cid: uuidlib.UUID, db: Session = Depends(get_db)):
    return _get(db, "DISCOVERY_COMMONS", cid)


# ------------------------------------------------------------- predictions ----
@router.get("/predictions", response_model=list[schemas.PredictionOut])
def list_predictions(
    db: Session = Depends(get_db),
    status: str | None = None,
    parent_statement_id: uuidlib.UUID | None = None,
    limit: int = Query(200, le=2000),
):
    stmt = select(Prediction).order_by(Prediction.registered_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(Prediction.status == status)
    if parent_statement_id:
        stmt = stmt.where(Prediction.parent_statement_id == parent_statement_id)
    return db.scalars(stmt).all()


@router.post("/predictions", response_model=schemas.PredictionOut, status_code=201)
def create_prediction(body: schemas.PredictionCreate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    p = Prediction(
        **body.model_dump(),
        canon_status=CANDIDATE_STATUS,
        payload={"registered_by": actor},
    )
    db.add(p)
    db.flush()
    db.commit()
    search_service.reindex_object(db, "PREDICTION", p.id)
    db.commit()
    return p


@router.get("/predictions/{pid}", response_model=schemas.PredictionOut)
def get_prediction(pid: uuidlib.UUID, db: Session = Depends(get_db)):
    return _get(db, "PREDICTION", pid)


@router.patch("/predictions/{pid}", response_model=schemas.PredictionOut)
def update_prediction(pid: uuidlib.UUID, body: schemas.PredictionUpdate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    p = _get(db, "PREDICTION", pid)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    p.payload = {**p.payload, "last_edited_by": actor}
    db.flush()
    db.commit()
    search_service.reindex_object(db, "PREDICTION", p.id)
    db.commit()
    return p


@router.post("/predictions/{pid}/versions", response_model=schemas.PredictionOut, status_code=201)
def new_prediction_version(pid: uuidlib.UUID, body: schemas.PredictionCreate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    """Corrections create a NEW immutable version; the original stays untouched."""
    old = _get(db, "PREDICTION", pid)
    p = Prediction(
        **body.model_dump(),
        version=old.version + 1,
        canon_status=CANDIDATE_STATUS,
        payload={"registered_by": actor, "supersedes_prediction": str(old.id)},
    )
    db.add(p)
    db.flush()
    db.commit()
    search_service.reindex_object(db, "PREDICTION", p.id)
    db.commit()
    return p
