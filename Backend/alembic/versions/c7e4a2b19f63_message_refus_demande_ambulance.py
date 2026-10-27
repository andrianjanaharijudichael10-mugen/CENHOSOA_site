"""Store refusal messages on ambulance requests."""
from alembic import op
import sqlalchemy as sa


revision = "c7e4a2b19f63"
down_revision = "e1f5b2c8a641"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "courses_ambulance",
        sa.Column("message_refus", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("courses_ambulance", "message_refus")
