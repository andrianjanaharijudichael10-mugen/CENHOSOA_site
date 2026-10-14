"""Ajoute les médicaments et prises détaillées aux consultations."""
from alembic import op
import sqlalchemy as sa


revision = "cd94e35b1a62"
down_revision = "bc83d24a0f51"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("consultations", sa.Column("medicaments", sa.Text(), nullable=True))
    op.add_column("consultations", sa.Column("quantite_matin", sa.Text(), nullable=True))
    op.add_column("consultations", sa.Column("quantite_midi", sa.Text(), nullable=True))
    op.add_column("consultations", sa.Column("quantite_soir", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("consultations", "quantite_soir")
    op.drop_column("consultations", "quantite_midi")
    op.drop_column("consultations", "quantite_matin")
    op.drop_column("consultations", "medicaments")
