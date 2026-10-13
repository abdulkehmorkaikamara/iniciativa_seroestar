"""announcements

Moves class announcements from the tutor's browser storage into the database,
so every student in the chosen school receives them.

Revision ID: d5f1b3c7e2a4
Revises: c4e8a1d2f9b7
Create Date: 2026-10-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d5f1b3c7e2a4"
down_revision: Union[str, Sequence[str], None] = "c4e8a1d2f9b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if "announcements" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "announcements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("course_level", sa.String(50), nullable=False),
        sa.Column("class_group", sa.String(50), nullable=True),
        sa.Column("alert_type", sa.String(50), nullable=True, server_default="info"),
        sa.Column("created_by", sa.String(255), nullable=False),
        sa.Column("created_by_email", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_announcements_id", "announcements", ["id"])


def downgrade() -> None:
    if "announcements" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_index("ix_announcements_id", table_name="announcements")
        op.drop_table("announcements")
