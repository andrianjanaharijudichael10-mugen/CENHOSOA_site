"""Ajout du rôle Major de garde à l'enum des utilisateurs.

Revision ID: a91c7c2e4d51
Revises: e3b86685f2b6
Create Date: 2026-09-30

"""
from alembic import op


revision = "a91c7c2e4d51"
down_revision = "e3b86685f2b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE role_utilisateur ADD VALUE IF NOT EXISTS 'MAJOR_DE_GARDE'")


def downgrade() -> None:
    pass