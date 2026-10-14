"""Add contact and guest tracking credentials to ambulance missions."""
from alembic import op
import sqlalchemy as sa


revision = "3c8e1a7b5d42"
down_revision = "7a4c2e9f1b60"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "courses_ambulance",
        sa.Column("telephone_contact", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "courses_ambulance",
        sa.Column("jeton_suivi_hash", sa.String(length=64), nullable=True),
    )
    op.create_unique_constraint(
        "uq_courses_ambulance_jeton_suivi_hash",
        "courses_ambulance",
        ["jeton_suivi_hash"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_courses_ambulance_jeton_suivi_hash",
        "courses_ambulance",
        type_="unique",
    )
    op.drop_column("courses_ambulance", "jeton_suivi_hash")
    op.drop_column("courses_ambulance", "telephone_contact")
