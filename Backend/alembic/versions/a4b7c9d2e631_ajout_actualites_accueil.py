"""Ajoute les actualités illustrées à la page d'accueil."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "a4b7c9d2e631"
down_revision = "7c2e9a1d4b60"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "actualites",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("texte", sa.Text(), nullable=False),
        sa.Column("photo_url", sa.String(length=500), nullable=False),
        sa.Column("auteur_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "date_creation",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["auteur_id"], ["utilisateurs.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_actualites_date_creation",
        "actualites",
        ["date_creation"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_actualites_date_creation", table_name="actualites")
    op.drop_table("actualites")
