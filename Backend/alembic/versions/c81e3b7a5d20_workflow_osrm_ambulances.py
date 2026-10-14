"""Ajoute les étapes déclaratives OSRM et les réservations ambulance."""
from alembic import op
import sqlalchemy as sa


revision = "c81e3b7a5d20"
down_revision = "f7a2c9d1e640"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("courses_ambulance", sa.Column("adresse_patient", sa.String(length=255), server_default="", nullable=False))
    op.add_column("courses_ambulance", sa.Column("distance_aller_km", sa.Float(), server_default="0", nullable=False))
    op.add_column("courses_ambulance", sa.Column("duree_aller_minutes", sa.Integer(), server_default="0", nullable=False))
    op.add_column("courses_ambulance", sa.Column("distance_retour_km", sa.Float(), server_default="0", nullable=False))
    op.add_column("courses_ambulance", sa.Column("duree_retour_minutes", sa.Integer(), server_default="0", nullable=False))
    op.add_column("courses_ambulance", sa.Column("urgence_vitale", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("courses_ambulance", sa.Column("patient_infectieux", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("courses_ambulance", sa.Column("motif_infectieux", sa.String(length=255), nullable=True))
    op.add_column("courses_ambulance", sa.Column("heure_transport", sa.DateTime(timezone=True), nullable=True))
    op.add_column("courses_ambulance", sa.Column("heure_arrivee_urgences", sa.DateTime(timezone=True), nullable=True))
    op.add_column("courses_ambulance", sa.Column("heure_bionettoyage", sa.DateTime(timezone=True), nullable=True))
    op.add_column("courses_ambulance", sa.Column("lit_secondaire_id", sa.UUID(), nullable=True))
    op.add_column("lits", sa.Column("mission_reservation_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_courses_ambulance_lit_secondaire_id_lits",
        "courses_ambulance",
        "lits",
        ["lit_secondaire_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_lits_mission_reservation_id_courses_ambulance",
        "lits",
        "courses_ambulance",
        ["mission_reservation_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_lits_mission_reservation_id",
        "lits",
        ["mission_reservation_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_lits_mission_reservation_id", table_name="lits")
    op.drop_constraint("fk_lits_mission_reservation_id_courses_ambulance", "lits", type_="foreignkey")
    op.drop_constraint("fk_courses_ambulance_lit_secondaire_id_lits", "courses_ambulance", type_="foreignkey")
    op.drop_column("lits", "mission_reservation_id")
    op.drop_column("courses_ambulance", "lit_secondaire_id")
    op.drop_column("courses_ambulance", "heure_bionettoyage")
    op.drop_column("courses_ambulance", "heure_arrivee_urgences")
    op.drop_column("courses_ambulance", "heure_transport")
    op.drop_column("courses_ambulance", "motif_infectieux")
    op.drop_column("courses_ambulance", "patient_infectieux")
    op.drop_column("courses_ambulance", "urgence_vitale")
    op.drop_column("courses_ambulance", "duree_retour_minutes")
    op.drop_column("courses_ambulance", "distance_retour_km")
    op.drop_column("courses_ambulance", "duree_aller_minutes")
    op.drop_column("courses_ambulance", "distance_aller_km")
    op.drop_column("courses_ambulance", "adresse_patient")
