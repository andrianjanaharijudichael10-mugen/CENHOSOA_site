"""Persiste la prise en charge des patients dans les courses ambulance."""
from alembic import op
import sqlalchemy as sa


revision = "b7c6d4a93e12"
down_revision = "85d8dbf70d88"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "courses_ambulance",
        sa.Column("heure_prise_en_charge", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "courses_ambulance",
        sa.Column("minutes_retard", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("courses_ambulance", "minutes_retard")
    op.drop_column("courses_ambulance", "heure_prise_en_charge")