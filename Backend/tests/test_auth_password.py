import pytest
from fastapi import HTTPException

from app.api.v1.endpoints import auth
from app.models.enums import RoleUtilisateur
from app.models.utilisateur import Utilisateur
from app.schemas.auth import ModificationMotDePasseSchema


def test_changement_mot_de_passe_refuse_mot_de_passe_actuel_incorrect(monkeypatch):
    utilisateur = Utilisateur(
        identifiant="superadmin",
        mot_de_passe_hash="hash-actuel",
        role=RoleUtilisateur.SUPERADMIN,
    )
    monkeypatch.setattr(auth, "verifier_mot_de_passe", lambda mot_de_passe, hachage: False)

    with pytest.raises(HTTPException) as erreur:
        auth.modifier_mot_de_passe(
            ModificationMotDePasseSchema(
                mot_de_passe_actuel="incorrect",
                nouveau_mot_de_passe="Nouveau123",
            ),
            utilisateur,
            object(),
        )

    assert erreur.value.status_code == 400
    assert utilisateur.mot_de_passe_hash == "hash-actuel"


def test_seul_le_superadmin_peut_changer_un_mot_de_passe():
    utilisateur = Utilisateur(
        identifiant="+261331234567",
        mot_de_passe_hash="hash-actuel",
        role=RoleUtilisateur.PATIENT,
    )

    with pytest.raises(HTTPException) as erreur:
        auth.modifier_mot_de_passe(
            ModificationMotDePasseSchema(
                mot_de_passe_actuel="Actuel123",
                nouveau_mot_de_passe="Nouveau123",
            ),
            utilisateur,
            object(),
        )

    assert erreur.value.status_code == 403
    assert utilisateur.mot_de_passe_hash == "hash-actuel"


def test_changement_mot_de_passe_hache_le_nouveau_mot_de_passe(monkeypatch):
    utilisateur = Utilisateur(
        identifiant="superadmin",
        mot_de_passe_hash="hash-actuel",
        role=RoleUtilisateur.SUPERADMIN,
    )
    monkeypatch.setattr(
        auth,
        "verifier_mot_de_passe",
        lambda mot_de_passe, hachage: mot_de_passe == "Actuel123",
    )
    monkeypatch.setattr(auth, "hasher_mot_de_passe", lambda mot_de_passe: f"hash:{mot_de_passe}")

    class SessionFictive:
        est_validee = False

        def commit(self):
            self.est_validee = True

    session = SessionFictive()
    resultat = auth.modifier_mot_de_passe(
        ModificationMotDePasseSchema(
            mot_de_passe_actuel="Actuel123",
            nouveau_mot_de_passe="Nouveau123",
        ),
        utilisateur,
        session,
    )

    assert resultat is None
    assert utilisateur.mot_de_passe_hash == "hash:Nouveau123"
    assert session.est_validee


def test_nouveau_mot_de_passe_exige_une_lettre_et_un_chiffre():
    with pytest.raises(ValueError):
        ModificationMotDePasseSchema(
            mot_de_passe_actuel="Actuel123",
            nouveau_mot_de_passe="seulementdeslettres",
        )
