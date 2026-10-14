"""Ajoute une photo de profil privée pour chaque patient."""
from alembic import op
import sqlalchemy as sa


revision = "d5c742a109e1"
down_revision = "c40d1b8a62e9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("photo_profil", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "photo_profil")
