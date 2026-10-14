"""Ajoute une liste de médicaments prescrits par consultation."""
from alembic import op
import sqlalchemy as sa


revision = "de05f46c2b73"
down_revision = "cd94e35b1a62"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "consultations",
        sa.Column("medicaments_prescrits", sa.JSON(), nullable=True),
    )
    op.execute(
        """
        UPDATE consultations
        SET medicaments_prescrits = json_build_array(
            json_build_object(
                'nom', medicaments,
                'matin', quantite_matin,
                'midi', quantite_midi,
                'soir', quantite_soir
            )
        )
        WHERE medicaments IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_column("consultations", "medicaments_prescrits")
