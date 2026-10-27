"""Ajout tables services et infos_centre

Revision ID: 64491d6f4ea0
Revises: 83128fd13562
Create Date: 2026-09-27 21:36:06.174299

"""
from alembic import op
import sqlalchemy as sa

revision = '64491d6f4ea0'
down_revision = '83128fd13562'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table('infos_centre',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email_centre', sa.String(length=255), nullable=True),
    sa.Column('date_modification', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('services',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('nom', sa.String(length=100), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('responsable', sa.String(length=150), nullable=True),
    sa.Column('horaires', sa.String(length=255), nullable=True),
    sa.Column('localisation', sa.String(length=150), nullable=True),
    sa.Column('telephone', sa.String(length=20), nullable=True),
    sa.Column('est_actif', sa.Boolean(), nullable=False),
    sa.Column('date_creation', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('date_modification', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('nom')
    )
    op.create_table('telephones_centre',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('infos_centre_id', sa.Integer(), nullable=False),
    sa.Column('numero', sa.String(length=30), nullable=False),
    sa.Column('libelle', sa.String(length=100), nullable=False),
    sa.Column('ordre', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['infos_centre_id'], ['infos_centre.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('telephones_centre')
    op.drop_table('services')
    op.drop_table('infos_centre')
