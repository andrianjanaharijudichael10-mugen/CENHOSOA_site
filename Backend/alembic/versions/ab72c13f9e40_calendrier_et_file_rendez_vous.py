"""Ajoute les créneaux médicaux et la numérotation des files."""
from alembic import op
import sqlalchemy as sa


revision = "ab72c13f9e40"
down_revision = "d63e4a2c1b90"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "creneaux_medecin",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("service_id", sa.UUID(), nullable=False),
        sa.Column("date_heure", sa.DateTime(timezone=True), nullable=False),
        sa.Column("est_ouvert", sa.Boolean(), nullable=False),
        sa.Column(
            "date_creation",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_creneaux_medecin_service_id", "creneaux_medecin", ["service_id"])
    op.create_index("ix_creneaux_medecin_est_ouvert", "creneaux_medecin", ["est_ouvert"])
    op.create_index(
        "uq_creneau_service_date_heure",
        "creneaux_medecin",
        ["service_id", "date_heure"],
        unique=True,
    )
    op.add_column("rendez_vous", sa.Column("creneau_id", sa.UUID(), nullable=True))
    op.add_column("rendez_vous", sa.Column("numero_file", sa.Integer(), nullable=True))
    op.create_index("ix_rendez_vous_creneau_id", "rendez_vous", ["creneau_id"])
    op.create_foreign_key(
        "fk_rendez_vous_creneau_id_creneaux_medecin",
        "rendez_vous",
        "creneaux_medecin",
        ["creneau_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.drop_index("uq_rendez_vous_patient_service", table_name="rendez_vous")
    op.create_index(
        "uq_rendez_vous_patient_service",
        "rendez_vous",
        ["patient_id", "service_id"],
        unique=True,
        postgresql_where=sa.text("statut IN ('en_attente', 'confirme')"),
    )
    op.create_index(
        "uq_rendez_vous_creneau_numero_file",
        "rendez_vous",
        ["creneau_id", "numero_file"],
        unique=True,
        postgresql_where=sa.text("creneau_id IS NOT NULL AND numero_file IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_rendez_vous_creneau_numero_file", table_name="rendez_vous")
    op.drop_index("uq_rendez_vous_patient_service", table_name="rendez_vous")
    op.create_index(
        "uq_rendez_vous_patient_service",
        "rendez_vous",
        ["patient_id", "service_id"],
        unique=True,
    )
    op.drop_constraint(
        "fk_rendez_vous_creneau_id_creneaux_medecin",
        "rendez_vous",
        type_="foreignkey",
    )
    op.drop_index("ix_rendez_vous_creneau_id", table_name="rendez_vous")
    op.drop_column("rendez_vous", "numero_file")
    op.drop_column("rendez_vous", "creneau_id")
    op.drop_index("ix_creneaux_medecin_est_ouvert", table_name="creneaux_medecin")
    op.drop_index("ix_creneaux_medecin_service_id", table_name="creneaux_medecin")
    op.drop_index("uq_creneau_service_date_heure", table_name="creneaux_medecin")
    op.drop_table("creneaux_medecin")
