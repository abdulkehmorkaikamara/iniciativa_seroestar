"""rate limit events

Failed logins and password-reset requests, stored in the database so the
limits hold even though the site runs on several short-lived servers.

Revision ID: a1c3e5f7b9d2
Revises: f6b8d0e2a4c5
Create Date: 2026-10-26 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1c3e5f7b9d2"
down_revision: Union[str, Sequence[str], None] = "f6b8d0e2a4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "rate_limit_events" not in tables:
        op.create_table(
            "rate_limit_events",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("bucket", sa.String(50), nullable=False),
            sa.Column("key_hash", sa.String(64), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_rate_limit_events_id", "rate_limit_events", ["id"])
        op.create_index("ix_rate_limit_events_created_at", "rate_limit_events", ["created_at"])
        op.create_index("ix_rate_limit_events_lookup", "rate_limit_events", ["bucket", "key_hash", "created_at"])


def downgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "rate_limit_events" in tables:
        op.drop_index("ix_rate_limit_events_lookup", table_name="rate_limit_events")
        op.drop_index("ix_rate_limit_events_created_at", table_name="rate_limit_events")
        op.drop_index("ix_rate_limit_events_id", table_name="rate_limit_events")
        op.drop_table("rate_limit_events")
