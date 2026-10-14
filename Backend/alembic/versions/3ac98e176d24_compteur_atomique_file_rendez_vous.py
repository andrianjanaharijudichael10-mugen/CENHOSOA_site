"""Ajoute un compteur atomique pour les réservations de créneaux."""
from alembic import op
import sqlalchemy as sa


revision = "3ac98e176d24"
down_revision = "49a2c7d1e613"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "creneaux_medecin",
        sa.Column("dernier_numero_file", sa.Integer(), server_default="0", nullable=False),
    )
    op.execute(
        sa.text(
            """
            UPDATE creneaux_medecin
            SET dernier_numero_file = COALESCE(
                (
                    SELECT MAX(rendez_vous.numero_file)
                    FROM rendez_vous
                    WHERE rendez_vous.creneau_id = creneaux_medecin.id
                ),
                0
            )
            """
        )
    )


def downgrade() -> None:
    op.drop_column("creneaux_medecin", "dernier_numero_file")
