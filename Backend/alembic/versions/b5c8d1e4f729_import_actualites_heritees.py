"""Importe dans l'administration les actualités historiques de l'accueil."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "b5c8d1e4f729"
down_revision = "a4b7c9d2e631"
branch_labels = None
depends_on = None


IDENTIFIANTS_ACTUALITES_HERITEES = (
    "b5c8d1e4-f729-4a01-9000-000000000001",
    "b5c8d1e4-f729-4a01-9000-000000000002",
)


def upgrade() -> None:
    op.alter_column(
        "actualites",
        "photo_url",
        existing_type=sa.String(length=500),
        nullable=True,
    )
    op.execute(
        sa.text(
            """
            INSERT INTO actualites (id, texte, photo_url, auteur_id, date_creation)
            VALUES
                (:premiere_id, :premiere_texte, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '2 seconds'),
                (:deuxieme_id, :deuxieme_texte, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '1 second')
            ON CONFLICT (id) DO NOTHING
            """
        ).bindparams(
            sa.bindparam(
                "premiere_id",
                IDENTIFIANTS_ACTUALITES_HERITEES[0],
                type_=postgresql.UUID(as_uuid=False),
            ),
            sa.bindparam(
                "premiere_texte",
                "Célébration des 135 ans du CENHOSOA : "
                "modernisation et excellence médicale.",
            ),
            sa.bindparam(
                "deuxieme_id",
                IDENTIFIANTS_ACTUALITES_HERITEES[1],
                type_=postgresql.UUID(as_uuid=False),
            ),
            sa.bindparam(
                "deuxieme_texte",
                "Ouverture de nouveaux services de pointe "
                "pour renforcer l'offre de soins.",
            ),
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text("DELETE FROM actualites WHERE id IN (:premiere_id, :deuxieme_id)").bindparams(
            sa.bindparam(
                "premiere_id",
                IDENTIFIANTS_ACTUALITES_HERITEES[0],
                type_=postgresql.UUID(as_uuid=False),
            ),
            sa.bindparam(
                "deuxieme_id",
                IDENTIFIANTS_ACTUALITES_HERITEES[1],
                type_=postgresql.UUID(as_uuid=False),
            ),
        )
    )
    op.alter_column(
        "actualites",
        "photo_url",
        existing_type=sa.String(length=500),
        nullable=False,
    )
