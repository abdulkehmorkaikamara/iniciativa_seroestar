"""welcome letters

Course dates and weekly class times for each group's welcome letter, so
the admin can update them. Starts with the three letters that were
written into the student portal's code.

Revision ID: f6b8d0e2a4c5
Revises: e4a6c8d0f2b3
Create Date: 2026-10-26 18:00:00.000000

"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f6b8d0e2a4c5"
down_revision: Union[str, Sequence[str], None] = "e4a6c8d0f2b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

STARTING_LETTERS = [
    ("A1", 1, "19 May to 27 June 2026", 6, [
        ("19:00-20:00", "Tuesday", "Grammar-Lab"),
        ("19:00-20:00", "Thursday", "Vocabulary & Conversation"),
        ("10:00-11:00", "Saturday", "Listening Practice. Review"),
        ("11:00-12:00", "Saturday", "Final Project Coaching (Week 3-6)"),
    ]),
    ("A1", 2, "25 May to 04 July 2026", 6, [
        ("19:00-20:00", "Monday", "Grammar-Lab"),
        ("19:00-20:00", "Wednesday", "Vocabulary & Conversation"),
        ("08:00-09:00", "Saturday", "Listening Practice. Review"),
        ("09:00-10:00", "Saturday", "Final Project Coaching (Week 3-6)"),
    ]),
    ("A2", 1, "11 May to 04 July 2026", 8, [
        ("19:00-20:00", "Tuesday", "Grammar-Lab"),
        ("19:00-20:00", "Thursday", "Vocabulary & Conversation"),
        ("12:00-13:00", "Saturday", "Listening Practice. Review"),
        ("13:00-14:00", "Saturday", "Final Project Coaching (Week 5-8)"),
    ]),
]


def upgrade() -> None:
    bind = op.get_bind()
    if "welcome_letters" not in sa.inspect(bind).get_table_names():
        op.create_table(
            "welcome_letters",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("level", sa.String(5), nullable=False),
            sa.Column("group_number", sa.Integer(), nullable=False),
            sa.Column("course_dates", sa.String(255), nullable=False),
            sa.Column("duration_weeks", sa.Integer(), nullable=False),
            sa.Column("sessions", sa.Text(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.UniqueConstraint("level", "group_number", name="uq_welcome_letters_level_group"),
        )
        op.create_index("ix_welcome_letters_id", "welcome_letters", ["id"])
    if bind.execute(sa.text("SELECT COUNT(*) FROM welcome_letters")).scalar() == 0:
        letters = sa.table(
            "welcome_letters",
            sa.column("level", sa.String),
            sa.column("group_number", sa.Integer),
            sa.column("course_dates", sa.String),
            sa.column("duration_weeks", sa.Integer),
            sa.column("sessions", sa.Text),
        )
        op.bulk_insert(letters, [
            {
                "level": level,
                "group_number": group,
                "course_dates": dates,
                "duration_weeks": weeks,
                "sessions": json.dumps([{"time": t, "day": d, "session": s} for t, d, s in sessions]),
            }
            for level, group, dates, weeks, sessions in STARTING_LETTERS
        ])


def downgrade() -> None:
    if "welcome_letters" in sa.inspect(op.get_bind()).get_table_names():
        op.drop_index("ix_welcome_letters_id", table_name="welcome_letters")
        op.drop_table("welcome_letters")
