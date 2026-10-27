"""Ajout photo responsable service

Revision ID: 40177e1a7795
Revises: 64491d6f4ea0
Create Date: 2026-09-27 22:06:22.626275

"""
from alembic import op
import sqlalchemy as sa

revision = '40177e1a7795'
down_revision = '64491d6f4ea0'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('services', sa.Column('photo_responsable_url', sa.String(length=500), nullable=True))

def downgrade() -> None:
    op.drop_column('services', 'photo_responsable_url')
