"""Conserve le chrono saisi par le chauffeur pour chaque course."""
from alembic import op
import sqlalchemy as sa


revision = "c643e12d9a4f"
down_revision = "b7c6d4a93e12"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "courses_ambulance",
        sa.Column("minutes_sur_place", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("courses_ambulance", "minutes_sur_place")