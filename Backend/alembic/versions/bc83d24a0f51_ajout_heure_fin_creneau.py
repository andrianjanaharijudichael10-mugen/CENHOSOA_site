"""Ajoute l'heure de fermeture aux créneaux médicaux."""
from alembic import op
import sqlalchemy as sa


revision = "bc83d24a0f51"
down_revision = "ab72c13f9e40"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "creneaux_medecin",
        sa.Column("date_fin", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE creneaux_medecin SET date_fin = date_heure + INTERVAL '1 hour'"
    )
    op.alter_column("creneaux_medecin", "date_fin", nullable=False)
    op.create_check_constraint(
        "ck_creneaux_medecin_date_fin_apres_debut",
        "creneaux_medecin",
        "date_fin > date_heure",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_creneaux_medecin_date_fin_apres_debut",
        "creneaux_medecin",
        type_="check",
    )
    op.drop_column("creneaux_medecin", "date_fin")
