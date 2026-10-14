from datetime import datetime, timedelta, timezone
import uuid

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.v1.endpoints.dossiers_medicaux import (
    creer_consultation,
    obtenir_dossier_complet_patient,
    obtenir_dossier_patient,
)
from app.models.consultation import Consultation
from app.models.enums import RoleUtilisateur
from app.models.patient import Patient
from app.models.personnel import Personnel
from app.models.rendez_vous import RendezVous
from app.models.utilisateur import Utilisateur
from app.schemas.consultation import CreationConsultationSchema


def _donnees_consultation(**modifications):
    valeurs = {
        "remarques": "  Suivi clinique  ",
        "ordonnance": "  Traitement selon prescription  ",
        "medicaments": "  Paracétamol  ",
        "quantite_matin": "  1 comprimé  ",
        "quantite_midi": "  1 comprimé  ",
        "quantite_soir": "  1 comprimé  ",
        "medicaments_prescrits": [
            {
                "nom": "Paracétamol",
                "forme": "comprime",
                "matin": 1,
                "soir": 1,
                "posologie": "À prendre au cours du repas",
                "duree_jours": 30,
            },
            {"nom": "Vitamine D", "forme": "gelule", "matin": 1, "duree_jours": 90},
        ],
        "controle_supplementaire": "IRM dans 3 mois",
        "prochain_rendez_vous": datetime.now(timezone.utc) + timedelta(days=14),
    }
    valeurs.update(modifications)
    return CreationConsultationSchema(**valeurs)


def test_consultation_schema_requires_notes_and_aware_future_follow_up():
    with pytest.raises(ValidationError):
        CreationConsultationSchema(remarques="   ")

    with pytest.raises(ValidationError):
        CreationConsultationSchema(
            remarques="Consultation",
            prochain_rendez_vous=datetime.now() + timedelta(days=1),
        )

    donnees = _donnees_consultation()
    assert donnees.medicaments == "Paracétamol"
    assert donnees.quantite_matin == "1 comprimé"
    assert donnees.quantite_midi == "1 comprimé"
    assert donnees.quantite_soir == "1 comprimé"
    assert CreationConsultationSchema(remarques="Consultation", medicaments="  ").medicaments is None


def test_consultation_schema_accepts_multiple_medicaments_with_separate_doses():
    donnees = CreationConsultationSchema(
        remarques="Consultation",
        controle_supplementaire="  IRM cérébrale dans 3 mois  ",
        medicaments_prescrits=[
            {
                "nom": " Paracétamol ",
                "indication": "Traitement de la crise migraineuse",
                "forme": "comprime",
                "matin": 1,
                "midi": "",
                "soir": 1,
                "posologie": "  À prendre au cours du repas  ",
                "duree_jours": 30,
            },
            {"nom": "Vitamine D", "forme": "gelule", "matin": 1, "duree_jours": 90},
        ],
    )

    assert donnees.controle_supplementaire == "IRM cérébrale dans 3 mois"
    assert [medicament.model_dump() for medicament in donnees.medicaments_prescrits] == [
        {
            "nom": "Paracétamol",
            "indication": "Traitement de la crise migraineuse",
            "forme": "comprime",
            "matin": 1,
            "midi": None,
            "soir": 1,
            "posologie": "À prendre au cours du repas",
            "duree_jours": 30,
        },
        {
            "nom": "Vitamine D",
            "indication": None,
            "forme": "gelule",
            "matin": 1,
            "midi": None,
            "soir": None,
            "posologie": None,
            "duree_jours": 90,
        },
    ]


def test_medicaments_and_controle_are_optional():
    donnees = CreationConsultationSchema(
        remarques="Consultation sans prescription ni examen complémentaire",
    )

    assert donnees.medicaments_prescrits == []
    assert donnees.controle_supplementaire is None


def test_medicament_duration_must_be_positive_and_form_is_supported():
    with pytest.raises(ValidationError):
        CreationConsultationSchema(
            remarques="Consultation",
            medicaments_prescrits=[{"nom": "Paracétamol", "duree_jours": 0}],
        )

    with pytest.raises(ValidationError):
        CreationConsultationSchema(
            remarques="Consultation",
            medicaments_prescrits=[{"nom": "Paracétamol", "forme": "sirop"}],
        )


def test_prescription_doses_use_whole_units_or_liquid_decimals():
    donnees = CreationConsultationSchema(
        remarques="Consultation",
        medicaments_prescrits=[
            {"nom": "Comprimé", "forme": "comprime", "matin": 2},
            {"nom": "Gélule", "forme": "gelule", "soir": 1},
            {"nom": "Sirop", "forme": "solution_buvable", "matin": 2.5},
        ],
    )

    assert donnees.medicaments_prescrits[0].matin == 2
    assert donnees.medicaments_prescrits[1].soir == 1
    assert donnees.medicaments_prescrits[2].matin == 2.5
    assert isinstance(donnees.medicaments_prescrits[2].matin, float)

    with pytest.raises(ValidationError, match="unités entières"):
        CreationConsultationSchema(
            remarques="Consultation",
            medicaments_prescrits=[
                {"nom": "Comprimé", "forme": "comprime", "matin": 0.5},
            ],
        )


def test_patient_can_read_own_medical_record():
    patient = Patient(
        id=uuid.uuid4(),
        utilisateur_id=uuid.uuid4(),
        nom="Rabe",
        prenoms="Miora",
        lieu_naissance="Antananarivo",
        adresse="Analamahitsy",
        photo_profil="photo.jpg",
    )
    utilisateur = Utilisateur(
        id=patient.utilisateur_id,
        identifiant="PAT-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
    )
    utilisateur.patient = patient

    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def order_by(self, *conditions):
            return self

        def all(self):
            return []

    class SessionFictive:
        def get(self, modele, identifiant):
            assert modele is Patient
            assert identifiant == patient.id
            return patient

        def query(self, modele):
            assert modele is Consultation
            return RequeteFictive()

    dossier = obtenir_dossier_patient(patient.id, utilisateur, SessionFictive())

    assert dossier.patient_id == patient.id
    assert dossier.patient_nom == patient.nom
    assert dossier.patient_lieu_naissance == "Antananarivo"
    assert dossier.patient_adresse == "Analamahitsy"
    assert dossier.patient_a_photo is True
    assert dossier.consultations == []


def test_patient_cannot_read_another_patients_medical_record():
    patient = Patient(
        id=uuid.uuid4(),
        utilisateur_id=uuid.uuid4(),
        nom="Rabe",
        prenoms="Miora",
    )
    utilisateur = Utilisateur(
        id=patient.utilisateur_id,
        identifiant="PAT-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
    )
    utilisateur.patient = patient
    autre_patient_id = uuid.uuid4()

    class SessionFictive:
        def get(self, modele, identifiant):
            assert modele is Patient
            return Patient(
                id=autre_patient_id,
                utilisateur_id=uuid.uuid4(),
                nom="Rakoto",
                prenoms="Tiana",
            )

    with pytest.raises(HTTPException) as erreur:
        obtenir_dossier_patient(autre_patient_id, utilisateur, SessionFictive())

    assert erreur.value.status_code == 404


def test_doctor_can_consult_complete_patient_record_and_all_service_reports():
    patient = Patient(
        id=uuid.uuid4(),
        utilisateur_id=uuid.uuid4(),
        nom="Rabe",
        prenoms="Miora",
        telephone="+261331234567",
        date_naissance=datetime(1990, 3, 12).date(),
        lieu_naissance="Antananarivo",
        adresse="Analamahitsy",
        photo_profil="photo.jpg",
    )
    rendez_vous = RendezVous(
        id=uuid.uuid4(),
        patient_id=patient.id,
        service_id=uuid.uuid4(),
        service_nom="Neurologie",
        date_souhaitee=datetime.now(timezone.utc),
        motif="Consultation de suivi",
        statut="termine",
    )
    consultation = Consultation(
        id=uuid.uuid4(),
        patient_id=patient.id,
        rendez_vous_id=rendez_vous.id,
        medecin_id=uuid.uuid4(),
        remarques="Suivi clinique",
        medicaments_prescrits=[{"nom": "Paracétamol", "forme": "comprime", "matin": 1}],
        date_creation=datetime.now(timezone.utc),
    )
    medecin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="MED-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.MEDECIN,
    )
    medecin.personnel = Personnel(
        id=uuid.uuid4(),
        utilisateur_id=medecin.id,
        nom="Ranaivo",
        prenoms="Tiana",
        matricule="MED-01",
        service="Neurologie",
    )

    class RequeteFictive:
        def __init__(self, resultats):
            self.resultats = resultats

        def filter(self, *conditions):
            return self

        def order_by(self, *conditions):
            return self

        def all(self):
            return self.resultats

    class SessionFictive:
        def get(self, modele, identifiant):
            assert modele is Patient
            return patient if identifiant == patient.id else None

        def query(self, modele):
            if modele is RendezVous:
                return RequeteFictive([rendez_vous])
            assert modele is Consultation
            return RequeteFictive([consultation])

    dossier = obtenir_dossier_complet_patient(patient.id, medecin, SessionFictive())

    assert dossier.patient_telephone == patient.telephone
    assert dossier.patient_lieu_naissance == patient.lieu_naissance
    assert dossier.patient_adresse == patient.adresse
    assert dossier.patient_a_photo is True
    assert len(dossier.rendez_vous) == 1
    assert dossier.rendez_vous[0].statut == "termine"
    assert dossier.rendez_vous[0].consultation.remarques == "Suivi clinique"
    assert dossier.rendez_vous[0].consultation.medicaments_prescrits[0].matin == 1


def test_patient_can_consult_only_own_complete_record():
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

    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def order_by(self, *conditions):
            return self

        def all(self):
            return []

    class SessionFictive:
        def get(self, modele, identifiant):
            assert modele is Patient
            return patient if identifiant == patient.id else None

        def query(self, modele):
            assert modele in {RendezVous, Consultation}
            return RequeteFictive()

    dossier = obtenir_dossier_complet_patient(patient.id, utilisateur, SessionFictive())
    assert dossier.patient_id == patient.id
    assert dossier.rendez_vous == []

    with pytest.raises(HTTPException) as erreur:
        obtenir_dossier_complet_patient(uuid.uuid4(), utilisateur, SessionFictive())

    assert erreur.value.status_code == 404


def test_doctor_saves_consultation_and_schedules_follow_up():
    rendez_vous = RendezVous(
        id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        service_id=uuid.uuid4(),
        service_nom="Neurologie",
        date_souhaitee=datetime.now(timezone.utc) + timedelta(days=1),
        motif="Consultation",
        statut="arrive",
    )
    medecin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="MED-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.MEDECIN,
    )
    medecin.personnel = Personnel(
        id=uuid.uuid4(),
        utilisateur_id=medecin.id,
        nom="Rabe",
        prenoms="Miora",
        matricule="MED-01",
        service="Neurologie",
    )

    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def first(self):
            return None

    class SessionFictive:
        def __init__(self):
            self.ajouts = []
            self.commis = False

        def get(self, modele, identifiant):
            assert modele is RendezVous
            assert identifiant == rendez_vous.id
            return rendez_vous

        def query(self, modele):
            assert modele in {Consultation.id, RendezVous.id}
            return RequeteFictive()

        def add(self, objet):
            self.ajouts.append(objet)

        def flush(self):
            pass

        def commit(self):
            self.commis = True

        def refresh(self, objet):
            objet.date_creation = datetime.now(timezone.utc)

    db = SessionFictive()
    resultat = creer_consultation(
        rendez_vous.id,
        _donnees_consultation(),
        medecin,
        db,
    )

    consultation = next(objet for objet in db.ajouts if isinstance(objet, Consultation))
    suivi = next(objet for objet in db.ajouts if isinstance(objet, RendezVous))
    assert db.commis
    assert consultation.remarques == "Suivi clinique"
    assert consultation.ordonnance == "Traitement selon prescription"
    assert consultation.medicaments == "Paracétamol"
    assert consultation.quantite_matin == "1 comprimé"
    assert consultation.quantite_midi == "1 comprimé"
    assert consultation.quantite_soir == "1 comprimé"
    assert consultation.medicaments_prescrits == [
        {
            "nom": "Paracétamol",
            "indication": None,
            "forme": "comprime",
            "matin": 1,
            "midi": None,
            "soir": 1,
            "posologie": "À prendre au cours du repas",
            "duree_jours": 30,
        },
        {
            "nom": "Vitamine D",
            "indication": None,
            "forme": "gelule",
            "matin": 1,
            "midi": None,
            "soir": None,
            "posologie": None,
            "duree_jours": 90,
        },
    ]
    assert consultation.controle_supplementaire == "IRM dans 3 mois"
    assert consultation.medecin_id == medecin.personnel.id
    assert resultat is consultation
    assert rendez_vous.statut == "termine"
    assert suivi.patient_id == rendez_vous.patient_id
    assert suivi.service_id == rendez_vous.service_id
    assert suivi.statut == "confirme"
    assert suivi.date_confirmee == suivi.date_souhaitee


def test_doctor_cannot_create_consultation_for_another_service():
    rendez_vous = RendezVous(
        id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        service_nom="Cardiologie",
        date_souhaitee=datetime.now(timezone.utc) + timedelta(days=1),
        motif="Consultation",
        statut="confirme",
    )
    medecin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="MED-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.MEDECIN,
    )
    medecin.personnel = Personnel(
        id=uuid.uuid4(),
        utilisateur_id=medecin.id,
        nom="Rabe",
        prenoms="Miora",
        matricule="MED-02",
        service="Neurologie",
    )

    class SessionFictive:
        def get(self, modele, identifiant):
            return rendez_vous

    with pytest.raises(HTTPException) as erreur:
        creer_consultation(rendez_vous.id, _donnees_consultation(), medecin, SessionFictive())

    assert erreur.value.status_code == 404

    rendez_vous.service_nom = "Neurologie"
    with pytest.raises(HTTPException) as erreur_avant_arrivee:
        creer_consultation(rendez_vous.id, _donnees_consultation(), medecin, SessionFictive())

    assert erreur_avant_arrivee.value.status_code == 409
