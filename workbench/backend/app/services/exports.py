"""Export service: JSON (authoritative) and Markdown (projection) into 60_EXCHANGE.

The database is the authority. JSON export is a faithful serialization of
governed rows; Markdown is explicitly labeled a readable projection. Every
projection retains UUIDs. Each export writes an ExportReceipt with SHA-256.
"""
from __future__ import annotations

import hashlib
import json
import uuid as uuidlib
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models.entities import ExportReceipt, Source, TrueStatement, Ruling
from ..vocab import CANDIDATE_STATUS

PROJECTION_BANNER = (
    "<!-- PROJECTION — NOT AUTHORITATIVE. The PostgreSQL database is the "
    "authority. This file is a readable rendering; UUIDs identify objects. -->\n"
)


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _write_exchange(filename: str, content: str) -> tuple[Path, str]:
    exchange = get_settings().exchange_dir
    exchange.mkdir(parents=True, exist_ok=True)
    path = exchange / filename
    data = content.encode("utf-8")
    path.write_bytes(data)
    return path, _sha256_bytes(data)


def _receipt(db: Session, kind: str, path: Path, sha: str, count: int | None, detail: dict) -> ExportReceipt:
    r = ExportReceipt(kind=kind, path=str(path), sha256=sha, object_count=count, detail=detail)
    db.add(r)
    db.flush()
    return r


def export_json(db: Session) -> ExportReceipt:
    """Authoritative JSON dump of all governed objects + rulings + canon versions."""
    statements = db.scalars(select(TrueStatement).order_by(TrueStatement.created_at)).all()
    sources = db.scalars(select(Source).order_by(Source.created_at)).all()
    rulings = db.scalars(select(Ruling).order_by(Ruling.canon_version, Ruling.created_at)).all()

    def obj(o):
        return {
            "uuid": str(o.id),
            "canon_status": o.canon_status,
            "version": o.version,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "updated_at": o.updated_at.isoformat() if o.updated_at else None,
            "source_uuid": str(o.source_id) if getattr(o, "source_id", None) else None,
            "source_anchor": getattr(o, "source_anchor", None),
            "provenance": o.provenance,
            "payload": o.payload,
        }

    bundle = {
        "export_kind": "CANONIZATION_AUTHORITATIVE_JSON",
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "governing_status_default": CANDIDATE_STATUS,
        "sources": [
            {
                "uuid": str(s.id),
                "original_filename": s.original_filename,
                "sha256": s.sha256,
                "source_type": s.source_type,
                "imported_at": s.created_at.isoformat() if s.created_at else None,
                "transformations": s.transformations,
            }
            for s in sources
        ],
        "true_statements": [
            {
                **obj(st),
                "exact_statement": st.exact_statement,
                "plain_meaning": st.plain_meaning,
                "statement_mode": st.statement_mode,
                "scope": st.scope,
                "assumptions": st.assumptions,
                "confidence_vector": st.confidence_vector,
                "verification_status": st.verification_status,
                "contradiction_status": st.contradiction_status,
                "supersedes_uuid": str(st.supersedes_id) if st.supersedes_id else None,
                "superseded_by_uuid": str(st.superseded_by_id) if st.superseded_by_id else None,
            }
            for st in statements
        ],
        "rulings": [
            {
                "uuid": str(r.id),
                "object_type": r.object_type,
                "object_uuid": str(r.object_uuid),
                "prior_status": r.prior_status,
                "new_status": r.new_status,
                "decision": r.decision,
                "reason": r.reason,
                "decided_by": r.decided_by,
                "canon_version": r.canon_version,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "reverses_ruling_uuid": str(r.reverses_ruling_id) if r.reverses_ruling_id else None,
            }
            for r in rulings
        ],
    }
    content = json.dumps(bundle, indent=2, ensure_ascii=False, default=str)
    path, sha = _write_exchange(f"canonization_export_{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.json", content)
    return _receipt(
        db,
        "JSON",
        path,
        sha,
        len(statements),
        {"statements": len(statements), "sources": len(sources), "rulings": len(rulings)},
    )


def export_markdown(db: Session) -> ExportReceipt:
    """Readable Markdown projection of the canon (CANONICAL + UNDER_REVIEW)."""
    canonical = db.scalars(
        select(TrueStatement)
        .where(TrueStatement.canon_status.in_(["CANONICAL", "UNDER_REVIEW"]))
        .order_by(TrueStatement.statement_mode, TrueStatement.created_at)
    ).all()
    lines = [
        PROJECTION_BANNER.rstrip(),
        "",
        "# Canonization — Markdown Projection",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
        "> This is a PROJECTION of the governed database state. It grants no authority.",
        f"> Default status for all generated objects: **{CANDIDATE_STATUS}**.",
        "",
    ]
    current_mode = None
    for st in canonical:
        if st.statement_mode != current_mode:
            current_mode = st.statement_mode
            lines += [f"## {current_mode}", ""]
        anchor = ""
        if st.source_anchor and st.source_anchor.get("exact_quote"):
            anchor = f" — anchored: “{st.source_anchor['exact_quote'][:120]}”"
        lines += [
            f"- **{st.exact_statement}**  ",
            f"  UUID: `{st.id}` · Status: {st.canon_status} · Verification: {st.verification_status}{anchor}",
            "",
        ]
    if not canonical:
        lines += ["_No statements admitted to the canon yet._", ""]
    content = "\n".join(lines)
    path, sha = _write_exchange(f"canonization_projection_{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}.md", content)
    return _receipt(db, "MARKDOWN", path, sha, len(canonical), {"statements": len(canonical)})
