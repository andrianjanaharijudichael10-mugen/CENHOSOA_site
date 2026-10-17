"""Ajoute les détails des actualités."""
from alembic import op
import sqlalchemy as sa


revision = "c6d9e2f50731"
down_revision = "b5c8d1e4f729"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("actualites", sa.Column("details", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("actualites", "details")
