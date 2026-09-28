"""initial

Creates the core schema. This revision used to be an empty stub, which meant
``alembic upgrade head`` failed on a fresh database: the next revision inspects
``live_class_sessions`` and that table had never been created. Every statement
is guarded so the revision is also safe to stamp onto a database that was
originally created with ``Base.metadata.create_all``.

Revision ID: 99f41deb343e
Revises:
Create Date: 2026-07-09 10:31:08.305632

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99f41deb343e'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    existing = set(sa.inspect(op.get_bind()).get_table_names())

    if "users" not in existing:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("hashed_password", sa.String(length=255), nullable=False),
            sa.Column("full_name", sa.String(length=255), nullable=False),
            sa.Column("role", sa.String(length=50), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("email"),
        )
        op.create_index("ix_users_email", "users", ["email"], unique=True)
        op.create_index("ix_users_id", "users", ["id"])

    if "students" not in existing:
        op.create_table(
            "students",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("student_id_code", sa.String(length=50), nullable=False),
            sa.Column("phone_number", sa.String(length=50), nullable=True),
            sa.Column("course_level", sa.String(length=50), nullable=True),
            sa.Column("class_group", sa.String(length=50), nullable=True),
            sa.Column("learning_mode", sa.String(length=50), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=True),
            sa.Column("registration_date", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id"),
            sa.UniqueConstraint("student_id_code"),
        )
        op.create_index("ix_students_id", "students", ["id"])

    if "teachers" not in existing:
        op.create_table(
            "teachers",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("teacher_id_code", sa.String(length=50), nullable=False),
            sa.Column("assigned_levels", sa.String(length=255), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id"),
            sa.UniqueConstraint("teacher_id_code"),
        )
        op.create_index("ix_teachers_id", "teachers", ["id"])

    if "live_class_sessions" not in existing:
        op.create_table(
            "live_class_sessions",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("course_level", sa.String(length=50), nullable=False),
            sa.Column("teacher_name", sa.String(length=255), nullable=False),
            sa.Column("date_time", sa.String(length=100), nullable=False),
            sa.Column("meeting_link", sa.String(length=255), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_live_class_sessions_id", "live_class_sessions", ["id"])

    if "attendance_records" not in existing:
        op.create_table(
            "attendance_records",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("student_id", sa.Integer(), nullable=True),
            sa.Column("student_name", sa.String(length=255), nullable=False),
            sa.Column("student_code", sa.String(length=50), nullable=False),
            sa.Column("course_level", sa.String(length=50), nullable=False),
            sa.Column("session_id", sa.Integer(), nullable=True),
            sa.Column("join_time", sa.DateTime(timezone=True), nullable=True),
            sa.Column("leave_time", sa.DateTime(timezone=True), nullable=True),
            sa.Column("total_minutes", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=50), nullable=True),
            sa.ForeignKeyConstraint(["student_id"], ["students.id"]),
            sa.ForeignKeyConstraint(["session_id"], ["live_class_sessions.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_attendance_records_id", "attendance_records", ["id"])

    if "chat_messages" not in existing:
        op.create_table(
            "chat_messages",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("session_id", sa.Integer(), nullable=True),
            sa.Column("sender_name", sa.String(length=255), nullable=False),
            sa.Column("sender_role", sa.String(length=50), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("time_sent", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.ForeignKeyConstraint(["session_id"], ["live_class_sessions.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_chat_messages_id", "chat_messages", ["id"])

    if "lesson_notes" not in existing:
        op.create_table(
            "lesson_notes",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("course_level", sa.String(length=50), nullable=False),
            sa.Column("file_url", sa.String(length=255), nullable=False),
            sa.Column("file_type", sa.String(length=50), nullable=False),
            sa.Column("shared_with_students", sa.Boolean(), nullable=True),
            sa.Column("created_by", sa.String(length=255), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("file_size", sa.String(length=50), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_lesson_notes_id", "lesson_notes", ["id"])

    if "recorded_classes" not in existing:
        op.create_table(
            "recorded_classes",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("teacher_name", sa.String(length=255), nullable=False),
            sa.Column("course_level", sa.String(length=50), nullable=False),
            sa.Column("date_recorded", sa.String(length=100), nullable=False),
            sa.Column("video_url", sa.String(length=500), nullable=False),
            sa.Column("duration", sa.String(length=50), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_recorded_classes_id", "recorded_classes", ["id"])

    if "blog_posts" not in existing:
        op.create_table(
            "blog_posts",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("category", sa.String(length=100), nullable=False),
            sa.Column("excerpt", sa.Text(), nullable=False),
            sa.Column("content_markdown", sa.Text(), nullable=False),
            sa.Column("featured_image_url", sa.String(length=255), nullable=True),
            sa.Column("published", sa.Boolean(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_blog_posts_id", "blog_posts", ["id"])

    if "image_uploads" not in existing:
        op.create_table(
            "image_uploads",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("category", sa.String(length=100), nullable=False),
            sa.Column("path", sa.String(length=255), nullable=False),
            sa.Column("alt_text", sa.String(length=255), nullable=True),
            sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_image_uploads_id", "image_uploads", ["id"])

    if "chatbot_faqs" not in existing:
        op.create_table(
            "chatbot_faqs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("question", sa.String(length=255), nullable=False),
            sa.Column("answer", sa.Text(), nullable=False),
            sa.Column("language", sa.String(length=10), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_chatbot_faqs_id", "chatbot_faqs", ["id"])


def downgrade() -> None:
    """Downgrade schema."""
    for table in (
        "chatbot_faqs",
        "image_uploads",
        "blog_posts",
        "recorded_classes",
        "lesson_notes",
        "chat_messages",
        "attendance_records",
        "live_class_sessions",
        "teachers",
        "students",
        "users",
    ):
        op.drop_table(table)
