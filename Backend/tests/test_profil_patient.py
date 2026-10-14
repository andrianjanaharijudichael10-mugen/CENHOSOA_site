import uuid

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.v1.endpoints.auth import modifier_profil_patient
from app.models.enums import RoleUtilisateur
from app.models.patient import Patient
from app.models.utilisateur import Utilisateur
from app.schemas.utilisateur import ModificationProfilPatientSchema


def test_patient_can_update_only_own_profile_fields():
    patient = Patient(
        id=uuid.uuid4(),
        utilisateur_id=uuid.uuid4(),
        nom="Rabe",
        prenoms="Miora",
        telephone="+261331234567",
    )
    utilisateur = Utilisateur(
        id=patient.utilisateur_id,
        identifiant=patient.telephone,
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
    )
    utilisateur.patient = patient

    class SessionFictive:
        commis = False

        def commit(self):
            self.commis = True

        def refresh(self, objet):
            pass

    donnees = ModificationProfilPatientSchema(
        nom=" Rakoto ",
        prenoms=" Tiana ",
        date_naissance="1990-03-12",
        lieu_naissance=" Antananarivo ",
        adresse=" Analamahitsy ",
    )
    session = SessionFictive()
    resultat = modifier_profil_patient(donnees, utilisateur, session)

    assert session.commis
    assert resultat.id == patient.id
    assert resultat.nom == "Rakoto"
    assert resultat.prenoms == "Tiana"
    assert resultat.date_naissance.isoformat() == "1990-03-12"
    assert resultat.lieu_naissance == "Antananarivo"
    assert resultat.adresse == "Analamahitsy"
    assert patient.telephone == "+261331234567"


def test_non_patient_cannot_update_patient_profile():
    utilisateur = Utilisateur(
        id=uuid.uuid4(),
        identifiant="MED-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.MEDECIN,
    )

    class SessionFictive:
        def commit(self):
            raise AssertionError("Aucun changement ne doit être enregistré.")

    with pytest.raises(HTTPException) as erreur:
        modifier_profil_patient(
            ModificationProfilPatientSchema(nom="Rabe", prenoms="Miora"),
            utilisateur,
            SessionFictive(),
        )

    assert erreur.value.status_code == 403


def test_patient_profile_rejects_blank_names():
    with pytest.raises(ValidationError):
        ModificationProfilPatientSchema(nom=" ", prenoms="Miora")
