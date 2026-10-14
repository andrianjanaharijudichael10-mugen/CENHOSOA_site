"""Allow pending ambulance requests before regulator dispatch."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "5d7a2b9c1e43"
down_revision = "3c8e1a7b5d42"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "courses_ambulance",
        "ambulance_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )


def downgrade() -> None:
    connexion = op.get_bind()
    demandes_en_attente = connexion.scalar(
        sa.text("SELECT EXISTS (SELECT 1 FROM courses_ambulance WHERE ambulance_id IS NULL)")
    )
    if demandes_en_attente:
        raise RuntimeError("Traitez les demandes d'ambulance en attente avant de rétrograder cette migration.")
    op.alter_column(
        "courses_ambulance",
        "ambulance_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
