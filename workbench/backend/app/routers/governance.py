"""Governance endpoints: rulings, audit trail, canon version history."""
from __future__ import annotations

import uuid as uuidlib

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import get_actor
from ..db import get_db
from ..models.entities import CanonVersion, Ruling
from ..schemas import BulkRulingCreate, RulingCreate, RulingOut
from ..services import rulings as ruling_service

router = APIRouter(prefix="/api", tags=["governance"])


@router.post("/rulings", response_model=RulingOut, status_code=201)
def create_ruling(body: RulingCreate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    """The ONLY endpoint that can change canon_status. Authenticated human ruling required."""
    req = ruling_service.RulingRequest(
        object_type=body.object_type,
        object_uuid=body.object_uuid,
        decision=body.decision,
        reason=body.reason,
        decided_by=actor,
        supporting_objects=body.supporting_objects,
        reverses_ruling_id=body.reverses_ruling_id,
        edit_payload=body.edit_payload,
    )
    try:
        ruling = ruling_service.apply_ruling(db, req)
        db.commit()
    except ruling_service.RulingError as e:
        db.rollback()
        raise HTTPException(422, str(e)) from e
    # Keep the search projection in sync with the new status.
    from ..services import search as search_service

    search_service.reindex_object(db, body.object_type, body.object_uuid)
    db.commit()
    return ruling


@router.post("/rulings/bulk", response_model=list[RulingOut], status_code=201)
def create_bulk_rulings(body: BulkRulingCreate, db: Session = Depends(get_db), actor: str = Depends(get_actor)):
    """Apply an explicit human-approved batch atomically.

    Each object still receives its own append-only ruling and canon version.
    Any illegal transition rejects the entire batch rather than partially ruling.
    """
    created = []
    try:
        for item in body.items:
            created.append(
                ruling_service.apply_ruling(
                    db,
                    ruling_service.RulingRequest(
                        object_type=item.object_type,
                        object_uuid=item.object_uuid,
                        decision=item.decision,
                        reason=item.reason,
                        decided_by=actor,
                        supporting_objects=item.supporting_objects,
                        reverses_ruling_id=item.reverses_ruling_id,
                        edit_payload=item.edit_payload,
                    ),
                )
            )
        db.commit()
    except ruling_service.RulingError as e:
        db.rollback()
        raise HTTPException(422, str(e)) from e

    from ..services import search as search_service

    for item in body.items:
        search_service.reindex_object(db, item.object_type, item.object_uuid)
    db.commit()
    return created


@router.get("/rulings", response_model=list[RulingOut])
def list_rulings(
    db: Session = Depends(get_db),
    object_type: str | None = None,
    object_uuid: uuidlib.UUID | None = None,
    decision: str | None = None,
    limit: int = Query(200, le=2000),
):
    stmt = select(Ruling).order_by(Ruling.canon_version.desc()).limit(limit)
    if object_type:
        stmt = stmt.where(Ruling.object_type == object_type)
    if object_uuid:
        stmt = stmt.where(Ruling.object_uuid == object_uuid)
    if decision:
        stmt = stmt.where(Ruling.decision == decision)
    return db.scalars(stmt).all()


@router.get("/rulings/{rid}", response_model=RulingOut)
def get_ruling(rid: uuidlib.UUID, db: Session = Depends(get_db)):
    r = db.get(Ruling, rid)
    if r is None:
        raise HTTPException(404, "No such ruling")
    return r


@router.get("/audit/trail")
def audit_trail(object_uuid: uuidlib.UUID, db: Session = Depends(get_db)):
    """Complete ruling/provenance history for an object — proof of the admission path."""
    history = ruling_service.ruling_history(db, object_uuid)
    audits = db.execute(
        __import__("sqlalchemy").text(
            "SELECT table_name, old_status, new_status, changed_at, txid "
            "FROM canon_status_audit WHERE object_uuid=:u ORDER BY changed_at"
        ),
        {"u": object_uuid},
    ).all()
    return {
        "object_uuid": str(object_uuid),
        "rulings": [RulingOut.model_validate(r).model_dump(mode="json") for r in history],
        "status_audit": [dict(a._mapping) for a in audits],
    }


@router.get("/canon/versions", response_model=list[dict])
def canon_versions(db: Session = Depends(get_db)):
    rows = db.scalars(select(CanonVersion).order_by(CanonVersion.id.desc())).all()
    return [
        {
            "version": r.id,
            "label": r.label,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "trigger_ruling_id": str(r.trigger_ruling_id) if r.trigger_ruling_id else None,
        }
        for r in rows
    ]


@router.get("/canon/at/{version}")
def canon_at(version: int, db: Session = Depends(get_db)):
    """Reconstruct what the canon contained at any prior version."""
    return {"version": version, "canonical_objects": ruling_service.canon_at_version(db, version)}
