"""hidden built-in articles

Built-in blog articles (written in the site's code) that the admin has
taken off the website.

Revision ID: d3f5b7c9e1a2
Revises: c2e4a6b8d0f1
Create Date: 2026-10-26 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d3f5b7c9e1a2"
down_revision: Union[str, Sequence[str], None] = "c2e4a6b8d0f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "hidden_builtin_articles" not in tables:
        op.create_table(
            "hidden_builtin_articles",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("article_key", sa.String(100), nullable=False, unique=True),
            sa.Column("hidden_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
            sa.Column("hidden_by", sa.String(255), nullable=True),
        )
        op.create_index("ix_hidden_builtin_articles_id", "hidden_builtin_articles", ["id"])


def downgrade() -> None:
    tables = sa.inspect(op.get_bind()).get_table_names()
    if "hidden_builtin_articles" in tables:
        op.drop_index("ix_hidden_builtin_articles_id", table_name="hidden_builtin_articles")
        op.drop_table("hidden_builtin_articles")
