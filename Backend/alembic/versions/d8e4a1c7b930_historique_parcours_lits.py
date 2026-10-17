"""Ajoute le journal du parcours des patients dans les lits d'urgence."""
import uuid

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "d8e4a1c7b930"
down_revision = "c6d9e2f50731"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "lits",
        sa.Column("episode_id_actuel", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column("lits", sa.Column("motif_transfert_reservation", sa.Text(), nullable=True))
    op.create_table(
        "historique_lits",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("episode_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type_evenement", sa.String(length=30), nullable=False),
        sa.Column("patient_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("nom_patient", sa.String(length=100), nullable=False),
        sa.Column("prenoms_patient", sa.String(length=150), nullable=False),
        sa.Column("lit_source_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("lit_source_numero", sa.String(length=20), nullable=True),
        sa.Column("lit_source_categorie", sa.String(length=50), nullable=True),
        sa.Column("lit_destination_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("lit_destination_numero", sa.String(length=20), nullable=True),
        sa.Column("lit_destination_categorie", sa.String(length=50), nullable=True),
        sa.Column("service_destination_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("service_destination_nom", sa.String(length=100), nullable=True),
        sa.Column("motif", sa.Text(), nullable=True),
        sa.Column("duree_occupation_secondes", sa.Integer(), nullable=True),
        sa.Column(
            "date_evenement",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("acteur_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("acteur_identifiant", sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(
            ["patient_id"], ["patients.id"], ondelete="SET NULL",
            name="fk_historique_lits_patient_id_patients",
        ),
        sa.ForeignKeyConstraint(
            ["lit_source_id"], ["lits.id"], ondelete="SET NULL",
            name="fk_historique_lits_lit_source_id_lits",
        ),
        sa.ForeignKeyConstraint(
            ["lit_destination_id"], ["lits.id"], ondelete="SET NULL",
            name="fk_historique_lits_lit_destination_id_lits",
        ),
        sa.ForeignKeyConstraint(
            ["service_destination_id"], ["services.id"], ondelete="SET NULL",
            name="fk_historique_lits_service_destination_id_services",
        ),
        sa.ForeignKeyConstraint(
            ["acteur_id"], ["utilisateurs.id"], ondelete="SET NULL",
            name="fk_historique_lits_acteur_id_utilisateurs",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_historique_lits_episode_id",
        "historique_lits",
        ["episode_id"],
        unique=False,
    )
    op.create_index(
        "ix_historique_lits_date_evenement",
        "historique_lits",
        ["date_evenement"],
        unique=False,
    )
    lits = sa.table(
        "lits",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("statut", sa.String()),
        sa.column("date_occupation", sa.DateTime(timezone=True)),
        sa.column("patient_id", postgresql.UUID(as_uuid=True)),
        sa.column("nom_patient_actuel", sa.String(length=100)),
        sa.column("prenoms_patient_actuel", sa.String(length=150)),
        sa.column("numero", sa.String(length=20)),
        sa.column("categorie", sa.String(length=50)),
        sa.column("motif_admission", sa.Text()),
        sa.column("episode_id_actuel", postgresql.UUID(as_uuid=True)),
    )
    historique = sa.table(
        "historique_lits",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("episode_id", postgresql.UUID(as_uuid=True)),
        sa.column("type_evenement", sa.String(length=30)),
        sa.column("patient_id", postgresql.UUID(as_uuid=True)),
        sa.column("nom_patient", sa.String(length=100)),
        sa.column("prenoms_patient", sa.String(length=150)),
        sa.column("lit_destination_id", postgresql.UUID(as_uuid=True)),
        sa.column("lit_destination_numero", sa.String(length=20)),
        sa.column("lit_destination_categorie", sa.String(length=50)),
        sa.column("motif", sa.Text()),
        sa.column("date_evenement", sa.DateTime(timezone=True)),
        sa.column("acteur_identifiant", sa.String(length=100)),
    )
    connexion = op.get_bind()
    lits_occupes = connexion.execute(
        sa.select(lits).where(
            lits.c.statut == "OCCUPE",
            lits.c.date_occupation.is_not(None),
        )
    ).mappings()
    for lit in lits_occupes:
        episode_id = uuid.uuid4()
        connexion.execute(
            lits.update().where(lits.c.id == lit["id"]).values(episode_id_actuel=episode_id)
        )
        connexion.execute(
            historique.insert().values(
                id=uuid.uuid4(),
                episode_id=episode_id,
                type_evenement="admission",
                patient_id=lit["patient_id"],
                nom_patient=lit["nom_patient_actuel"] or "non identifié",
                prenoms_patient=lit["prenoms_patient_actuel"] or "Patient",
                lit_destination_id=lit["id"],
                lit_destination_numero=lit["numero"],
                lit_destination_categorie=lit["categorie"],
                motif=lit["motif_admission"],
                date_evenement=lit["date_occupation"],
                acteur_identifiant="Historique initial",
            )
        )


def downgrade() -> None:
    op.drop_index("ix_historique_lits_date_evenement", table_name="historique_lits")
    op.drop_index("ix_historique_lits_episode_id", table_name="historique_lits")
    op.drop_table("historique_lits")
    op.drop_column("lits", "motif_transfert_reservation")
    op.drop_column("lits", "episode_id_actuel")
