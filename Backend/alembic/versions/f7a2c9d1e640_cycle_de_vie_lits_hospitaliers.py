"""Ajoute le cycle de vie et les contraintes de gestion des lits.

Revision ID: f7a2c9d1e640
Revises: d5c742a109e1
"""
from alembic import op
import sqlalchemy as sa


revision = "f7a2c9d1e640"
down_revision = "d5c742a109e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE statut_lit ADD VALUE IF NOT EXISTS 'RESERVE'")
    op.execute("ALTER TYPE statut_lit ADD VALUE IF NOT EXISTS 'NETTOYAGE'")
    op.add_column("lits", sa.Column("date_debut_nettoyage", sa.DateTime(timezone=True), nullable=True))
    op.add_column("lits", sa.Column("date_reservation", sa.DateTime(timezone=True), nullable=True))
    op.add_column("lits", sa.Column("lit_source_reservation_id", sa.UUID(), nullable=True))
    op.add_column("lits", sa.Column("motif_infectieux", sa.String(length=255), nullable=True))
    op.add_column("lits", sa.Column("urgence_vitale", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("lits", sa.Column("facturation_vip_validee", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.create_foreign_key(
        "fk_lits_lit_source_reservation_id_lits",
        "lits",
        "lits",
        ["lit_source_reservation_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_lits_lit_source_reservation_id_lits", "lits", type_="foreignkey")
    op.drop_column("lits", "facturation_vip_validee")
    op.drop_column("lits", "urgence_vitale")
    op.drop_column("lits", "motif_infectieux")
    op.drop_column("lits", "lit_source_reservation_id")
    op.drop_column("lits", "date_reservation")
    op.drop_column("lits", "date_debut_nettoyage")
