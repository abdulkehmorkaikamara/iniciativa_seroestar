"""persistent auth accounts

Adds the bookkeeping columns the persistent login system needs and renames the
legacy role values in place:

* ``admin``   -> ``developer``
* ``teacher`` -> ``tutor``

The rename only rewrites ``users.role``. Passwords are untouched, so existing
accounts keep working after the upgrade.

Revision ID: a7c3d18b52e1
Revises: 60c1f0e2c4ef
Create Date: 2026-09-15 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7c3d18b52e1"
down_revision: Union[str, Sequence[str], None] = "60c1f0e2c4ef"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


NEW_COLUMNS = {
    "is_active": sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    "is_seeded": sa.Column("is_seeded", sa.Boolean(), nullable=False, server_default=sa.false()),
    "last_login_at": sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    "password_changed_at": sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True),
    "updated_at": sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_columns = {column["name"] for column in inspector.get_columns("users")}

    for name, column in NEW_COLUMNS.items():
        if name not in existing_columns:
            op.add_column("users", column)

    existing_indexes = {index["name"] for index in inspector.get_indexes("users")}
    if "ix_users_role" not in existing_indexes:
        op.create_index("ix_users_role", "users", ["role"])

    # Backfill rows written before these columns existed.
    op.execute(sa.text("UPDATE users SET is_active = true WHERE is_active IS NULL"))
    op.execute(sa.text("UPDATE users SET is_seeded = false WHERE is_seeded IS NULL"))

    # Canonical role names for the three portals.
    op.execute(sa.text("UPDATE users SET role = 'developer' WHERE role IN ('admin', 'administrator', 'root', 'superuser')"))
    op.execute(sa.text("UPDATE users SET role = 'tutor' WHERE role IN ('teacher', 'instructor')"))
    op.execute(sa.text("UPDATE users SET role = 'student' WHERE role IS NULL OR role = ''"))


def downgrade() -> None:
    op.execute(sa.text("UPDATE users SET role = 'admin' WHERE role = 'developer'"))
    op.execute(sa.text("UPDATE users SET role = 'teacher' WHERE role = 'tutor'"))

    inspector = sa.inspect(op.get_bind())
    existing_indexes = {index["name"] for index in inspector.get_indexes("users")}
    if "ix_users_role" in existing_indexes:
        op.drop_index("ix_users_role", table_name="users")

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    for name in reversed(list(NEW_COLUMNS)):
        if name in existing_columns:
            op.drop_column("users", name)
