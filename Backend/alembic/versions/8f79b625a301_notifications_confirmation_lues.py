"""Ajoute l'accusé de lecture des notifications de rendez-vous."""
from alembic import op
import sqlalchemy as sa


revision = "8f79b625a301"
down_revision = "3ac98e176d24"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "rendez_vous",
        sa.Column("date_confirmee_vue", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("rendez_vous", "date_confirmee_vue")
