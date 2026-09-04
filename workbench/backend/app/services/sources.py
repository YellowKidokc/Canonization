"""Source intake and immutable preservation.

Bytes are preserved content-addressed (write-once) and hash-verified on every
read. Intake never modifies the original file.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models.entities import Source, SourceVersion


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def preserve_bytes(data: bytes) -> tuple[str, Path]:
    """Write bytes to the content-addressed preserved store. Write-once."""
    digest = sha256_bytes(data)
    dest = get_settings().preserved_dir / digest
    if not dest.exists():
        tmp = dest.with_suffix(".tmp")
        tmp.write_bytes(data)
        tmp.replace(dest)  # atomic on same volume
    # verify
    if sha256_bytes(dest.read_bytes()) != digest:  # pragma: no cover — corruption guard
        raise IOError(f"Preserved store corruption for {digest}")
    return digest, dest


def intake_bytes(
    db: Session,
    *,
    data: bytes,
    filename: str,
    original_location: str | None,
    source_type: str = "MARKDOWN_FILE",
    source_url: str | None = None,
    author: str | None = None,
) -> tuple[Source, bool]:
    """Preserve a document. Returns (source, created). Duplicate content
    (same SHA-256) returns the existing source — history is never overwritten."""
    settings = get_settings()
    digest, dest = preserve_bytes(data)
    existing = db.scalar(select(Source).where(Source.sha256 == digest))
    if existing is not None:
        return existing, False
    source = Source(
        original_filename=filename,
        source_url=source_url,
        source_type=source_type,
        original_location=original_location,
        sha256=digest,
        preserved_path=str(dest),
        author=author,
        imported_by=settings.actor,
        transformations=[],
    )
    db.add(source)
    db.flush()
    db.add(SourceVersion(source_id=source.id, version=1, sha256=digest, note="initial intake"))
    db.flush()
    return source, True


def read_source_bytes(source: Source) -> bytes:
    path = Path(source.preserved_path)
    data = path.read_bytes()
    if sha256_bytes(data) != source.sha256:  # pragma: no cover — corruption guard
        raise IOError(f"Preserved bytes failed hash verification for source {source.id}")
    return data


def intake_folder(db: Session, folder: Path, pattern: str = "*.md") -> list[tuple[Source, bool]]:
    """Batch intake of a folder of files; per-file results, failures don't abort."""
    results = []
    for path in sorted(folder.rglob(pattern)):
        if path.is_file():
            data = path.read_bytes()
            results.append(
                intake_bytes(
                    db,
                    data=data,
                    filename=path.name,
                    original_location=str(path),
                    source_type="MARKDOWN_FILE",
                )
            )
    return results
