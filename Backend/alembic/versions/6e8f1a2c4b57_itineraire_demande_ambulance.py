"""Persist the route option selected for a pending ambulance request."""
from alembic import op
import sqlalchemy as sa


revision = "6e8f1a2c4b57"
down_revision = "5d7a2b9c1e43"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "courses_ambulance",
        sa.Column("itineraire_index", sa.Integer(), server_default="0", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("courses_ambulance", "itineraire_index")
