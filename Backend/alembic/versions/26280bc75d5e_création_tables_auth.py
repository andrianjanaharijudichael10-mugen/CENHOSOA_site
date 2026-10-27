"""Création tables auth

Revision ID: 26280bc75d5e
Revises: 
Create Date: 2026-09-27 17:25:59.679903

"""
from alembic import op
import sqlalchemy as sa

revision = '26280bc75d5e'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table('utilisateurs',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('mot_de_passe_hash', sa.String(length=255), nullable=False),
    sa.Column('role', sa.Enum('PATIENT', 'SECRETAIRE', 'REGULATEUR_AMBULANCE', 'MEDECIN', 'SUPERADMIN', name='role_utilisateur'), nullable=False),
    sa.Column('est_actif', sa.Boolean(), nullable=False),
    sa.Column('date_creation', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('derniere_connexion', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_utilisateurs_email'), 'utilisateurs', ['email'], unique=True)
    op.create_table('patients',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('utilisateur_id', sa.UUID(), nullable=False),
    sa.Column('nom', sa.String(length=100), nullable=False),
    sa.Column('prenoms', sa.String(length=150), nullable=False),
    sa.Column('telephone', sa.String(length=20), nullable=True),
    sa.Column('date_naissance', sa.Date(), nullable=True),
    sa.Column('adresse', sa.String(length=255), nullable=True),
    sa.Column('date_creation', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['utilisateur_id'], ['utilisateurs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('utilisateur_id')
    )
    op.create_table('personnels',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('utilisateur_id', sa.UUID(), nullable=False),
    sa.Column('nom', sa.String(length=100), nullable=False),
    sa.Column('prenoms', sa.String(length=150), nullable=False),
    sa.Column('matricule', sa.String(length=50), nullable=False),
    sa.Column('service', sa.String(length=100), nullable=True),
    sa.Column('telephone', sa.String(length=20), nullable=True),
    sa.Column('date_creation', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['utilisateur_id'], ['utilisateurs.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('matricule'),
    sa.UniqueConstraint('utilisateur_id')
    )

def downgrade() -> None:
    op.drop_table('personnels')
    op.drop_table('patients')
    op.drop_index(op.f('ix_utilisateurs_email'), table_name='utilisateurs')
    op.drop_table('utilisateurs')
