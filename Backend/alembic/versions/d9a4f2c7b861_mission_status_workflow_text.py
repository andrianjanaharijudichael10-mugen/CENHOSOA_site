"""Use text for ambulance workflow statuses."""
from alembic import op
import sqlalchemy as sa


revision = "d9a4f2c7b861"
down_revision = "c81e3b7a5d20"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "courses_ambulance",
        "statut",
        existing_type=sa.Enum(
            "EN_ROUTE",
            "SUR_PLACE",
            "TERMINEE",
            "ANNULEE",
            name="statut_course",
        ),
        type_=sa.String(length=30),
        existing_nullable=False,
        postgresql_using="statut::text",
    )


def downgrade() -> None:
    op.alter_column(
        "courses_ambulance",
        "statut",
        existing_type=sa.String(length=30),
        type_=sa.Enum(
            "EN_ROUTE",
            "SUR_PLACE",
            "TERMINEE",
            "ANNULEE",
            name="statut_course",
        ),
        existing_nullable=False,
        postgresql_using=(
            "CASE statut "
            "WHEN 'assigne' THEN 'EN_ROUTE' "
            "WHEN 'sur_les_lieux' THEN 'SUR_PLACE' "
            "WHEN 'en_transport' THEN 'EN_ROUTE' "
            "WHEN 'arrive_urgences' THEN 'SUR_PLACE' "
            "WHEN 'en_bionettoyage' THEN 'SUR_PLACE' "
            "WHEN 'terminee' THEN 'TERMINEE' "
            "WHEN 'annulee' THEN 'ANNULEE' "
            "WHEN 'en_cours' THEN 'EN_ROUTE' "
            "ELSE statut "
            "END::statut_course"
        ),
    )
