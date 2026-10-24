"""assessments

Tutor-entered grades: an assessment per school group and each student's
score on it. Replaces the student gradebook that only lived in the browser.

Revision ID: f7b3d5e9a2c6
Revises: e6a2c4d8f1b3
Create Date: 2026-10-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f7b3d5e9a2c6"
down_revision: Union[str, Sequence[str], None] = "e6a2c4d8f1b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "assessments" not in tables:
        op.create_table(
            "assessments",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("course_level", sa.String(50), nullable=False),
            sa.Column("class_group", sa.String(50), nullable=False),
            sa.Column("max_score", sa.Float(), nullable=False),
            sa.Column("assessed_on", sa.String(20), nullable=True),
            sa.Column("created_by", sa.String(255), nullable=False),
            sa.Column("created_by_email", sa.String(255), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )
        op.create_index("ix_assessments_id", "assessments", ["id"])
    if "assessment_scores" not in tables:
        op.create_table(
            "assessment_scores",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("assessment_id", sa.Integer(), sa.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False),
            sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
            sa.Column("score", sa.Float(), nullable=False),
            sa.Column("remarks", sa.Text(), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.UniqueConstraint("assessment_id", "student_id", name="uq_assessment_scores_assessment_student"),
        )
        op.create_index("ix_assessment_scores_id", "assessment_scores", ["id"])
        op.create_index("ix_assessment_scores_assessment_id", "assessment_scores", ["assessment_id"])
        op.create_index("ix_assessment_scores_student_id", "assessment_scores", ["student_id"])


def downgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "assessment_scores" in tables:
        op.drop_index("ix_assessment_scores_student_id", table_name="assessment_scores")
        op.drop_index("ix_assessment_scores_assessment_id", table_name="assessment_scores")
        op.drop_index("ix_assessment_scores_id", table_name="assessment_scores")
        op.drop_table("assessment_scores")
    if "assessments" in tables:
        op.drop_index("ix_assessments_id", table_name="assessments")
        op.drop_table("assessments")
