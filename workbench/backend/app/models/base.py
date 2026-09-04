"""Shared column mixins and canon-status constraint helper."""
from __future__ import annotations

import uuid

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from ..vocab import CANON_STATUSES, CANDIDATE_STATUS


class UUIDPrimaryKey:
    id: Mapped[uuid.UUID] = mapped_column(
        sa.Uuid, primary_key=True, server_default=sa.text("gen_random_uuid()")
    )


class Timestamps:
    created_at: Mapped[sa.DateTime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
    )
    updated_at: Mapped[sa.DateTime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.text("now()"),
        onupdate=sa.text("now()"),
        nullable=False,
    )


def canon_status_constraint() -> sa.CheckConstraint:
    allowed = ", ".join(f"'{s}'" for s in CANON_STATUSES)
    return sa.CheckConstraint(
        f"canon_status IN ({allowed})",
        name="canon_status_governed_vocabulary",
    )


DEFAULT_CANON_STATUS = CANDIDATE_STATUS


def canon_status_column() -> sa.Column:
    return sa.Column(
        "canon_status",
        sa.Text,
        nullable=False,
        server_default=sa.text(f"'{DEFAULT_CANON_STATUS}'"),
        default=DEFAULT_CANON_STATUS,
    )
