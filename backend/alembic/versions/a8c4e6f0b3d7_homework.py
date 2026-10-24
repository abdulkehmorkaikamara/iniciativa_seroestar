"""homework

Homework tutors set per school group and the files students hand in.
Replaces the student portal's homework desk, which only pretended to upload.

Revision ID: a8c4e6f0b3d7
Revises: f7b3d5e9a2c6
Create Date: 2026-10-24 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a8c4e6f0b3d7"
down_revision: Union[str, Sequence[str], None] = "f7b3d5e9a2c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "homework" not in tables:
        op.create_table(
            "homework",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("instructions", sa.Text(), nullable=True),
            sa.Column("course_level", sa.String(50), nullable=False),
            sa.Column("class_group", sa.String(50), nullable=False),
            sa.Column("due_date", sa.String(20), nullable=True),
            sa.Column("assessment_id", sa.Integer(), sa.ForeignKey("assessments.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_by", sa.String(255), nullable=False),
            sa.Column("created_by_email", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )
        op.create_index("ix_homework_id", "homework", ["id"])
    if "homework_submissions" not in tables:
        op.create_table(
            "homework_submissions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("homework_id", sa.Integer(), sa.ForeignKey("homework.id", ondelete="CASCADE"), nullable=False),
            sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
            sa.Column("file_url", sa.String(1024), nullable=False),
            sa.Column("file_name", sa.String(255), nullable=False),
            sa.Column("file_size", sa.String(50), nullable=True),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("homework_id", "student_id", name="uq_homework_submissions_homework_student"),
        )
        op.create_index("ix_homework_submissions_id", "homework_submissions", ["id"])
        op.create_index("ix_homework_submissions_homework_id", "homework_submissions", ["homework_id"])
        op.create_index("ix_homework_submissions_student_id", "homework_submissions", ["student_id"])


def downgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "homework_submissions" in tables:
        op.drop_index("ix_homework_submissions_student_id", table_name="homework_submissions")
        op.drop_index("ix_homework_submissions_homework_id", table_name="homework_submissions")
        op.drop_index("ix_homework_submissions_id", table_name="homework_submissions")
        op.drop_table("homework_submissions")
    if "homework" in tables:
        op.drop_index("ix_homework_id", table_name="homework")
        op.drop_table("homework")
