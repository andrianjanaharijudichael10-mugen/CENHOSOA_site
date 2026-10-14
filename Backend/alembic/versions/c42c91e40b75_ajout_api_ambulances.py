"""Ajout API de régulation des ambulances.

Revision ID: c42c91e40b75
Revises: a91c7c2e4d51
Create Date: 2026-10-01

"""
from alembic import op
import sqlalchemy as sa


revision = "c42c91e40b75"
down_revision = "a91c7c2e4d51"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE role_utilisateur ADD VALUE IF NOT EXISTS 'MAJOR'")
    op.execute("ALTER TYPE role_utilisateur ADD VALUE IF NOT EXISTS 'CHEF_DIVISION_AUTO'")
    op.execute("ALTER TYPE role_utilisateur ADD VALUE IF NOT EXISTS 'CHEF_SIM'")

    type_ambulance = sa.Enum("PRINCIPALE", "SECONDAIRE", name="type_ambulance")
    statut_ambulance = sa.Enum("DISPONIBLE", "NON_DISPONIBLE", name="statut_ambulance")
    statut_mission = sa.Enum("EN_COURS", "TERMINEE", name="statut_mission_ambulance")

    op.create_table(
        "ambulances",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.Column("nom", sa.String(length=100), nullable=False),
        sa.Column("type", type_ambulance, nullable=False),
        sa.Column("statut", statut_ambulance, nullable=False),
        sa.Column("date_creation", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_table(
        "missions_ambulance",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("ambulance_id", sa.UUID(), nullable=False),
        sa.Column("cree_par_id", sa.UUID(), nullable=False),
        sa.Column("patient", sa.String(length=150), nullable=False),
        sa.Column("destination", sa.String(length=255), nullable=False),
        sa.Column("distance_km", sa.Integer(), nullable=False),
        sa.Column("cout_base", sa.Integer(), nullable=False),
        sa.Column("statut", statut_mission, nullable=False),
        sa.Column("heure_depart", sa.DateTime(timezone=True), nullable=False),
        sa.Column("heure_arrivee", sa.DateTime(timezone=True), nullable=True),
        sa.Column("heure_prise_en_charge", sa.DateTime(timezone=True), nullable=True),
        sa.Column("heure_retour", sa.DateTime(timezone=True), nullable=True),
        sa.Column("minutes_retard", sa.Integer(), nullable=True),
        sa.Column("frais_retard", sa.Integer(), nullable=False),
        sa.Column("cout_total", sa.Integer(), nullable=False),
        sa.Column("date_creation", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["ambulance_id"], ["ambulances.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["cree_par_id"], ["utilisateurs.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_missions_ambulance_statut_date",
        "missions_ambulance",
        ["statut", "date_creation"],
    )

    op.execute(
        """
        INSERT INTO ambulances (id, code, nom, type, statut) VALUES
        ('c4a3e8e0-59db-4d22-9de9-000000000001', 'AMB-01', 'Ambulance principale', 'PRINCIPALE', 'DISPONIBLE'),
        ('c4a3e8e0-59db-4d22-9de9-000000000002', 'AMB-02', 'Ambulance secondaire 1', 'SECONDAIRE', 'DISPONIBLE'),
        ('c4a3e8e0-59db-4d22-9de9-000000000003', 'AMB-03', 'Ambulance secondaire 2', 'SECONDAIRE', 'DISPONIBLE'),
        ('c4a3e8e0-59db-4d22-9de9-000000000004', 'AMB-04', 'Ambulance secondaire 3', 'SECONDAIRE', 'DISPONIBLE')
        """
    )


def downgrade() -> None:
    op.drop_index("ix_missions_ambulance_statut_date", table_name="missions_ambulance")
    op.drop_table("missions_ambulance")
    op.drop_table("ambulances")
    op.execute("DROP TYPE statut_mission_ambulance")
    op.execute("DROP TYPE statut_ambulance")
    op.execute("DROP TYPE type_ambulance")