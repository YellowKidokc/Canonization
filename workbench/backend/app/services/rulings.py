"""The ruling service — the ONLY legitimate path for canon_status mutation.

Authority boundary:
- Extraction/pipeline code creates objects with canon_status = CANDIDATE_DRAFT — NOT ADMITTED.
- Only an authenticated human, through this service, may promote/demote/defer/reject/supersede.
- Every mutation writes an append-only Ruling row in the same transaction and bumps
  the canon version. History is never erased; corrections are new rulings.
"""
from __future__ import annotations

import uuid as uuidlib
from dataclasses import dataclass

import sqlalchemy as sa
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.entities import CanonVersion, Ruling
from ..vocab import CANON_STATUSES, RULING_DECISIONS

# object_type -> (ORM model, allowed column holding canon_status, editable fields)
from ..models.entities import (  # noqa: E402
    Claim,
    DiscoveryCommons,
    Evidence,
    Prediction,
    Question,
    TrueStatement,
)

OBJECT_TYPES: dict[str, type] = {
    "QUESTION": Question,
    "CLAIM": Claim,
    "TRUE_STATEMENT": TrueStatement,
    "EVIDENCE": Evidence,
    "DISCOVERY_COMMONS": DiscoveryCommons,
    "PREDICTION": Prediction,
}

# Legal transitions. Keys are (decision, prior_status) -> new_status.
TRANSITIONS: dict[tuple[str, str], str] = {
    ("PROMOTE", "CANDIDATE_DRAFT — NOT ADMITTED"): "UNDER_REVIEW",
    ("PROMOTE", "UNDER_REVIEW"): "CANONICAL",
    ("PROMOTE", "DEFERRED"): "UNDER_REVIEW",
    ("PROMOTE", "REJECTED"): "UNDER_REVIEW",
    ("DEMOTE", "CANONICAL"): "UNDER_REVIEW",
    ("DEMOTE", "UNDER_REVIEW"): "CANDIDATE_DRAFT — NOT ADMITTED",
    ("DEFER", "CANDIDATE_DRAFT — NOT ADMITTED"): "DEFERRED",
    ("DEFER", "UNDER_REVIEW"): "DEFERRED",
    ("REJECT", "CANDIDATE_DRAFT — NOT ADMITTED"): "REJECTED",
    ("REJECT", "UNDER_REVIEW"): "REJECTED",
    ("REJECT", "DEFERRED"): "REJECTED",
    ("SUPERSEDE", "CANONICAL"): "SUPERSEDED",
    ("SUPERSEDE", "UNDER_REVIEW"): "SUPERSEDED",
    ("RESTORE", "REJECTED"): "CANDIDATE_DRAFT — NOT ADMITTED",
    ("RESTORE", "SUPERSEDED"): "CANDIDATE_DRAFT — NOT ADMITTED",
    ("RESTORE", "CONTRADICTED"): "UNDER_REVIEW",
}


class RulingError(ValueError):
    pass


@dataclass
class RulingRequest:
    object_type: str
    object_uuid: uuidlib.UUID
    decision: str
    reason: str
    decided_by: str
    supporting_objects: list[uuidlib.UUID] | None = None
    reverses_ruling_id: uuidlib.UUID | None = None
    edit_payload: dict | None = None


def next_canon_version(db: Session) -> int:
    current = db.scalar(select(sa.func.max(CanonVersion.id))) or 0
    return current + 1


def apply_ruling(db: Session, req: RulingRequest) -> Ruling:
    """Apply a human ruling atomically: ruling row + status change + canon bump."""
    if req.decision not in RULING_DECISIONS:
        raise RulingError(f"Unknown decision {req.decision!r}")
    if not req.reason or not req.reason.strip():
        raise RulingError("A ruling requires a human-written reason")
    model = OBJECT_TYPES.get(req.object_type)
    if model is None:
        raise RulingError(f"Unknown object_type {req.object_type!r}")

    obj = db.get(model, req.object_uuid)
    if obj is None:
        raise RulingError(f"No {req.object_type} with uuid {req.object_uuid}")

    prior = obj.canon_status
    if req.decision == "EDIT":
        # EDIT records an immutable edit history entry but does not change status.
        new_status = prior
        if not req.edit_payload:
            raise RulingError("EDIT rulings require edit_payload describing changed fields")
    else:
        new_status = TRANSITIONS.get((req.decision, prior))
        if new_status is None:
            raise RulingError(
                f"Illegal transition: {req.decision} from {prior}. "
                "Use compensating rulings rather than erasing history."
            )

    canon_version = next_canon_version(db)
    ruling = Ruling(
        object_type=req.object_type,
        object_uuid=req.object_uuid,
        prior_status=prior,
        new_status=new_status,
        decision=req.decision,
        reason=req.reason.strip(),
        decided_by=req.decided_by,
        canon_version=canon_version,
        supporting_objects=[str(u) for u in (req.supporting_objects or [])],
        reverses_ruling_id=req.reverses_ruling_id,
        edit_payload=req.edit_payload,
    )
    db.add(ruling)
    db.add(CanonVersion(id=canon_version, label=f"{req.decision} {req.object_type} {req.object_uuid}", trigger_ruling_id=None))
    obj.canon_status = new_status
    db.flush()
    # link version -> ruling now that ruling has an id
    ruling_version = db.get(CanonVersion, canon_version)
    ruling_version.trigger_ruling_id = ruling.id
    db.flush()
    return ruling


def ruling_history(db: Session, object_uuid: uuidlib.UUID) -> list[Ruling]:
    return list(
        db.scalars(
            select(Ruling).where(Ruling.object_uuid == object_uuid).order_by(Ruling.created_at, Ruling.id)
        )
    )


def canon_at_version(db: Session, version: int) -> list[dict]:
    """Reconstruct what the canon contained at a prior canon version:
    every governed object whose latest ruling at that version was CANONICAL."""
    stmt = sa.text(
        """
        SELECT DISTINCT ON (object_type, object_uuid) object_type, object_uuid, new_status
        FROM rulings
        WHERE canon_version <= :v
        ORDER BY object_type, object_uuid, canon_version DESC
        """
    )
    rows = db.execute(stmt, {"v": version}).all()
    return [
        {"object_type": r.object_type, "object_uuid": str(r.object_uuid), "status": r.new_status}
        for r in rows
        if r.new_status == "CANONICAL"
    ]
