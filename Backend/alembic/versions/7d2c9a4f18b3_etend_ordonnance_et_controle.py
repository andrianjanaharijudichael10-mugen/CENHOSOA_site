"""Ajoute le contrôle supplémentaire à la consultation."""
from alembic import op
import sqlalchemy as sa


revision = "7d2c9a4f18b3"
down_revision = "de05f46c2b73"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "consultations",
        sa.Column("controle_supplementaire", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("consultations", "controle_supplementaire")
