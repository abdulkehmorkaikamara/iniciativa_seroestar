"""reviews, student notes and announcement states

Public reviews with admin approval, students' private notes, and which
announcements each student has read or removed. All three were previously
kept only in the visitor's browser.

Revision ID: b9d5f7a1c4e8
Revises: a8c4e6f0b3d7
Create Date: 2026-10-24 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b9d5f7a1c4e8"
down_revision: Union[str, Sequence[str], None] = "a8c4e6f0b3d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "reviews" not in tables:
        op.create_table(
            "reviews",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(100), nullable=False),
            sa.Column("location", sa.String(100), nullable=True),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("text", sa.Text(), nullable=False),
            sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("reviewed_by", sa.String(255), nullable=True),
        )
        op.create_index("ix_reviews_id", "reviews", ["id"])
        op.create_index("ix_reviews_status", "reviews", ["status"])
    if "student_notes" not in tables:
        op.create_table(
            "student_notes",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )
        op.create_index("ix_student_notes_id", "student_notes", ["id"])
        op.create_index("ix_student_notes_student_id", "student_notes", ["student_id"])
    if "announcement_states" not in tables:
        op.create_table(
            "announcement_states",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
            sa.Column("announcement_id", sa.Integer(), sa.ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False),
            sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("hidden", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.UniqueConstraint("student_id", "announcement_id", name="uq_announcement_states_student_announcement"),
        )
        op.create_index("ix_announcement_states_id", "announcement_states", ["id"])
        op.create_index("ix_announcement_states_student_id", "announcement_states", ["student_id"])
        op.create_index("ix_announcement_states_announcement_id", "announcement_states", ["announcement_id"])


def downgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "announcement_states" in tables:
        op.drop_index("ix_announcement_states_announcement_id", table_name="announcement_states")
        op.drop_index("ix_announcement_states_student_id", table_name="announcement_states")
        op.drop_index("ix_announcement_states_id", table_name="announcement_states")
        op.drop_table("announcement_states")
    if "student_notes" in tables:
        op.drop_index("ix_student_notes_student_id", table_name="student_notes")
        op.drop_index("ix_student_notes_id", table_name="student_notes")
        op.drop_table("student_notes")
    if "reviews" in tables:
        op.drop_index("ix_reviews_status", table_name="reviews")
        op.drop_index("ix_reviews_id", table_name="reviews")
        op.drop_table("reviews")
