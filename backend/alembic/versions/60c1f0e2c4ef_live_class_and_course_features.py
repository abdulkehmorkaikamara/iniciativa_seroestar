"""add live class and course features

Revision ID: 60c1f0e2c4ef
Revises: 99f41deb343e
Create Date: 2026-07-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "60c1f0e2c4ef"
down_revision: Union[str, Sequence[str], None] = "99f41deb343e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    table_names = set(inspector.get_table_names())
    live_columns = {column["name"] for column in inspector.get_columns("live_class_sessions")}
    live_column_definitions = {
        "provider": sa.Column("provider", sa.String(length=50), server_default="daily", nullable=True),
        "room_name": sa.Column("room_name", sa.String(length=255), nullable=True),
        "room_url": sa.Column("room_url", sa.String(length=500), nullable=True),
        "join_token": sa.Column("join_token", sa.Text(), nullable=True),
        "recording_url": sa.Column("recording_url", sa.String(length=500), nullable=True),
        "started_at": sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        "ended_at": sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        "created_at": sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        "teacher_profile_id": sa.Column("teacher_profile_id", sa.Integer(), nullable=True),
    }
    for column_name, column in live_column_definitions.items():
        if column_name not in live_columns:
            op.add_column("live_class_sessions", column)

    recorded_columns = {column["name"] for column in inspector.get_columns("recorded_classes")}
    if "session_id" not in recorded_columns:
        op.add_column("recorded_classes", sa.Column("session_id", sa.Integer(), nullable=True))
    recorded_foreign_keys = inspector.get_foreign_keys("recorded_classes")
    if not any(foreign_key.get("constrained_columns") == ["session_id"] for foreign_key in recorded_foreign_keys):
        op.create_foreign_key(
            "fk_recorded_classes_session_id",
            "recorded_classes",
            "live_class_sessions",
            ["session_id"],
            ["id"],
        )

    if "courses" not in table_names:
        op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("level", sa.String(length=50), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("duration_weeks", sa.Integer(), nullable=True),
        sa.Column("cover_image_url", sa.String(length=500), nullable=True),
        sa.Column("published", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
        )

    if "course_modules" not in table_names:
        op.create_table(
        "course_modules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"]),
        sa.PrimaryKeyConstraint("id"),
        )

    if "course_lessons" not in table_names:
        op.create_table(
        "course_lessons",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("module_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("lesson_type", sa.String(length=50), nullable=True),
        sa.Column("video_url", sa.String(length=500), nullable=True),
        sa.Column("pdf_url", sa.String(length=500), nullable=True),
        sa.Column("quiz_url", sa.String(length=500), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["module_id"], ["course_modules.id"]),
        sa.PrimaryKeyConstraint("id"),
        )

    if "course_enrollments" not in table_names:
        op.create_table(
        "course_enrollments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"]),
        sa.PrimaryKeyConstraint("id"),
        )

    if "lesson_progress" not in table_names:
        op.create_table(
        "lesson_progress",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("student_id", sa.Integer(), nullable=False),
        sa.Column("lesson_id", sa.Integer(), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=True),
        sa.Column("percent_watched", sa.Integer(), nullable=True),
        sa.Column("last_position_seconds", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
        sa.ForeignKeyConstraint(["lesson_id"], ["course_lessons.id"]),
        sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    op.drop_table("lesson_progress")
    op.drop_table("course_enrollments")
    op.drop_table("course_lessons")
    op.drop_table("course_modules")
    op.drop_table("courses")
    op.drop_constraint(None, "recorded_classes", type_="foreignkey")
    op.drop_column("recorded_classes", "session_id")
    op.drop_column("live_class_sessions", "teacher_profile_id")
    op.drop_column("live_class_sessions", "created_at")
    op.drop_column("live_class_sessions", "ended_at")
    op.drop_column("live_class_sessions", "started_at")
    op.drop_column("live_class_sessions", "recording_url")
    op.drop_column("live_class_sessions", "join_token")
    op.drop_column("live_class_sessions", "room_url")
    op.drop_column("live_class_sessions", "room_name")
    op.drop_column("live_class_sessions", "provider")
