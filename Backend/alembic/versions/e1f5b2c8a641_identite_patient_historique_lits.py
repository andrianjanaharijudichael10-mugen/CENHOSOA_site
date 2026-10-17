"""Ajoute une clé stable pour regrouper l'historique par patient."""
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "e1f5b2c8a641"
down_revision = "d8e4a1c7b930"
branch_labels = None
depends_on = None


def _identifiant_patient(patient_id, prenoms, nom):
    if patient_id is not None:
        return patient_id
    identite = f"{(prenoms or '').strip().casefold()}|{(nom or '').strip().casefold()}"
    return uuid.uuid5(uuid.NAMESPACE_URL, f"cenhosoa-bed-history:{identite}")


def upgrade() -> None:
    op.add_column(
        "historique_lits",
        sa.Column("patient_historique_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    historique = sa.table(
        "historique_lits",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("patient_id", postgresql.UUID(as_uuid=True)),
        sa.column("nom_patient", sa.String(length=100)),
        sa.column("prenoms_patient", sa.String(length=150)),
        sa.column("patient_historique_id", postgresql.UUID(as_uuid=True)),
    )
    connexion = op.get_bind()
    lignes = connexion.execute(
        sa.select(
            historique.c.id,
            historique.c.patient_id,
            historique.c.prenoms_patient,
            historique.c.nom_patient,
        )
    ).mappings()
    for ligne in lignes:
        connexion.execute(
            historique.update()
            .where(historique.c.id == ligne["id"])
            .values(
                patient_historique_id=_identifiant_patient(
                    ligne["patient_id"],
                    ligne["prenoms_patient"],
                    ligne["nom_patient"],
                )
            )
        )
    op.alter_column("historique_lits", "patient_historique_id", nullable=False)
    op.create_index(
        "ix_historique_lits_patient_historique_id",
        "historique_lits",
        ["patient_historique_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_historique_lits_patient_historique_id",
        table_name="historique_lits",
    )
    op.drop_column("historique_lits", "patient_historique_id")
