"""portal messages

Messages between students and tutors inside the portals. Replaces the
student portal's email form, which only saved messages in the browser.

Revision ID: e6a2c4d8f1b3
Revises: d5f1b3c7e2a4
Create Date: 2026-10-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e6a2c4d8f1b3"
down_revision: Union[str, Sequence[str], None] = "d5f1b3c7e2a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if "portal_messages" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "portal_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("tutor_email", sa.String(255), nullable=False),
        sa.Column("tutor_name", sa.String(255), nullable=False),
        sa.Column("sender_role", sa.String(50), nullable=False),
        sa.Column("subject", sa.String(255), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_portal_messages_id", "portal_messages", ["id"])
    op.create_index("ix_portal_messages_student_id", "portal_messages", ["student_id"])
    op.create_index("ix_portal_messages_tutor_email", "portal_messages", ["tutor_email"])


def downgrade() -> None:
    if "portal_messages" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_index("ix_portal_messages_tutor_email", table_name="portal_messages")
        op.drop_index("ix_portal_messages_student_id", table_name="portal_messages")
        op.drop_index("ix_portal_messages_id", table_name="portal_messages")
        op.drop_table("portal_messages")
