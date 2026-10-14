"""Ajoute les demandes et le suivi des rendez-vous."""
from alembic import op
import sqlalchemy as sa


revision = "f19d8a3b4c21"
down_revision = "e95b47ad103c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "rendez_vous",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("patient_id", sa.UUID(), nullable=False),
        sa.Column("service_id", sa.UUID(), nullable=True),
        sa.Column("service_nom", sa.String(length=100), nullable=False),
        sa.Column("date_souhaitee", sa.DateTime(timezone=True), nullable=False),
        sa.Column("date_confirmee", sa.DateTime(timezone=True), nullable=True),
        sa.Column("motif", sa.Text(), nullable=False),
        sa.Column("statut", sa.String(length=20), nullable=False),
        sa.Column("commentaire", sa.Text(), nullable=True),
        sa.Column(
            "date_creation",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "date_modification",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_rendez_vous_patient_id", "rendez_vous", ["patient_id"])
    op.create_index("ix_rendez_vous_service_id", "rendez_vous", ["service_id"])
    op.create_index("ix_rendez_vous_statut", "rendez_vous", ["statut"])


def downgrade() -> None:
    op.drop_index("ix_rendez_vous_statut", table_name="rendez_vous")
    op.drop_index("ix_rendez_vous_service_id", table_name="rendez_vous")
    op.drop_index("ix_rendez_vous_patient_id", table_name="rendez_vous")
    op.drop_table("rendez_vous")
