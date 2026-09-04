"""0001_core — initial governed schema.

Creates every table from app metadata plus database-level guard artifacts:
  - canon_status_audit: backstop audit of every canon_status mutation
  - audit trigger on governed object tables
  - registered_at immutability trigger on predictions
  - search_document tsvector table for unified search
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0001_core"
down_revision = None
branch_labels = None
depends_on = None

GOVERNED_TABLES = [
    "questions",
    "claims",
    "true_statements",
    "evidence",
    "discovery_commons",
    "predictions",
]


def upgrade() -> None:
    from app.db import Base
    from app import models  # noqa: F401 — ensure all tables are registered

    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)

    # Backstop audit: every canon_status change is recorded with its transaction id.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS canon_status_audit (
            id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
            table_name  text NOT NULL,
            object_uuid uuid NOT NULL,
            old_status  text NOT NULL,
            new_status  text NOT NULL,
            txid        bigint NOT NULL DEFAULT txid_current(),
            changed_at  timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    for table in GOVERNED_TABLES:
        op.execute(
            f"""
            CREATE OR REPLACE FUNCTION audit_canon_status_{table}() RETURNS trigger AS $$
            BEGIN
                IF OLD.canon_status IS DISTINCT FROM NEW.canon_status THEN
                    INSERT INTO canon_status_audit (table_name, object_uuid, old_status, new_status)
                    VALUES ('{table}', NEW.id, OLD.canon_status, NEW.canon_status);
                END IF;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            DROP TRIGGER IF EXISTS trg_audit_canon_status ON {table};
            CREATE TRIGGER trg_audit_canon_status BEFORE UPDATE ON {table}
                FOR EACH ROW EXECUTE FUNCTION audit_canon_status_{table}();
            """
        )

    # Prediction registrations are immutable: registered_at cannot change.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION predictions_registered_at_immutable() RETURNS trigger AS $$
        BEGIN
            IF OLD.registered_at IS DISTINCT FROM NEW.registered_at THEN
                RAISE EXCEPTION 'predictions.registered_at is immutable; create a new version';
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        DROP TRIGGER IF EXISTS trg_predictions_immutable ON predictions;
        CREATE TRIGGER trg_predictions_immutable BEFORE UPDATE ON predictions
            FOR EACH ROW EXECUTE FUNCTION predictions_registered_at_immutable();
        """
    )

    # Unified search document (maintained by services/search.py).
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS search_documents (
            object_uuid   uuid PRIMARY KEY,
            object_type   text NOT NULL,
            title         text NOT NULL,
            body          text NOT NULL,
            source_id     uuid,
            canon_status  text NOT NULL,
            statement_mode text,
            document      tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) STORED,
            updated_at    timestamptz NOT NULL DEFAULT now()
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS search_documents_fts ON search_documents USING GIN (document)")
    op.execute("CREATE INDEX IF NOT EXISTS search_documents_status ON search_documents (canon_status)")
    op.execute("CREATE INDEX IF NOT EXISTS search_documents_type ON search_documents (object_type)")


def downgrade() -> None:
    from app.db import Base
    from app import models  # noqa: F401

    op.execute("DROP TABLE IF EXISTS search_documents")
    for table in GOVERNED_TABLES:
        op.execute(f"DROP TRIGGER IF EXISTS trg_audit_canon_status ON {table}")
        op.execute(f"DROP FUNCTION IF EXISTS audit_canon_status_{table}")
    op.execute("DROP TRIGGER IF EXISTS trg_predictions_immutable ON predictions")
    op.execute("DROP FUNCTION IF EXISTS predictions_registered_at_immutable")
    op.execute("DROP TABLE IF EXISTS canon_status_audit")
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
