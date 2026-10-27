import uuid

import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.ambulances import supprimer_ambulance
from app.api.v1.endpoints.utilisateurs import (
    creer_personnel,
    modifier_statut_utilisateur,
    reinitialiser_mot_de_passe_personnel,
    supprimer_compte_personnel,
)
from app.models.ambulance import Ambulance, MissionAmbulance
from app.models.enums import RoleUtilisateur
from app.models.service import Service
from app.models.utilisateur import Utilisateur
from app.schemas.ambulance import CreationAmbulanceSchema
from app.schemas.utilisateur import (
    CreationPersonnelSchema,
    ModificationStatutUtilisateurSchema,
    ReinitialisationMotDePassePersonnelSchema,
)


def test_secretary_account_requires_an_active_service():
    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def first(self):
            return None

    class SessionFictive:
        def query(self, modele):
            assert modele is Service
            return RequeteFictive()

    with pytest.raises(HTTPException) as erreur:
        creer_personnel(
            CreationPersonnelSchema(
                mot_de_passe="Secret123",
                role=RoleUtilisateur.SECRETAIRE,
                nom="Rabe",
                prenoms="Miora",
                matricule="SEC-01",
                service="Neurologie",
            ),
            SessionFictive(),
        )

    assert erreur.value.status_code == 400


def test_superadmin_can_create_secretary_for_active_service(monkeypatch):
    service = Service(id=uuid.uuid4(), nom="Neurologie", est_actif=True)
    monkeypatch.setattr(
        "app.api.v1.endpoints.utilisateurs.hasher_mot_de_passe",
        lambda mot_de_passe: f"hash:{mot_de_passe}",
    )

    class RequeteFictive:
        def __init__(self, resultat):
            self.resultat = resultat

        def filter(self, *conditions):
            return self

        def first(self):
            return self.resultat

    class SessionFictive:
        ajoute = None

        def query(self, modele):
            if modele is Service:
                return RequeteFictive(service)
            return RequeteFictive(None)

        def add(self, objet):
            self.ajoute = objet

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    session = SessionFictive()
    resultat = creer_personnel(
        CreationPersonnelSchema(
            mot_de_passe="Secret123",
            role=RoleUtilisateur.SECRETAIRE,
            nom="Rabe",
            prenoms="Miora",
            matricule="SEC-01",
            service=" Neurologie ",
        ),
        session,
    )

    assert resultat.role == RoleUtilisateur.SECRETAIRE
    assert resultat.personnel.service == "Neurologie"
    assert resultat.mot_de_passe_hash == "hash:Secret123"
    assert session.ajoute is resultat


def test_superadmin_can_create_another_superadmin(monkeypatch):
    monkeypatch.setattr(
        "app.api.v1.endpoints.utilisateurs.hasher_mot_de_passe",
        lambda mot_de_passe: f"hash:{mot_de_passe}",
    )

    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def first(self):
            return None

    class SessionFictive:
        ajoute = None

        def query(self, modele):
            return RequeteFictive()

        def add(self, objet):
            self.ajoute = objet

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    session = SessionFictive()
    resultat = creer_personnel(
        CreationPersonnelSchema(
            mot_de_passe="Secret123",
            role=RoleUtilisateur.SUPERADMIN,
            nom="Rabe",
            prenoms="Miora",
            matricule="ADMIN-02",
        ),
        session,
    )

    assert resultat.role == RoleUtilisateur.SUPERADMIN
    assert resultat.identifiant == "ADMIN-02"
    assert resultat.personnel.matricule == "ADMIN-02"
    assert resultat.mot_de_passe_hash == "hash:Secret123"
    assert session.ajoute is resultat


def test_superadmin_cannot_disable_own_account():
    utilisateur = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )

    class SessionFictive:
        def get(self, modele, identifiant):
            assert identifiant == utilisateur.id
            return utilisateur

    with pytest.raises(HTTPException) as erreur:
        modifier_statut_utilisateur(
            utilisateur.id,
            ModificationStatutUtilisateurSchema(est_actif=False),
            utilisateur,
            SessionFictive(),
        )

    assert erreur.value.status_code == 409


def test_superadmin_can_delete_personnel_account_and_its_profile():
    superadmin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )
    compte_personnel = Utilisateur(
        id=uuid.uuid4(),
        identifiant="MED-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.MEDECIN,
    )

    class SessionFictive:
        supprime = None
        est_validee = False

        def get(self, modele, identifiant):
            assert modele is Utilisateur
            assert identifiant == compte_personnel.id
            return compte_personnel

        def delete(self, objet):
            self.supprime = objet

        def commit(self):
            self.est_validee = True

    session = SessionFictive()
    resultat = supprimer_compte_personnel(compte_personnel.id, superadmin, session)

    assert resultat is None
    assert session.supprime is compte_personnel
    assert session.est_validee


def test_superadmin_cannot_delete_own_account():
    superadmin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )

    class SessionFictive:
        def get(self, modele, identifiant):
            return superadmin

    with pytest.raises(HTTPException) as erreur:
        supprimer_compte_personnel(superadmin.id, superadmin, SessionFictive())

    assert erreur.value.status_code == 409


def test_superadmin_can_delete_another_superadmin_account():
    admin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )
    autre_admin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin-2",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )

    class SessionFictive:
        supprime = None
        est_validee = False

        def get(self, modele, identifiant):
            assert modele is Utilisateur
            assert identifiant == autre_admin.id
            return autre_admin

        def delete(self, objet):
            self.supprime = objet

        def commit(self):
            self.est_validee = True

    session = SessionFictive()
    resultat = supprimer_compte_personnel(autre_admin.id, admin, session)

    assert resultat is None
    assert session.supprime is autre_admin
    assert session.est_validee


def test_superadmin_can_delete_patient_account():
    admin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )
    patient = Utilisateur(
        id=uuid.uuid4(),
        identifiant="+261331234567",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
    )

    class SessionFictive:
        supprime = None
        est_validee = False

        def get(self, modele, identifiant):
            assert modele is Utilisateur
            assert identifiant == patient.id
            return patient

        def delete(self, objet):
            self.supprime = objet

        def commit(self):
            self.est_validee = True

    session = SessionFictive()
    resultat = supprimer_compte_personnel(patient.id, admin, session)

    assert resultat is None
    assert session.supprime is patient
    assert session.est_validee


def test_superadmin_cannot_disable_last_active_superadmin():
    autre_admin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
        est_actif=True,
    )
    utilisateur_courant = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin-2",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SUPERADMIN,
    )

    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def count(self):
            return 0

    class SessionFictive:
        def get(self, modele, identifiant):
            return autre_admin

        def query(self, modele):
            assert modele is Utilisateur
            return RequeteFictive()

    with pytest.raises(HTTPException) as erreur:
        modifier_statut_utilisateur(
            autre_admin.id,
            ModificationStatutUtilisateurSchema(est_actif=False),
            utilisateur_courant,
            SessionFictive(),
        )

    assert erreur.value.status_code == 409


def test_ambulance_linked_to_a_mission_cannot_be_deleted():
    ambulance = Ambulance(
        id=uuid.uuid4(),
        numero="AMB-01",
        est_principale=True,
    )

    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def first(self):
            return object()

    class SessionFictive:
        def get(self, modele, identifiant):
            assert modele is Ambulance
            return ambulance

        def query(self, modele):
            assert modele is MissionAmbulance
            return RequeteFictive()

    with pytest.raises(HTTPException) as erreur:
        supprimer_ambulance(ambulance.id, SessionFictive())

    assert erreur.value.status_code == 409


def test_ambulance_creation_rejects_blank_number():
    with pytest.raises(ValueError):
        CreationAmbulanceSchema(numero="   ")


@pytest.mark.parametrize(
    "role",
    [RoleUtilisateur.MEDECIN, RoleUtilisateur.SUPERADMIN, RoleUtilisateur.PATIENT],
)
def test_superadmin_can_reset_password_for_staff_superadmin_or_patient(monkeypatch, role):
    personnel = Utilisateur(
        id=uuid.uuid4(),
        identifiant="MED-01",
        mot_de_passe_hash="ancien-hash",
        role=role,
    )
    superadmin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin",
        mot_de_passe_hash="admin-hash",
        role=RoleUtilisateur.SUPERADMIN,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.utilisateurs.hasher_mot_de_passe",
        lambda mot_de_passe: f"hash:{mot_de_passe}",
    )

    class SessionFictive:
        est_validee = False

        def get(self, modele, identifiant):
            assert modele is Utilisateur
            assert identifiant == personnel.id
            return personnel

        def commit(self):
            self.est_validee = True

    session = SessionFictive()
    resultat = reinitialiser_mot_de_passe_personnel(
        personnel.id,
        ReinitialisationMotDePassePersonnelSchema(nouveau_mot_de_passe="Nouveau123"),
        superadmin,
        session,
    )

    assert resultat is None
    assert personnel.mot_de_passe_hash == "hash:Nouveau123"
    assert session.est_validee


def test_superadmin_cannot_reset_own_password_through_admin_flow():
    superadmin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="admin",
        mot_de_passe_hash="admin-hash",
        role=RoleUtilisateur.SUPERADMIN,
    )

    class SessionFictive:
        def get(self, modele, identifiant):
            return superadmin

    with pytest.raises(HTTPException) as erreur:
        reinitialiser_mot_de_passe_personnel(
            superadmin.id,
            ReinitialisationMotDePassePersonnelSchema(nouveau_mot_de_passe="Nouveau123"),
            superadmin,
            SessionFictive(),
        )

    assert erreur.value.status_code == 409


def test_staff_password_reset_rejects_weak_password():
    with pytest.raises(ValueError):
        ReinitialisationMotDePassePersonnelSchema(nouveau_mot_de_passe="sans-chiffre")
