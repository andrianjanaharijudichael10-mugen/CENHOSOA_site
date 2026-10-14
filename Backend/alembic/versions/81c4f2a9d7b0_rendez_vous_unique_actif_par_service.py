"""Limite à un seul rendez-vous par patient et par service."""
from alembic import op
import sqlalchemy as sa


revision = "81c4f2a9d7b0"
down_revision = "f19d8a3b4c21"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "uq_rendez_vous_patient_service",
        "rendez_vous",
        ["patient_id", "service_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_rendez_vous_patient_service", table_name="rendez_vous")
