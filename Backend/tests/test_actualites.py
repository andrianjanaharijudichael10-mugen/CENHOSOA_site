import asyncio
import uuid

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import actualites as endpoints_actualites
from app.models.actualite import Actualite
from app.models.enums import RoleUtilisateur
from app.models.utilisateur import Utilisateur
from app.core.temps_reel import domaine_modifie


class RequeteFictive:
    def __init__(self, resultat):
        self.resultat = resultat

    def order_by(self, *_):
        return self

    def all(self):
        return self.resultat


class SessionFictive:
    def __init__(self, actualite=None):
        self.ajoute = None
        self.annulee = False
        self.actualite = actualite

    def query(self, modele):
        assert modele is Actualite
        return RequeteFictive([])

    def get(self, modele, identifiant):
        assert modele is Actualite
        return self.actualite if self.actualite and self.actualite.id == identifiant else None

    def add(self, objet):
        self.ajoute = objet

    def commit(self):
        pass

    def refresh(self, objet):
        pass

    def rollback(self):
        self.annulee = True


class FichierFictif:
    filename = "photo.jpg"

    def __init__(self, contenu):
        self.contenu = contenu

    async def read(self, _taille=None):
        return self.contenu


class RequeteHttpFictive:
    base_url = "https://cenhosoa.example/"


def test_actualites_are_listed_newest_first():
    session = SessionFictive()
    assert endpoints_actualites.lister_actualites(session) == []
    assert domaine_modifie("/api/v1/actualites") == "actualites"


def test_superadmin_can_publish_news_with_photo(monkeypatch, tmp_path):
    monkeypatch.setattr(
        endpoints_actualites, "DOSSIER_PHOTOS_ACTUALITES", tmp_path
    )
    session = SessionFictive()
    admin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )

    actualite = asyncio.run(
        endpoints_actualites.creer_actualite(
            RequeteHttpFictive(),
            "  Travaux terminés à l'hôpital  ",
            "L'établissement a achevé les travaux de modernisation.",
            FichierFictif(b"image"),
            admin,
            session,
        )
    )

    assert actualite is session.ajoute
    assert actualite.texte == "Travaux terminés à l'hôpital"
    assert actualite.details == "L'établissement a achevé les travaux de modernisation."
    assert actualite.auteur_id == admin.id
    assert actualite.photo_url.startswith("https://cenhosoa.example/fichiers/uploads/actualites/")
    assert next(tmp_path.iterdir()).read_bytes() == b"image"


def test_publication_refuse_un_fichier_trop_volumineux(monkeypatch, tmp_path):
    monkeypatch.setattr(
        endpoints_actualites, "DOSSIER_PHOTOS_ACTUALITES", tmp_path
    )
    admin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )

    with pytest.raises(HTTPException) as erreur:
        asyncio.run(
            endpoints_actualites.creer_actualite(
                RequeteHttpFictive(),
                "Actualité",
                "Détails de l'actualité.",
                FichierFictif(b"x" * (endpoints_actualites.TAILLE_MAX_IMAGE_OCTETS + 1)),
                admin,
                SessionFictive(),
            )
        )

    assert erreur.value.status_code == 400
    assert not list(tmp_path.iterdir())


def test_publication_refuse_un_format_image_non_supporte():
    class FichierNonImage(FichierFictif):
        filename = "photo.gif"

    admin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )
    with pytest.raises(HTTPException) as erreur:
        asyncio.run(
            endpoints_actualites.creer_actualite(
                RequeteHttpFictive(),
                "Actualité",
                "Détails de l'actualité.",
                FichierNonImage(b"image"),
                admin,
                SessionFictive(),
            )
        )

    assert erreur.value.status_code == 400


def test_superadmin_peut_modifier_actualite_et_remplacer_sa_photo(monkeypatch, tmp_path):
    monkeypatch.setattr(
        endpoints_actualites, "DOSSIER_PHOTOS_ACTUALITES", tmp_path
    )
    ancienne_photo = tmp_path / "ancienne.jpg"
    ancienne_photo.write_bytes(b"ancienne")
    actualite = Actualite(
        id=uuid.uuid4(),
        texte="Ancien texte",
        details="Détails précédents",
        photo_url="https://cenhosoa.example/fichiers/uploads/actualites/ancienne.jpg",
    )
    session = SessionFictive(actualite)

    resultat = asyncio.run(
        endpoints_actualites.modifier_actualite(
            actualite.id,
            RequeteHttpFictive(),
            "  Nouveau texte  ",
            "Nouveaux détails.",
            FichierFictif(b"nouvelle"),
            session,
        )
    )

    assert resultat is actualite
    assert actualite.texte == "Nouveau texte"
    assert actualite.details == "Nouveaux détails."
    assert actualite.photo_url.endswith(".jpg")
    assert not ancienne_photo.exists()
    assert (tmp_path / actualite.photo_url.rsplit("/", 1)[1]).read_bytes() == b"nouvelle"


def test_superadmin_peut_modifier_texte_sans_remplacer_photo():
    actualite = Actualite(
        id=uuid.uuid4(),
        texte="Ancien texte",
        details="Détails précédents",
        photo_url="https://cenhosoa.example/photo.jpg",
    )
    session = SessionFictive(actualite)

    resultat = asyncio.run(
        endpoints_actualites.modifier_actualite(
            actualite.id,
            RequeteHttpFictive(),
            "Texte corrigé",
            "Informations supplémentaires.",
            None,
            session,
        )
    )

    assert resultat.texte == "Texte corrigé"
    assert resultat.details == "Informations supplémentaires."
    assert resultat.photo_url == "https://cenhosoa.example/photo.jpg"
