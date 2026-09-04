"""Unified search: full-text + trigram + exact UUID + filters.

search_documents is a projection of the governed tables (like the Markdown
projection, the DB tables remain the authority). Rebuilt after pipeline runs
and object mutations via reindex_object / reindex_all.
"""
from __future__ import annotations

import uuid as uuidlib

import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..models.entities import (
    Claim,
    DiscoveryCommons,
    Evidence,
    Prediction,
    Question,
    TrueStatement,
)

OBJECT_TABLES = {
    "QUESTION": ("questions", lambda r: (r.exact_question, r.why_pressure or "")),
    "CLAIM": ("claims", lambda r: (r.exact_claim, r.plain_language or "")),
    "TRUE_STATEMENT": ("true_statements", lambda r: (r.exact_statement, r.plain_meaning or "")),
    "EVIDENCE": ("evidence", lambda r: (r.title, r.summary or "")),
    "DISCOVERY_COMMONS": ("discovery_commons", lambda r: ("Discovery", r.content)),
    "PREDICTION": ("predictions", lambda r: (r.exact_prediction, r.expected_observation or "")),
}

_MODELS = {
    "QUESTION": Question,
    "CLAIM": Claim,
    "TRUE_STATEMENT": TrueStatement,
    "EVIDENCE": Evidence,
    "DISCOVERY_COMMONS": DiscoveryCommons,
    "PREDICTION": Prediction,
}


def reindex_object(db: Session, object_type: str, object_uuid) -> None:
    model = _MODELS.get(object_type)
    if model is None:
        return
    obj = db.get(model, object_uuid)
    if obj is None:
        db.execute(text("DELETE FROM search_documents WHERE object_uuid=:u"), {"u": object_uuid})
        return
    title, body = _splitters(object_type)(obj)
    db.execute(
        text(
            """
            INSERT INTO search_documents (object_uuid, object_type, title, body, source_id, canon_status, statement_mode, updated_at)
            VALUES (:u, :t, :title, :body, :src, :status, :mode, now())
            ON CONFLICT (object_uuid) DO UPDATE SET
              object_type=EXCLUDED.object_type, title=EXCLUDED.title, body=EXCLUDED.body,
              source_id=EXCLUDED.source_id, canon_status=EXCLUDED.canon_status,
              statement_mode=EXCLUDED.statement_mode, updated_at=now()
            """
        ),
        {
            "u": obj.id,
            "t": object_type,
            "title": _clip(title),
            "body": _clip(body),
            "src": obj.source_id if hasattr(obj, "source_id") else None,
            "status": obj.canon_status,
            "mode": getattr(obj, "statement_mode", None) or getattr(obj, "claim_mode", None),
        },
    )


def _splitters(object_type: str):
    return OBJECT_TABLES[object_type][1]


def _clip(text_: str, limit: int = 8000) -> str:
    return text_[:limit]


def reindex_all(db: Session) -> None:
    db.execute(text("TRUNCATE search_documents"))
    for object_type in OBJECT_TABLES:
        model = _MODELS[object_type]
        for obj in db.scalars(sa.select(model)):
            reindex_object(db, object_type, obj.id)


def search(
    db: Session,
    *,
    query: str | None = None,
    object_type: str | None = None,
    canon_status: str | None = None,
    source_id: uuidlib.UUID | None = None,
    statement_mode: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    clauses, params = [], {"limit": limit, "offset": offset}

    if query:
        q = query.strip()
        try:
            uuidlib.UUID(q)
            is_uuid = True
        except ValueError:
            is_uuid = False
        if is_uuid:
            clauses.append("(object_uuid = CAST(:uuid AS uuid))")
            params["uuid"] = q
        else:
            clauses.append(
                "(document @@ plainto_tsquery('english', :q) OR body ILIKE '%' || :q || '%' OR title ILIKE '%' || :q || '%')"
            )
            params["q"] = q
    if object_type:
        clauses.append("object_type = :otype")
        params["otype"] = object_type
    if canon_status:
        clauses.append("canon_status = :cstatus")
        params["cstatus"] = canon_status
    if source_id:
        clauses.append("source_id = :src")
        params["src"] = source_id
    if statement_mode:
        clauses.append("statement_mode = :smode")
        params["smode"] = statement_mode

    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    rank = "ts_rank(document, plainto_tsquery('english', :q))" if query and "q" in params else "NULL"
    sql = f"""
        SELECT object_uuid, object_type, title, body, canon_status, statement_mode, source_id,
               {rank} AS rank
        FROM search_documents
        {where}
        ORDER BY rank DESC NULLS LAST, updated_at DESC
        LIMIT :limit OFFSET :offset
    """
    rows = db.execute(text(sql), params).all()
    total = db.execute(
        text(f"SELECT count(*) FROM search_documents {where}"), {k: v for k, v in params.items() if k not in ("limit", "offset")}
    ).scalar()
    return {
        "total": total,
        "results": [
            {
                "object_uuid": str(r.object_uuid),
                "object_type": r.object_type,
                "title": r.title,
                "snippet": (r.body or "")[:300],
                "canon_status": r.canon_status,
                "statement_mode": r.statement_mode,
                "source_id": str(r.source_id) if r.source_id else None,
            }
            for r in rows
        ],
    }
