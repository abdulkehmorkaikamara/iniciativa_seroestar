"""content class group

Adds a nullable ``class_group`` to classes, shared notes and recordings so a
tutor can publish to one school's group. NULL keeps the old behaviour: the
item is visible to every group at its level.

Revision ID: c4e8a1d2f9b7
Revises: a7c3d18b52e1
Create Date: 2026-10-13 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4e8a1d2f9b7"
down_revision: Union[str, Sequence[str], None] = "a7c3d18b52e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("live_class_sessions", "lesson_notes", "recorded_classes")


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for table in TABLES:
        if "class_group" not in {column["name"] for column in inspector.get_columns(table)}:
            op.add_column(table, sa.Column("class_group", sa.String(50), nullable=True))


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for table in TABLES:
        if "class_group" in {column["name"] for column in inspector.get_columns(table)}:
            op.drop_column(table, "class_group")
