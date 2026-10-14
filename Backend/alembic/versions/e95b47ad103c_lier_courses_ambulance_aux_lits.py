"""Lie une course d'ambulance au lit d'urgence attribué au retour."""
from alembic import op
import sqlalchemy as sa


revision = "e95b47ad103c"
down_revision = "c643e12d9a4f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("courses_ambulance", sa.Column("lit_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_courses_ambulance_lit_id_lits",
        "courses_ambulance",
        "lits",
        ["lit_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_courses_ambulance_lit_id_lits",
        "courses_ambulance",
        type_="foreignkey",
    )
    op.drop_column("courses_ambulance", "lit_id")