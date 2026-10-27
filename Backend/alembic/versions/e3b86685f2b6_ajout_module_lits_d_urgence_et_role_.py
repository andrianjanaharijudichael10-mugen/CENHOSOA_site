"""Ajout module lits d'urgence et role major_de_garde

Revision ID: e3b86685f2b6
Revises: 40177e1a7795
Create Date: 2026-09-28 23:05:57.651113

"""
from alembic import op
import sqlalchemy as sa

revision = 'e3b86685f2b6'
down_revision = '40177e1a7795'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table('lits',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('numero', sa.String(length=20), nullable=False),
    sa.Column('categorie', sa.Enum('VIP', 'SALLE_SEPTIQUE', 'DECHOCAGE', 'URGENCE', 'TRIAGE', name='categorie_lit'), nullable=False),
    sa.Column('statut', sa.Enum('LIBRE', 'OCCUPE', name='statut_lit'), nullable=False),
    sa.Column('nom_patient_actuel', sa.String(length=100), nullable=True),
    sa.Column('prenoms_patient_actuel', sa.String(length=150), nullable=True),
    sa.Column('patient_id', sa.UUID(), nullable=True),
    sa.Column('motif_admission', sa.Text(), nullable=True),
    sa.Column('date_occupation', sa.DateTime(timezone=True), nullable=True),
    sa.Column('date_liberation', sa.DateTime(timezone=True), nullable=True),
    sa.Column('date_creation', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('date_modification', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('numero')
    )

def downgrade() -> None:
    op.drop_table('lits')
