"""Retire les dossiers médicaux de l'API et ajoute les quotas journaliers."""
from alembic import op
import sqlalchemy as sa


revision = "7c2e9a1d4b60"
down_revision = "6e8f1a2c4b57"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Keep existing medical records archived rather than deleting them.
    op.rename_table("consultations", "consultations_archives")
    for constraint in (
        "consultations_patient_id_fkey",
        "consultations_rendez_vous_id_fkey",
        "consultations_medecin_id_fkey",
    ):
        op.drop_constraint(
            constraint,
            "consultations_archives",
            type_="foreignkey",
        )
    op.alter_column(
        "patients",
        "utilisateur_id",
        existing_type=sa.UUID(),
        nullable=True,
    )

    op.add_column(
        "rendez_vous",
        sa.Column("date_jour", sa.Date(), nullable=True),
    )
    op.execute(
        "UPDATE rendez_vous "
        "SET date_jour = CAST("
        "COALESCE(date_confirmee, date_souhaitee) AT TIME ZONE 'UTC' AS DATE)"
    )
    op.alter_column(
        "rendez_vous",
        "date_jour",
        existing_type=sa.Date(),
        nullable=False,
    )
    op.create_index("ix_rendez_vous_date_jour", "rendez_vous", ["date_jour"])
    op.add_column(
        "creneaux_medecin",
        sa.Column("date_jour", sa.Date(), nullable=True),
    )
    op.execute(
        "UPDATE creneaux_medecin "
        "SET date_jour = CAST(date_heure AT TIME ZONE 'UTC' AS DATE)"
    )
    op.alter_column(
        "creneaux_medecin",
        "date_jour",
        existing_type=sa.Date(),
        nullable=False,
    )
    op.create_index(
        "ix_creneaux_medecin_date_jour",
        "creneaux_medecin",
        ["date_jour"],
    )
    op.create_table(
        "quotas_rendez_vous_journaliers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("service_id", sa.UUID(), nullable=False),
        sa.Column("date_jour", sa.Date(), nullable=False),
        sa.Column("limite", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "service_id",
            "date_jour",
            name="uq_quota_rendez_vous_service_jour",
        ),
    )
    op.create_index(
        "ix_quotas_rendez_vous_journaliers_service_id",
        "quotas_rendez_vous_journaliers",
        ["service_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_quotas_rendez_vous_journaliers_service_id",
        table_name="quotas_rendez_vous_journaliers",
    )
    op.drop_table("quotas_rendez_vous_journaliers")
    op.drop_index("ix_creneaux_medecin_date_jour", table_name="creneaux_medecin")
    op.drop_column("creneaux_medecin", "date_jour")
    op.drop_index("ix_rendez_vous_date_jour", table_name="rendez_vous")
    op.drop_column("rendez_vous", "date_jour")
    op.alter_column(
        "patients",
        "utilisateur_id",
        existing_type=sa.UUID(),
        nullable=False,
    )
    op.rename_table("consultations_archives", "consultations")
    op.create_foreign_key(
        "consultations_patient_id_fkey",
        "consultations",
        "patients",
        ["patient_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "consultations_rendez_vous_id_fkey",
        "consultations",
        "rendez_vous",
        ["rendez_vous_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "consultations_medecin_id_fkey",
        "consultations",
        "personnels",
        ["medecin_id"],
        ["id"],
        ondelete="RESTRICT",
    )