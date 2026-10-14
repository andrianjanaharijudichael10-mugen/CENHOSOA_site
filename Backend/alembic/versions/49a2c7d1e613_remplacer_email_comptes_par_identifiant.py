"""Remplace l'e-mail des comptes par téléphone patient ou identifiant personnel."""
import uuid

from alembic import op
import sqlalchemy as sa

from app.core.config import parametres

revision = "49a2c7d1e613"
down_revision = "7d2c9a4f18b3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "utilisateurs",
        sa.Column("identifiant", sa.String(length=100), nullable=True),
    )
    op.execute(
        "UPDATE patients SET telephone = regexp_replace(telephone, '[[:space:]-]', '', 'g') "
        "WHERE telephone IS NOT NULL"
    )
    op.execute(
        """
        UPDATE utilisateurs AS u
        SET identifiant = p.telephone
        FROM patients AS p
        WHERE p.utilisateur_id = u.id AND u.role = 'PATIENT'
        """
    )
    op.execute(
        """
        UPDATE utilisateurs AS u
        SET identifiant = btrim(p.matricule)
        FROM personnels AS p
        WHERE p.utilisateur_id = u.id AND u.role <> 'PATIENT' AND u.role <> 'SUPERADMIN'
        """
    )

    administrateurs = op.get_bind().execute(
        sa.text(
            "SELECT id FROM utilisateurs "
            "WHERE role = 'SUPERADMIN' AND identifiant IS NULL ORDER BY id"
        )
    ).scalars().all()
    identifiant_configure = parametres.SUPERADMIN_IDENTIFIANT
    if administrateurs and not identifiant_configure:
        raise RuntimeError(
            "Configurez SUPERADMIN_IDENTIFIANT avant la migration pour préserver l'accès SuperAdmin."
        )
    for index, administrateur_id in enumerate(administrateurs):
        identifiant = (
            identifiant_configure
            if index == 0 and identifiant_configure
            else f"superadmin-{str(administrateur_id).replace('-', '')[:12]}"
        )
        op.get_bind().execute(
            sa.text("UPDATE utilisateurs SET identifiant = :identifiant WHERE id = :id"),
            {"identifiant": identifiant, "id": administrateur_id},
        )

    comptes_sans_identifiant = op.get_bind().execute(
        sa.text("SELECT count(*) FROM utilisateurs WHERE identifiant IS NULL")
    ).scalar_one()
    if comptes_sans_identifiant:
        raise RuntimeError(
            "Migration interrompue : chaque compte doit avoir un téléphone patient ou un matricule personnel. "
            "Complétez les profils concernés avant de relancer Alembic."
        )

    doublons = op.get_bind().execute(
        sa.text(
            "SELECT identifiant FROM utilisateurs GROUP BY identifiant "
            "HAVING count(*) > 1 LIMIT 1"
        )
    ).first()
    if doublons:
        raise RuntimeError(
            "Migration interrompue : des comptes partagent le même téléphone ou identifiant. "
            "Rendez les identifiants uniques avant de relancer Alembic."
        )

    telephones_patients_manquants = op.get_bind().execute(
        sa.text("SELECT count(*) FROM patients WHERE telephone IS NULL OR telephone = ''")
    ).scalar_one()
    if telephones_patients_manquants:
        raise RuntimeError(
            "Migration interrompue : chaque patient doit avoir un téléphone Malagasy avant l'activation des SMS."
        )

    op.alter_column("utilisateurs", "identifiant", nullable=False)
    op.create_index("ix_utilisateurs_identifiant", "utilisateurs", ["identifiant"], unique=True)
    op.alter_column("patients", "telephone", nullable=False)
    op.drop_index("ix_utilisateurs_email", table_name="utilisateurs")
    op.drop_column("utilisateurs", "email")


def downgrade() -> None:
    raise RuntimeError(
        "Cette migration supprime les e-mails de compte. Pour revenir en arrière, restaurez une sauvegarde "
        "de la base de données prise avant la migration."
    )
