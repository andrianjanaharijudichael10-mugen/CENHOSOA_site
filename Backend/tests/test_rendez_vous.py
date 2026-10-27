from datetime import datetime, timedelta, timezone
import uuid

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.api.v1.endpoints.rendez_vous import (
    _ajouter_patient_au_creneau,
    _fermer_creneaux_quota_atteint,
    _fermer_creneaux_expires,
    _verifier_creneau_reservable,
    creer_rendez_vous,
    marquer_notification_rendez_vous_lue,
    modifier_creneau,
    modifier_rendez_vous,
    obtenir_statistiques_rendez_vous,
)
from app.models.enums import RoleUtilisateur
from app.models.patient import Patient
from app.models.personnel import Personnel
from app.models.rendez_vous import CreneauMedecin, QuotaRendezVousJournalier, RendezVous
from app.models.service import Service
from app.models.utilisateur import Utilisateur
from app.schemas.rendez_vous import (
    CreationCreneauSchema,
    CreationRendezVousSchema,
    AffectationPatientCreneauSchema,
    ModificationCreneauSchema,
    ModificationRendezVousSchema,
    PatientSansCompteSchema,
)


def test_superadmin_rendez_vous_statistics_are_aggregated_and_cover_six_months():
    maintenant = datetime.now(timezone.utc)

    class RequeteFictive:
        def __init__(self, resultat):
            self.resultat = resultat

        def group_by(self, *colonnes):
            return self

        def filter(self, *conditions):
            return self

        def all(self):
            return self.resultat

    class SessionFictive:
        appels = 0

        def query(self, *colonnes):
            self.appels += 1
            if self.appels == 1:
                return RequeteFictive([("confirme", 2), ("termine", 3)])
            return RequeteFictive([(maintenant.year, maintenant.month, 2)])

    resultat = obtenir_statistiques_rendez_vous(SessionFictive())

    assert resultat["total"] == 5
    assert resultat["statuts"] == {"confirme": 2, "termine": 3}
    assert len(resultat["mensuel"]) == 6
    assert resultat["mensuel"][-1] == {
        "annee": maintenant.year,
        "mois": maintenant.month,
        "total": 2,
    }


def test_slot_allows_past_start_times_but_requires_timezone_aware_datetimes():
    date_debut = datetime.now(timezone.utc) + timedelta(days=1)
    with pytest.raises(ValidationError):
        CreationCreneauSchema(
            service_id=uuid.uuid4(),
            date_heure=date_debut.replace(tzinfo=None),
            date_fin=date_debut + timedelta(hours=1),
            quota_journalier=10,
        )

    with pytest.raises(ValidationError):
        CreationCreneauSchema(
            service_id=uuid.uuid4(),
            date_heure=date_debut,
            date_fin=date_debut.replace(tzinfo=None) + timedelta(hours=1),
            quota_journalier=10,
        )

    with pytest.raises(ValidationError):
        CreationCreneauSchema(
            service_id=uuid.uuid4(),
            date_heure=date_debut,
            date_fin=date_debut,
            quota_journalier=10,
        )

    date_passee = datetime.now(timezone.utc) - timedelta(hours=3)
    donnees = CreationCreneauSchema(
        service_id=uuid.uuid4(),
        date_heure=date_passee,
        date_fin=date_passee + timedelta(hours=2),
        quota_journalier=10,
    )
    assert donnees.date_heure == date_passee


def test_started_slot_remains_reservable_until_the_end_of_its_period():
    creneau = CreneauMedecin(
        date_heure=datetime.now(timezone.utc) - timedelta(hours=1),
        date_fin=datetime.now(timezone.utc) + timedelta(minutes=30),
        est_ouvert=True,
    )

    _verifier_creneau_reservable(creneau)


def test_ended_slot_cannot_be_reserved_after_the_grace_minute():
    creneau = CreneauMedecin(
        date_heure=datetime.now(timezone.utc) - timedelta(hours=3),
        date_fin=datetime.now(timezone.utc) - timedelta(minutes=2),
        est_ouvert=True,
    )

    with pytest.raises(HTTPException) as erreur:
        _verifier_creneau_reservable(creneau)
    assert erreur.value.status_code == 409


def test_slot_schedule_modification_requires_valid_future_interval():
    debut = datetime.now(timezone.utc) + timedelta(days=1)
    modification = ModificationCreneauSchema(
        date_heure=debut,
        date_fin=debut + timedelta(hours=1),
    )
    assert modification.date_heure == debut

    with pytest.raises(ValidationError):
        ModificationCreneauSchema(date_heure=debut)

    with pytest.raises(ValidationError):
        ModificationCreneauSchema(
            date_heure=debut,
            date_fin=debut,
        )


def test_daily_quota_and_patient_without_account_are_validated():
    debut = datetime.now(timezone.utc) + timedelta(days=1)
    donnees = CreationCreneauSchema(
        service_id=uuid.uuid4(),
        date_heure=debut,
        date_fin=debut + timedelta(hours=1),
        date_jour=debut.date(),
        quota_journalier=8,
        nouveau_patient=PatientSansCompteSchema(
            nom="Rabe",
            prenoms="Miora",
            telephone="+261331234567",
        ),
        motif="Consultation",
    )
    assert donnees.quota_journalier == 8
    assert donnees.nouveau_patient is not None
    assert donnees.nouveau_patient.telephone == "+261331234567"

    with pytest.raises(ValidationError):
        CreationCreneauSchema(
            service_id=uuid.uuid4(),
            date_heure=debut,
            date_fin=debut + timedelta(hours=1),
            quota_journalier=0,
        )

    with pytest.raises(ValidationError):
        AffectationPatientCreneauSchema(motif="Consultation")


def test_daily_quota_closes_all_service_slots_when_reached():
    service_id = uuid.uuid4()
    date_jour = datetime.now(timezone.utc).date()
    quota = QuotaRendezVousJournalier(
        service_id=service_id,
        date_jour=date_jour,
        limite=2,
    )

    class RequeteFictive:
        def __init__(self, modele):
            self.modele = modele
            self.mise_a_jour = None

        def filter(self, *conditions):
            return self

        def join(self, *conditions):
            return self

        def first(self):
            return quota if self.modele is QuotaRendezVousJournalier else None

        def count(self):
            return 2

        def update(self, valeurs, **options):
            self.mise_a_jour = valeurs
            return 1

    class SessionFictive:
        requete_creneau = None

        def query(self, modele):
            requete = RequeteFictive(modele)
            if modele is CreneauMedecin:
                self.requete_creneau = requete
            return requete

    session = SessionFictive()
    _fermer_creneaux_quota_atteint(session, service_id, date_jour)

    assert session.requete_creneau.mise_a_jour == {CreneauMedecin.est_ouvert: False}


def test_expired_slots_are_closed_after_the_grace_minute():
    class RequeteFictive:
        def __init__(self):
            self.mise_a_jour = None

        def filter(self, *conditions):
            self.conditions = conditions
            return self

        def update(self, valeurs, **options):
            self.mise_a_jour = valeurs
            return 1

    class SessionFictive:
        def __init__(self):
            self.requete = RequeteFictive()
            self.commit_effectue = False

        def query(self, modele):
            assert modele is CreneauMedecin
            return self.requete

        def commit(self):
            self.commit_effectue = True

    session = SessionFictive()
    _fermer_creneaux_expires(session)

    assert session.requete.mise_a_jour == {CreneauMedecin.est_ouvert: False}
    assert len(session.requete.conditions) == 2
    assert session.commit_effectue


def test_doctor_can_move_slot_and_its_active_appointments(monkeypatch):
    date_debut = datetime.now(timezone.utc) + timedelta(days=2)
    creneau = CreneauMedecin(
        id=uuid.uuid4(),
        service_id=uuid.uuid4(),
        date_heure=date_debut,
        date_fin=date_debut + timedelta(hours=1),
        date_jour=date_debut.date(),
        est_ouvert=True,
    )
    service = Service(id=creneau.service_id, nom="Neurologie", est_actif=True)
    rendez_vous = RendezVous(
        id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        service_id=service.id,
        creneau_id=creneau.id,
        service_nom=service.nom,
        date_souhaitee=date_debut,
        date_confirmee=date_debut + timedelta(minutes=30),
        date_confirmee_vue=date_debut + timedelta(minutes=30),
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
        utilisateur_id=medecin.id,
        nom="Rabe",
        prenoms="Miora",
        matricule="MED-01",
        service=service.nom,
    )

    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def with_for_update(self):
            return self

        def first(self):
            return None

        def count(self):
            return 0

        def all(self):
            return [rendez_vous]

    class SessionFictive:
        def get(self, modele, identifiant):
            return creneau if modele is CreneauMedecin else service

        def query(self, modele):
            return RequeteFictive()

        def commit(self):
            pass

        def refresh(self, objet):
            pass

        def flush(self):
            pass

    monkeypatch.setattr(
        "app.api.v1.endpoints.rendez_vous._sortie_creneau",
        lambda db, slot, service_obj: slot,
    )
    nouveau_debut = date_debut + timedelta(days=1)
    resultat = modifier_creneau(
        creneau.id,
        ModificationCreneauSchema(
            date_heure=nouveau_debut,
            date_fin=nouveau_debut + timedelta(hours=2),
        ),
        medecin,
        SessionFictive(),
    )

    assert resultat.date_heure == nouveau_debut
    assert resultat.date_fin == nouveau_debut + timedelta(hours=2)
    assert rendez_vous.date_souhaitee == nouveau_debut
    assert rendez_vous.date_confirmee == nouveau_debut + timedelta(minutes=30)
    assert rendez_vous.date_confirmee_vue is None


def test_adding_patient_to_slot_assigns_next_queue_number():
    patient = Patient(id=uuid.uuid4(), utilisateur_id=uuid.uuid4(), nom="Rabe", prenoms="Miora", telephone="+261331234567")
    service = Service(id=uuid.uuid4(), nom="Neurologie", est_actif=True)
    creneau = CreneauMedecin(
        id=uuid.uuid4(),
        service_id=service.id,
        date_heure=datetime.now(timezone.utc) + timedelta(days=2),
        date_fin=datetime.now(timezone.utc) + timedelta(days=2, hours=1),
        date_jour=(datetime.now(timezone.utc) + timedelta(days=2)).date(),
        est_ouvert=True,
    )

    class RequeteFictive:
        def __init__(self, modele):
            self.modele = modele

        def filter(self, *conditions):
            return self

        def join(self, *conditions):
            return self

        def order_by(self, *conditions):
            return self

        def with_for_update(self):
            return self

        def first(self):
            return None

        def count(self):
            return 0

        def update(self, *args, **kwargs):
            return 0

    class SessionFictive:
        def __init__(self):
            self.ajoute = None

        def query(self, modele):
            return RequeteFictive(modele)

        def execute(self, requete):
            return ResultatFictif(7)

        def add(self, objet):
            self.ajoute = objet

        def flush(self):
            pass

    class ResultatFictif:
        def __init__(self, numero_file):
            self.numero_file = numero_file

        def scalar_one(self):
            return self.numero_file

    session = SessionFictive()
    rendez_vous = _ajouter_patient_au_creneau(
        session,
        creneau,
        service,
        patient,
        "Consultation",
    )

    assert session.ajoute is rendez_vous
    assert rendez_vous.creneau_id == creneau.id
    assert rendez_vous.numero_file == 7
    assert rendez_vous.date_souhaitee == creneau.date_heure


def test_two_patients_get_distinct_queue_numbers_for_the_same_slot():
    service = Service(id=uuid.uuid4(), nom="Neurologie", est_actif=True)
    creneau = CreneauMedecin(
        id=uuid.uuid4(),
        service_id=service.id,
        date_heure=datetime.now(timezone.utc) + timedelta(days=2),
        date_fin=datetime.now(timezone.utc) + timedelta(days=2, hours=1),
        date_jour=(datetime.now(timezone.utc) + timedelta(days=2)).date(),
        est_ouvert=True,
    )

    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def join(self, *conditions):
            return self

        def with_for_update(self):
            return self

        def first(self):
            return None

        def count(self):
            return 0

        def update(self, *args, **kwargs):
            return 0

    class ResultatFictif:
        def __init__(self, numero_file):
            self.numero_file = numero_file

        def scalar_one(self):
            return self.numero_file

    class SessionFictive:
        def __init__(self):
            self.numero_file = 0

        def query(self, modele):
            return RequeteFictive()

        def execute(self, requete):
            self.numero_file += 1
            return ResultatFictif(self.numero_file)

        def add(self, rendez_vous):
            pass

        def flush(self):
            pass

    session = SessionFictive()
    rendez_vous_1 = _ajouter_patient_au_creneau(
        session,
        creneau,
        service,
        Patient(id=uuid.uuid4(), utilisateur_id=uuid.uuid4(), nom="Rabe", prenoms="Miora"),
        "Consultation",
    )
    rendez_vous_2 = _ajouter_patient_au_creneau(
        session,
        creneau,
        service,
        Patient(id=uuid.uuid4(), utilisateur_id=uuid.uuid4(), nom="Rakoto", prenoms="Tiana"),
        "Consultation",
    )

    assert [rendez_vous_1.numero_file, rendez_vous_2.numero_file] == [1, 2]


def test_rendez_vous_requires_a_future_timezone_aware_datetime():
    with pytest.raises(ValidationError):
        CreationRendezVousSchema(
            service_id=uuid.uuid4(),
            date_souhaitee=(datetime.now(timezone.utc) + timedelta(days=1)).replace(tzinfo=None),
            motif="Consultation",
        )

    with pytest.raises(ValidationError):
        CreationRendezVousSchema(
            service_id=uuid.uuid4(),
            date_souhaitee=datetime.now(timezone.utc) - timedelta(days=1),
            motif="Consultation",
        )


def test_confirmed_appointment_requires_a_confirmed_date():
    with pytest.raises(ValidationError):
        ModificationRendezVousSchema(statut="confirme")


def test_patient_cannot_book_twice_in_same_service():
    patient = Patient(id=uuid.uuid4(), utilisateur_id=uuid.uuid4(), nom="Rabe", prenoms="Miora", telephone="+261331234567")
    utilisateur = Utilisateur(
        id=patient.utilisateur_id,
        identifiant="+261331234567",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
    )
    utilisateur.patient = patient
    service = Service(id=uuid.uuid4(), nom="Neurologie", est_actif=True)

    class RequeteFictive:
        def __init__(self, modele):
            self.modele = modele

        def filter(self, *conditions):
            return self

        def with_for_update(self):
            return self

        def first(self):
            return None if self.modele is QuotaRendezVousJournalier else object()

    class SessionFictive:
        def get(self, modele, identifiant):
            assert modele is Service
            return service

        def query(self, modele):
            return RequeteFictive(modele)

    with pytest.raises(HTTPException) as erreur:
        creer_rendez_vous(
            CreationRendezVousSchema(
                service_id=service.id,
                date_souhaitee=datetime.now(timezone.utc) + timedelta(days=3),
                motif="Consultation",
            ),
            utilisateur,
            SessionFictive(),
        )

    assert erreur.value.status_code == 409


def test_patient_can_cancel_own_pending_appointment():
    patient = Patient(id=uuid.uuid4(), utilisateur_id=uuid.uuid4(), nom="Rabe", prenoms="Miora", telephone="+261331234567")
    utilisateur = Utilisateur(
        id=patient.utilisateur_id,
        identifiant="+261331234567",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
    )
    utilisateur.patient = patient
    rendez_vous = RendezVous(
        id=uuid.uuid4(),
        patient_id=patient.id,
        service_nom="Neurologie",
        date_souhaitee=datetime.now(timezone.utc) + timedelta(days=2),
        motif="Consultation de suivi",
        statut="en_attente",
        date_creation=datetime.now(timezone.utc),
        date_modification=datetime.now(timezone.utc),
    )

    class SessionFictive:
        def get(self, modele, identifiant):
            if modele is RendezVous:
                return rendez_vous
            if modele is Patient:
                return patient
            if modele is Utilisateur:
                return utilisateur
            raise AssertionError(f"Modèle inattendu : {modele}")

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    resultat = modifier_rendez_vous(
        rendez_vous.id,
        ModificationRendezVousSchema(statut="annule"),
        utilisateur,
        SessionFictive(),
    )

    assert rendez_vous.statut == "annule"
    assert resultat.statut == "annule"


def test_patient_cannot_cancel_another_patients_appointment():
    patient = Patient(id=uuid.uuid4(), utilisateur_id=uuid.uuid4(), nom="Rabe", prenoms="Miora", telephone="+261331234567")
    utilisateur = Utilisateur(
        id=patient.utilisateur_id,
        identifiant="+261331234567",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
    )
    utilisateur.patient = patient
    rendez_vous = RendezVous(
        id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        service_nom="Neurologie",
        date_souhaitee=datetime.now(timezone.utc) + timedelta(days=2),
        motif="Consultation",
        statut="en_attente",
    )

    class SessionFictive:
        def get(self, modele, identifiant):
            assert modele is RendezVous
            return rendez_vous

    with pytest.raises(HTTPException) as erreur:
        modifier_rendez_vous(
            rendez_vous.id,
            ModificationRendezVousSchema(statut="annule"),
            utilisateur,
            SessionFictive(),
        )

    assert erreur.value.status_code == 404


def test_secretary_cannot_update_another_service_appointment():
    secretaire = Utilisateur(
        id=uuid.uuid4(),
        identifiant="SEC-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SECRETAIRE,
    )
    secretaire.personnel = Personnel(
        utilisateur_id=secretaire.id,
        nom="Rabe",
        prenoms="Miora",
        matricule="SEC-01",
        service="Cardiologie",
    )
    rendez_vous = RendezVous(
        id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        service_nom="Neurologie",
        date_souhaitee=datetime.now(timezone.utc) + timedelta(days=2),
        motif="Consultation",
        statut="en_attente",
    )

    class SessionFictive:
        def get(self, modele, identifiant):
            assert modele is RendezVous
            return rendez_vous

    with pytest.raises(HTTPException) as erreur:
        modifier_rendez_vous(
            rendez_vous.id,
            ModificationRendezVousSchema(
                statut="confirme",
                date_confirmee=datetime.now(timezone.utc) + timedelta(days=3),
            ),
            secretaire,
            SessionFictive(),
        )

    assert erreur.value.status_code == 404


def test_secretary_cannot_confirm_or_change_appointment_slot():
    patient = Patient(id=uuid.uuid4(), utilisateur_id=uuid.uuid4(), nom="Rabe", prenoms="Miora", telephone="+261331234567")
    utilisateur_patient = Utilisateur(
        id=patient.utilisateur_id,
        identifiant="+261331234567",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
    )
    secretaire = Utilisateur(
        id=uuid.uuid4(),
        identifiant="SEC-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.SECRETAIRE,
    )
    secretaire.personnel = Personnel(
        utilisateur_id=secretaire.id,
        nom="Rabe",
        prenoms="Miora",
        matricule="SEC-01",
        service="Neurologie",
    )
    rendez_vous = RendezVous(
        id=uuid.uuid4(),
        patient_id=patient.id,
        service_nom="Neurologie",
        date_souhaitee=datetime.now(timezone.utc) + timedelta(days=2),
        motif="Consultation",
        statut="en_attente",
        date_creation=datetime.now(timezone.utc),
        date_modification=datetime.now(timezone.utc),
    )

    class SessionFictive:
        def get(self, modele, identifiant):
            assert modele is RendezVous
            return rendez_vous

    date_confirmee = datetime.now(timezone.utc) + timedelta(days=3)
    with pytest.raises(HTTPException) as erreur:
        modifier_rendez_vous(
            rendez_vous.id,
            ModificationRendezVousSchema(statut="confirme", date_confirmee=date_confirmee),
            secretaire,
            SessionFictive(),
        )

    assert erreur.value.status_code == 403
    assert rendez_vous.statut == "en_attente"


def test_doctor_can_move_queued_appointment_before_confirmation():
    medecin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="MED-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.MEDECIN,
    )
    medecin.personnel = Personnel(
        utilisateur_id=medecin.id,
        nom="Rabe",
        prenoms="Miora",
        matricule="MED-01",
        service="Neurologie",
    )
    date_creneau = datetime.now(timezone.utc) + timedelta(days=2)
    rendez_vous = RendezVous(
        id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        service_nom="Neurologie",
        creneau_id=uuid.uuid4(),
        numero_file=4,
        date_souhaitee=date_creneau,
        motif="Consultation",
        statut="en_attente",
        date_creation=datetime.now(timezone.utc),
        date_modification=datetime.now(timezone.utc),
    )

    class SessionFictive:
        def get(self, modele, identifiant):
            if modele is RendezVous:
                return rendez_vous
            if modele is Patient:
                return patient
            raise AssertionError(f"Modèle inattendu : {modele}")

        def query(self, modele):
            assert modele is RendezVous
            return RequeteFictive()

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    patient = Patient(
        id=rendez_vous.patient_id,
        utilisateur_id=uuid.uuid4(),
        nom="Rabe",
        prenoms="Miora",
    )

    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def first(self):
            return None

    date_confirmee = date_creneau + timedelta(hours=1)
    resultat = modifier_rendez_vous(
        rendez_vous.id,
        ModificationRendezVousSchema(
            statut="confirme",
            date_confirmee=date_confirmee,
        ),
        medecin,
        SessionFictive(),
    )

    assert rendez_vous.statut == "confirme"
    assert rendez_vous.date_souhaitee == date_creneau
    assert rendez_vous.date_confirmee == date_confirmee
    assert resultat.numero_file == 4


def test_doctor_can_confirm_appointment_without_messaging_dependency():
    patient = Patient(id=uuid.uuid4(), utilisateur_id=uuid.uuid4(), nom="Rabe", prenoms="Miora", telephone="+261331234567")
    utilisateur_patient = Utilisateur(
        id=patient.utilisateur_id,
        identifiant="+261331234567",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
    )
    medecin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="MED-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.MEDECIN,
    )
    medecin.personnel = Personnel(
        utilisateur_id=medecin.id,
        nom="Rabe",
        prenoms="Miora",
        matricule="MED-01",
        service="Neurologie",
    )
    rendez_vous = RendezVous(
        id=uuid.uuid4(),
        patient_id=patient.id,
        service_nom="Neurologie",
        date_souhaitee=datetime.now(timezone.utc) + timedelta(days=2),
        motif="Consultation",
        statut="en_attente",
        date_creation=datetime.now(timezone.utc),
        date_modification=datetime.now(timezone.utc),
        date_confirmee_vue=datetime.now(timezone.utc) - timedelta(days=1),
    )
    class RequeteFictive:
        def filter(self, *conditions):
            return self

        def first(self):
            return None

    class SessionFictive:
        def get(self, modele, identifiant):
            return {
                RendezVous: rendez_vous,
                Patient: patient,
                Utilisateur: utilisateur_patient,
            }[modele]

        def query(self, modele):
            assert modele is RendezVous
            return RequeteFictive()

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    date_confirmee = datetime.now(timezone.utc) + timedelta(days=3)
    resultat = modifier_rendez_vous(
        rendez_vous.id,
        ModificationRendezVousSchema(statut="confirme", date_confirmee=date_confirmee),
        medecin,
        SessionFictive(),
    )

    assert rendez_vous.statut == "confirme"
    assert rendez_vous.date_confirmee == date_confirmee
    assert rendez_vous.date_confirmee_vue is None
    assert resultat.patient_telephone == "+261331234567"


def test_patient_can_mark_own_confirmation_notification_as_read():
    patient = Patient(
        id=uuid.uuid4(),
        utilisateur_id=uuid.uuid4(),
        nom="Rabe",
        prenoms="Miora",
        telephone="+261331234567",
    )
    utilisateur = Utilisateur(
        id=patient.utilisateur_id,
        identifiant="+261331234567",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.PATIENT,
    )
    utilisateur.patient = patient
    date_confirmee = datetime.now(timezone.utc) + timedelta(days=2)
    rendez_vous = RendezVous(
        id=uuid.uuid4(),
        patient_id=patient.id,
        service_nom="Neurologie",
        date_souhaitee=date_confirmee,
        date_confirmee=date_confirmee,
        motif="Consultation",
        statut="confirme",
        date_creation=datetime.now(timezone.utc),
        date_modification=datetime.now(timezone.utc),
    )

    class SessionFictive:
        a_commit = False

        def get(self, modele, identifiant):
            assert modele is RendezVous
            return rendez_vous

        def commit(self):
            self.a_commit = True

        def refresh(self, objet):
            pass

    session = SessionFictive()
    resultat = marquer_notification_rendez_vous_lue(
        rendez_vous.id,
        utilisateur,
        session,
    )

    assert session.a_commit
    assert rendez_vous.date_confirmee_vue == date_confirmee
    assert resultat.date_confirmee_vue == date_confirmee


def test_patient_cannot_mark_another_patients_notification_as_read():
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
    rendez_vous = RendezVous(
        id=uuid.uuid4(),
        patient_id=uuid.uuid4(),
        service_nom="Neurologie",
        date_souhaitee=datetime.now(timezone.utc) + timedelta(days=2),
        date_confirmee=datetime.now(timezone.utc) + timedelta(days=2),
        motif="Consultation",
        statut="confirme",
    )

    class SessionFictive:
        def get(self, modele, identifiant):
            assert modele is RendezVous
            return rendez_vous

    with pytest.raises(HTTPException) as erreur:
        marquer_notification_rendez_vous_lue(
            rendez_vous.id,
            utilisateur,
            SessionFictive(),
        )

    assert erreur.value.status_code == 404


def test_confirmations_allow_same_waiting_list_slot_but_reject_other_slot_conflicts():
    date_rendez_vous = datetime.now(timezone.utc) + timedelta(days=3)
    creneau_id = uuid.uuid4()
    medecin = Utilisateur(
        id=uuid.uuid4(),
        identifiant="MED-01",
        mot_de_passe_hash="hash",
        role=RoleUtilisateur.MEDECIN,
    )
    medecin.personnel = Personnel(
        utilisateur_id=medecin.id,
        nom="Rabe",
        prenoms="Miora",
        matricule="MED-01",
        service="Neurologie",
    )

    for meme_creneau, resultat_attendu in ((True, None), (False, 409)):
        patient = Patient(
            id=uuid.uuid4(),
            utilisateur_id=uuid.uuid4(),
            nom="Rakoto",
            prenoms="Tiana",
        )
        rendez_vous = RendezVous(
            id=uuid.uuid4(),
            patient_id=patient.id,
            service_id=uuid.uuid4(),
            service_nom="Neurologie",
            creneau_id=creneau_id,
            numero_file=2,
            date_souhaitee=date_rendez_vous,
            date_jour=date_rendez_vous.date(),
            motif="Consultation",
            statut="en_attente",
            date_creation=datetime.now(timezone.utc),
            date_modification=datetime.now(timezone.utc),
        )
        rendez_vous_existant = RendezVous(
            id=uuid.uuid4(),
            patient_id=uuid.uuid4(),
            service_id=rendez_vous.service_id,
            service_nom="Neurologie",
            creneau_id=creneau_id if meme_creneau else uuid.uuid4(),
            numero_file=1,
            date_souhaitee=date_rendez_vous,
            date_jour=date_rendez_vous.date(),
            date_confirmee=date_rendez_vous,
            motif="Consultation",
            statut="confirme",
        )

        class RequeteFictive:
            def __init__(self):
                self.conditions = []

            def filter(self, *conditions):
                self.conditions.extend(conditions)
                return self

            def first(self):
                filtre_file_partagee = any(
                    "rendez_vous.creneau_id IS NULL" in str(condition)
                    and "rendez_vous.creneau_id !=" in str(condition)
                    for condition in self.conditions
                )
                if meme_creneau and filtre_file_partagee:
                    return None
                return rendez_vous_existant

        class SessionFictive:
            def get(self, modele, identifiant):
                if modele is RendezVous:
                    return rendez_vous
                if modele is Patient:
                    return patient
                raise AssertionError(f"Modèle inattendu : {modele}")

            def query(self, modele):
                assert modele is RendezVous
                return RequeteFictive()

            def commit(self):
                pass

            def refresh(self, objet):
                pass

        if resultat_attendu is None:
            resultat = modifier_rendez_vous(
                rendez_vous.id,
                ModificationRendezVousSchema(
                    statut="confirme",
                    date_confirmee=date_rendez_vous,
                ),
                medecin,
                SessionFictive(),
            )
            assert resultat.statut == "confirme"
            assert rendez_vous.numero_file == 2
        else:
            with pytest.raises(HTTPException) as erreur:
                modifier_rendez_vous(
                    rendez_vous.id,
                    ModificationRendezVousSchema(
                        statut="confirme",
                        date_confirmee=date_rendez_vous,
                    ),
                    medecin,
                    SessionFictive(),
                )
            assert erreur.value.status_code == resultat_attendu
