"""student files

Files students keep in their portal's personal locker. The locker
previously only listed files in the browser and never uploaded them.

Revision ID: c2e4a6b8d0f1
Revises: b9d5f7a1c4e8
Create Date: 2026-10-26 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c2e4a6b8d0f1"
down_revision: Union[str, Sequence[str], None] = "b9d5f7a1c4e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "student_files" not in tables:
        op.create_table(
            "student_files",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
            sa.Column("file_name", sa.String(255), nullable=False),
            sa.Column("file_url", sa.String(1024), nullable=False),
            sa.Column("file_size", sa.String(50), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        )
        op.create_index("ix_student_files_id", "student_files", ["id"])
        op.create_index("ix_student_files_student_id", "student_files", ["student_id"])


def downgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "student_files" in tables:
        op.drop_index("ix_student_files_student_id", table_name="student_files")
        op.drop_index("ix_student_files_id", table_name="student_files")
        op.drop_table("student_files")
