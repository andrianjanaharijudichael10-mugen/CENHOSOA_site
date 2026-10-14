"""Ajoute les dossiers de consultation et autorise les suivis."""
from alembic import op
import sqlalchemy as sa


revision = "d63e4a2c1b90"
down_revision = "81c4f2a9d7b0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("uq_rendez_vous_patient_service", table_name="rendez_vous")
    op.create_index(
        "uq_rendez_vous_patient_service",
        "rendez_vous",
        ["patient_id", "service_id"],
        unique=True,
        postgresql_where=sa.text("statut IN ('en_attente', 'confirme')"),
    )
    op.create_table(
        "consultations",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("patient_id", sa.UUID(), nullable=False),
        sa.Column("rendez_vous_id", sa.UUID(), nullable=False),
        sa.Column("medecin_id", sa.UUID(), nullable=False),
        sa.Column("remarques", sa.Text(), nullable=False),
        sa.Column("ordonnance", sa.Text(), nullable=True),
        sa.Column(
            "date_creation",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["rendez_vous_id"], ["rendez_vous.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["medecin_id"], ["personnels.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("rendez_vous_id", name="uq_consultation_rendez_vous"),
    )
    op.create_index("ix_consultations_patient_id", "consultations", ["patient_id"])


def downgrade() -> None:
    op.drop_index("ix_consultations_patient_id", table_name="consultations")
    op.drop_table("consultations")
    op.drop_index("uq_rendez_vous_patient_service", table_name="rendez_vous")
    op.create_index(
        "uq_rendez_vous_patient_service",
        "rendez_vous",
        ["patient_id", "service_id"],
        unique=True,
    )
