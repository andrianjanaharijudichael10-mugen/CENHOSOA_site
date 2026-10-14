from io import BytesIO
from types import SimpleNamespace
import uuid

import pytest
from fastapi import HTTPException, UploadFile

from app.api.v1.endpoints import auth
from app.models.enums import RoleUtilisateur
from app.models.patient import Patient
from app.models.utilisateur import Utilisateur


def _patient():
    return Patient(
        id=uuid.uuid4(),
        utilisateur_id=uuid.uuid4(),
        nom="Rabe",
        prenoms="Miora",
        telephone="+261331234567",
    )


class SessionFictive:
    def __init__(self, patient, rendez_vous=True):
        self.patient = patient
        self.rendez_vous = rendez_vous
        self.commis = False

    def get(self, modele, identifiant):
        assert modele is Patient
        return self.patient if identifiant == self.patient.id else None

    def query(self, modele):
        session = self

        class RequeteFictive:
            def filter(self, *conditions):
                return self

            def first(self):
                return object() if session.rendez_vous else None

        return RequeteFictive()

    def commit(self):
        self.commis = True

    def rollback(self):
        pass


def test_patient_photo_is_saved_privately_on_upload(tmp_path, monkeypatch):
    monkeypatch.setattr(auth, "DOSSIER_PHOTOS_PATIENTS", tmp_path)
    patient = _patient()
    utilisateur = Utilisateur(
        id=patient.utilisateur_id,
        identifiant=patient.telephone,
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
    )
    utilisateur.patient = patient
    contenu_png = b"\x89PNG\r\n\x1a\n" + b"contenu-image"
    session = SessionFictive(patient)

    auth.enregistrer_photo_profil_patient(
        UploadFile(filename="photo.png", file=BytesIO(contenu_png)),
        utilisateur,
        session,
    )

    assert session.commis
    assert patient.photo_profil.endswith(".png")
    assert (tmp_path / patient.photo_profil).read_bytes() == contenu_png


def test_invalid_patient_photo_is_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(auth, "DOSSIER_PHOTOS_PATIENTS", tmp_path)
    patient = _patient()
    utilisateur = Utilisateur(
        id=patient.utilisateur_id,
        identifiant=patient.telephone,
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
    )
    utilisateur.patient = patient

    with pytest.raises(HTTPException) as erreur:
        auth.enregistrer_photo_profil_patient(
            UploadFile(filename="photo.png", file=BytesIO(b"not an image")),
            utilisateur,
            SessionFictive(patient),
        )

    assert erreur.value.status_code == 415
    assert list(tmp_path.iterdir()) == []


def test_doctor_can_read_photo_only_for_a_patient_in_their_service(tmp_path, monkeypatch):
    monkeypatch.setattr(auth, "DOSSIER_PHOTOS_PATIENTS", tmp_path)
    patient = _patient()
    patient.photo_profil = "patient.png"
    (tmp_path / patient.photo_profil).write_bytes(b"image")
    medecin = SimpleNamespace(
        role=RoleUtilisateur.MEDECIN,
        personnel=SimpleNamespace(service="Neurologie"),
    )

    resultat = auth.obtenir_photo_profil_patient(
        patient.id,
        medecin,
        SessionFictive(patient, rendez_vous=True),
    )

    assert resultat.path == tmp_path / patient.photo_profil
    assert resultat.headers["cache-control"] == "private, no-store"

    with pytest.raises(HTTPException) as erreur:
        auth.obtenir_photo_profil_patient(
            patient.id,
            medecin,
            SessionFictive(patient, rendez_vous=False),
        )

    assert erreur.value.status_code == 404


def test_secretary_cannot_read_patient_photo(tmp_path, monkeypatch):
    monkeypatch.setattr(auth, "DOSSIER_PHOTOS_PATIENTS", tmp_path)
    patient = _patient()
    secretaire = Utilisateur(
        id=uuid.uuid4(),
        identifiant="SEC-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SECRETAIRE,
    )

    with pytest.raises(HTTPException) as erreur:
        auth.obtenir_photo_profil_patient(patient.id, secretaire, SessionFictive(patient))

    assert erreur.value.status_code == 404
