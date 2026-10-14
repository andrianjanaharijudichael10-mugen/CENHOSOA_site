"""Allow configurable bed categories and remove fixed inventory limits.

Revision ID: 7a4c2e9f1b60
Revises: d9a4f2c7b861
"""
from alembic import op
import sqlalchemy as sa


revision = "7a4c2e9f1b60"
down_revision = "d9a4f2c7b861"
branch_labels = None
depends_on = None


CATEGORIES_STANDARD = (
    ("vip", "VIP"),
    ("salle_septique", "Salle septique"),
    ("dechocage", "Déchoquage"),
    ("urgence", "Urgence"),
    ("triage", "Triage"),
)


def upgrade() -> None:
    op.create_table(
        "categories_lits",
        sa.Column("cle", sa.String(length=50), nullable=False),
        sa.Column("nom", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("cle"),
        sa.UniqueConstraint("nom"),
    )
    categories = sa.table(
        "categories_lits",
        sa.column("cle", sa.String),
        sa.column("nom", sa.String),
    )
    op.bulk_insert(
        categories,
        [{"cle": cle, "nom": nom} for cle, nom in CATEGORIES_STANDARD],
    )
    op.alter_column(
        "lits",
        "categorie",
        existing_type=sa.Enum(
            "VIP", "SALLE_SEPTIQUE", "DECHOCAGE", "URGENCE", "TRIAGE",
            name="categorie_lit",
        ),
        type_=sa.String(length=50),
        existing_nullable=False,
        postgresql_using="lower(categorie::text)",
    )
    op.create_foreign_key(
        "fk_lits_categorie_categories_lits",
        "lits",
        "categories_lits",
        ["categorie"],
        ["cle"],
    )
    op.execute("DROP TYPE categorie_lit")


def downgrade() -> None:
    op.drop_constraint("fk_lits_categorie_categories_lits", "lits", type_="foreignkey")
    op.execute(
        "CREATE TYPE categorie_lit AS ENUM "
        "('VIP', 'SALLE_SEPTIQUE', 'DECHOCAGE', 'URGENCE', 'TRIAGE')"
    )
    op.alter_column(
        "lits",
        "categorie",
        existing_type=sa.String(length=50),
        type_=sa.Enum(
            "VIP", "SALLE_SEPTIQUE", "DECHOCAGE", "URGENCE", "TRIAGE",
            name="categorie_lit",
        ),
        existing_nullable=False,
        postgresql_using="upper(categorie)::categorie_lit",
    )
    op.drop_table("categories_lits")
