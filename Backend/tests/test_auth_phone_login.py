from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import auth
from app.models.enums import RoleUtilisateur
from app.schemas.auth import ConnexionSchema


class SessionFictive:
    def __init__(self, utilisateur):
        self.nombre_commits = 0
        self.utilisateur = utilisateur

    def query(self, modele):
        return RequeteFictive(self.utilisateur)

    def commit(self):
        self.nombre_commits += 1


class RequeteFictive:
    def __init__(self, utilisateur):
        self.utilisateur = utilisateur

    def filter(self, *conditions):
        return self

    def first(self):
        return self.utilisateur


def test_connexion_par_telephone_et_mot_de_passe(monkeypatch):
    utilisateur = SimpleNamespace(
        id="utilisateur-id",
        role=RoleUtilisateur.PATIENT,
        est_actif=True,
        mot_de_passe_hash="hash",
        derniere_connexion=None,
        patient=SimpleNamespace(telephone="+261331234567"),
    )
    session = SessionFictive(utilisateur)
    monkeypatch.setattr(auth, "verifier_mot_de_passe", lambda mot_de_passe, hachage: True)
    monkeypatch.setattr(auth, "creer_access_token", lambda utilisateur_id, role: "access")
    monkeypatch.setattr(auth, "creer_refresh_token", lambda utilisateur_id: "refresh")

    resultat = auth.connexion(
        ConnexionSchema(identifiant="+261331234567", mot_de_passe="Secret123"),
        session,
    )

    assert resultat.access_token == "access"
    assert resultat.refresh_token == "refresh"
    assert utilisateur.derniere_connexion is not None
    assert session.nombre_commits == 1


def test_connexion_personnel_par_matricule(monkeypatch):
    utilisateur = SimpleNamespace(
        id="utilisateur-id",
        role=RoleUtilisateur.MEDECIN,
        est_actif=True,
        mot_de_passe_hash="hash",
        derniere_connexion=None,
    )
    session = SessionFictive(utilisateur)
    monkeypatch.setattr(auth, "verifier_mot_de_passe", lambda mot_de_passe, hachage: True)
    monkeypatch.setattr(auth, "creer_access_token", lambda utilisateur_id, role: "access")
    monkeypatch.setattr(auth, "creer_refresh_token", lambda utilisateur_id: "refresh")

    resultat = auth.connexion(
        ConnexionSchema(identifiant="MED-01", mot_de_passe="Secret123"),
        session,
    )

    assert resultat.access_token == "access"
    assert session.nombre_commits == 1


def test_connexion_refuse_un_mot_de_passe_incorrect(monkeypatch):
    utilisateur = SimpleNamespace(
        est_actif=True,
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
        patient=SimpleNamespace(telephone="+261331234567"),
    )
    monkeypatch.setattr(auth, "verifier_mot_de_passe", lambda mot_de_passe, hachage: False)

    with pytest.raises(HTTPException) as erreur:
        auth.connexion(
            ConnexionSchema(identifiant="+261331234567", mot_de_passe="incorrect"),
            SessionFictive(utilisateur),
        )

    assert erreur.value.status_code == 401
