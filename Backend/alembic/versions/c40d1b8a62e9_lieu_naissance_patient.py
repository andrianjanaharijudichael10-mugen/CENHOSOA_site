"""Ajoute le lieu de naissance au profil patient."""
from alembic import op
import sqlalchemy as sa


revision = "c40d1b8a62e9"
down_revision = "8f79b625a301"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("lieu_naissance", sa.String(length=150), nullable=True))


def downgrade() -> None:
    op.drop_column("patients", "lieu_naissance")
