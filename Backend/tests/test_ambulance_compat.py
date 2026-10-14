from datetime import datetime, timedelta, timezone
import uuid
from types import SimpleNamespace

import pytest
from pydantic import ValidationError
from fastapi import HTTPException

from app.api.v1 import endpoints as endpoints_v1
from app.api.v1.endpoints.ambulances import routeur as routeur_ambulances
from app.api.v1.endpoints.ambulances import (
    _affecter_ambulance_a_demande,
    _creer_demande_en_attente,
    completer_mission_invite,
    creer_mission_invite,
    creer_mission_patient,
    creer_mission_urgente_invite,
    rattacher_mission_au_patient,
    simuler_trajet,
    terminer_mission,
)
from app.models.ambulance import Ambulance, MissionAmbulance
from app.models.enums import (
    CategorieLit,
    ROLES_REGULATION_AMBULANCE,
    StatutAmbulance,
    StatutLit,
    TypeAmbulance,
    RoleUtilisateur,
)
from app.models.lit import Lit
from app.models.patient import Patient
from app.api.v1.endpoints.lits import ROLES_CONSULTATION
from app.schemas.ambulance import (
    PriseEnChargeAmbulanceSchema,
    RetourCentreAmbulanceSchema,
    SimulationTrajetSchema,
    CreationDemandeAmbulanceInviteSchema,
    CompleterDemandeAmbulanceSchema,
    DemandeAmbulanceUrgenteSchema,
    DonneesMissionAmbulanceSchema,
    MissionAmbulanceOut,
    RattacherDemandeAmbulanceSchema,
)
from app.core import osrm


def test_ambulance_keeps_legacy_compatibility_fields():
    ambulance = Ambulance(numero="AMB-01", est_principale=True)

    assert ambulance.numero == "AMB-01"
    assert ambulance.code == "AMB-01"
    assert ambulance.nom == "AMB-01"
    assert ambulance.type == TypeAmbulance.PRINCIPALE

    ambulance.code = "AMB-02"
    ambulance.type = TypeAmbulance.SECONDAIRE

    assert ambulance.numero == "AMB-02"
    assert ambulance.est_principale is False
    assert ambulance.code == "AMB-02"
    assert ambulance.type == TypeAmbulance.SECONDAIRE


def test_major_roles_are_separated_between_beds_and_ambulances():
    assert RoleUtilisateur.MAJOR in ROLES_REGULATION_AMBULANCE
    assert RoleUtilisateur.MAJOR_DE_GARDE not in ROLES_REGULATION_AMBULANCE
    assert RoleUtilisateur.MAJOR_DE_GARDE in ROLES_CONSULTATION
    assert RoleUtilisateur.MAJOR not in ROLES_CONSULTATION
    assert RoleUtilisateur.SUPERADMIN in ROLES_CONSULTATION


def test_mission_persists_patient_pickup_time_and_delay():
    heure_prise_en_charge = datetime.now(timezone.utc)
    mission = MissionAmbulance(
        heure_prise_en_charge=heure_prise_en_charge,
        minutes_retard=0,
    )

    assert mission.heure_prise_en_charge == heure_prise_en_charge
    assert mission.minutes_retard == 0
    assert "heure_prise_en_charge" in MissionAmbulance.__table__.columns
    assert "minutes_retard" in MissionAmbulance.__table__.columns


def test_public_ambulance_request_requires_valid_contact_phone():
    demande = {
        "patient": "Jean Rabe",
        "destination": "Anosy",
        "distance_km": 4.5,
    }

    with pytest.raises(ValidationError):
        CreationDemandeAmbulanceInviteSchema.model_validate(demande)

    demande["telephone_contact"] = "+261 34 12 345 67"
    assert CreationDemandeAmbulanceInviteSchema.model_validate(demande).telephone_contact == "+261 34 12 345 67"


def test_urgent_ambulance_request_only_requires_address():
    demande = DemandeAmbulanceUrgenteSchema.model_validate({"destination": "  Anosy  "})
    infos_medicales_facultatives = DemandeAmbulanceUrgenteSchema.model_validate({
        "destination": "Anosy",
        "patient_infectieux": True,
    })

    assert demande.destination == "Anosy"
    assert demande.urgence_vitale is False
    assert demande.patient_infectieux is False
    assert demande.motif_infectieux is None
    assert infos_medicales_facultatives.motif_infectieux is None


def test_urgent_guest_request_passes_optional_contact_as_none(monkeypatch):
    appel = {}
    mission = object()
    mission_out = MissionAmbulanceOut.model_construct()

    def creer_demande(db, donnees, **kwargs):
        appel["donnees"] = donnees
        appel.update(kwargs)
        return mission

    monkeypatch.setattr(
        "app.api.v1.endpoints.ambulances._creer_demande_en_attente",
        creer_demande,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.ambulances._sortie_mission",
        lambda resultat: mission_out if resultat is mission else None,
    )

    resultat = creer_mission_urgente_invite(
        DemandeAmbulanceUrgenteSchema(destination="Anosy"),
        db=object(),
    )

    assert appel["telephone_contact"] is None
    assert appel["patient_id"] is None
    assert len(appel["jeton_suivi_hash"]) == 64
    assert resultat.mission is mission_out


def test_standard_guest_request_converts_mission_before_building_response(monkeypatch):
    mission = object()
    mission_out = MissionAmbulanceOut.model_construct()
    monkeypatch.setattr(
        "app.api.v1.endpoints.ambulances._creer_demande_en_attente",
        lambda *args, **kwargs: mission,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.ambulances._sortie_mission",
        lambda resultat: mission_out if resultat is mission else None,
    )

    resultat = creer_mission_invite(
        CreationDemandeAmbulanceInviteSchema(
            patient="Jean Rabe",
            destination="Anosy",
            distance_km=4.5,
            telephone_contact="0341234567",
        ),
        db=object(),
    )

    assert resultat.mission is mission_out


def test_patient_request_converts_mission_before_building_response(monkeypatch):
    mission = object()
    mission_out = MissionAmbulanceOut.model_construct()
    patient = SimpleNamespace(id=uuid.uuid4(), prenoms="Jean", nom="Rabe", telephone="0341234567")
    utilisateur = SimpleNamespace(patient=patient)
    monkeypatch.setattr(
        "app.api.v1.endpoints.ambulances._creer_demande_en_attente",
        lambda *args, **kwargs: mission,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.ambulances._sortie_mission",
        lambda resultat: mission_out if resultat is mission else None,
    )

    resultat = creer_mission_patient(
        DonneesMissionAmbulanceSchema(
            patient="Nom ignoré",
            destination="Anosy",
            distance_km=4.5,
        ),
        utilisateur=utilisateur,
        db=object(),
    )

    assert resultat is mission_out


def test_guest_completion_requires_and_validates_information():
    with pytest.raises(ValidationError):
        CompleterDemandeAmbulanceSchema.model_validate({})
    with pytest.raises(ValidationError):
        CompleterDemandeAmbulanceSchema.model_validate({"telephone_contact": "123"})
    with pytest.raises(ValidationError):
        RattacherDemandeAmbulanceSchema.model_validate({
            "patient_id": uuid.uuid4(),
            "identite_verifiee": False,
        })

    complement = CompleterDemandeAmbulanceSchema.model_validate({
        "patient": "  Jean Rabe  ",
        "informations_medicales": "  Difficulté respiratoire  ",
    })
    assert complement.patient == "Jean Rabe"
    assert complement.informations_medicales == "Difficulté respiratoire"


def test_guest_completion_updates_patient_contact_and_medical_details(monkeypatch):
    mission = SimpleNamespace(
        statut="assigne",
        prenoms_patient="Patient",
        nom_patient="non renseigné",
        telephone_contact=None,
        notes=None,
    )
    mission_out = MissionAmbulanceOut.model_construct()
    monkeypatch.setattr(
        "app.api.v1.endpoints.ambulances._obtenir_mission_invite_avec_jeton",
        lambda db, mission_id, jeton, **kwargs: mission,
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.ambulances._sortie_mission",
        lambda resultat: mission_out,
    )

    class SessionFictive:
        def commit(self):
            pass

        def refresh(self, objet):
            pass

    resultat = completer_mission_invite(
        uuid.uuid4(),
        CompleterDemandeAmbulanceSchema(
            patient="Jean Rabe",
            telephone_contact="+261 34 12 345 67",
            informations_medicales="Difficulté respiratoire",
        ),
        jeton="jeton-suivi",
        db=SessionFictive(),
    )

    assert resultat is mission_out
    assert mission.prenoms_patient == "Jean"
    assert mission.nom_patient == "Rabe"
    assert mission.telephone_contact == "+261 34 12 345 67"
    assert mission.notes == "Difficulté respiratoire"


def test_staff_can_link_guest_mission_after_confirming_patient_identity(monkeypatch):
    patient_id = uuid.uuid4()
    mission_id = uuid.uuid4()
    lit_id = uuid.uuid4()
    patient = Patient(
        id=patient_id,
        nom="Rabe",
        prenoms="Jean",
        telephone="0341234567",
    )
    mission = MissionAmbulance(
        id=mission_id,
        ambulance_id=None,
        patient_id=None,
        nom_patient="non renseigné",
        prenoms_patient="Patient",
        telephone_contact="0340000000",
        jeton_suivi_hash="a" * 64,
        lit_id=lit_id,
        lit_secondaire_id=None,
    )
    lit = Lit(
        id=lit_id,
        numero="URG-01",
        categorie=CategorieLit.URGENCE,
        statut=StatutLit.RESERVE,
        mission_reservation_id=mission_id,
    )
    mission_out = MissionAmbulanceOut.model_construct()
    monkeypatch.setattr(
        "app.api.v1.endpoints.ambulances._sortie_mission",
        lambda resultat: mission_out,
    )

    class Requete:
        def __init__(self, resultat):
            self.resultat = resultat

        def filter(self, *args):
            return self

        def order_by(self, *args):
            return self

        def with_for_update(self):
            return self

        def one_or_none(self):
            return self.resultat

        def all(self):
            return self.resultat

    class SessionFictive:
        def query(self, modele):
            resultat = {
                MissionAmbulance: mission,
                Patient: patient,
                Lit: [lit],
            }[modele]
            return Requete(resultat)

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    resultat = rattacher_mission_au_patient(
        mission_id,
        RattacherDemandeAmbulanceSchema(
            patient_id=patient_id,
            identite_verifiee=True,
        ),
        db=SessionFictive(),
    )

    assert resultat is mission_out
    assert mission.patient_id == patient_id
    assert mission.prenoms_patient == "Jean"
    assert mission.nom_patient == "Rabe"
    assert mission.telephone_contact == "0340000000"
    assert mission.jeton_suivi_hash is None
    assert lit.patient_id == patient_id
    assert lit.prenoms_patient_actuel == "Jean"
    assert lit.nom_patient_actuel == "Rabe"


def test_staff_cannot_link_mission_without_identity_attestation():
    patient = Patient(id=uuid.uuid4(), nom="Rabe", prenoms="Jean", telephone="0341234567")
    mission = MissionAmbulance(
        id=uuid.uuid4(),
        ambulance_id=None,
        patient_id=None,
        nom_patient="inconnu",
        prenoms_patient="Patient",
        lit_id=None,
        lit_secondaire_id=None,
    )

    class Requete:
        def __init__(self, resultat):
            self.resultat = resultat

        def filter(self, *args):
            return self

        def with_for_update(self):
            return self

        def one_or_none(self):
            return self.resultat

    class SessionFictive:
        def query(self, modele):
            return Requete(mission if modele is MissionAmbulance else patient)

    with pytest.raises(HTTPException) as erreur:
        rattacher_mission_au_patient(
            mission.id,
            RattacherDemandeAmbulanceSchema.model_construct(
                patient_id=patient.id,
                identite_verifiee=False,
            ),
            db=SessionFictive(),
        )

    assert erreur.value.status_code == 422
    assert mission.patient_id is None


def test_ambulance_request_is_persisted_pending_without_assigning_vehicle(monkeypatch):
    itineraire = SimpleNamespace(
        distance_km=4.5,
        aller=SimpleNamespace(
            latitude_destination=-18.91,
            longitude_destination=47.52,
            distance_km=2.25,
            duree_estimee_minutes=8,
        ),
        retour=SimpleNamespace(distance_km=2.25, duree_estimee_minutes=8),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.ambulances._calculer_itineraires_destination",
        lambda donnees: [itineraire],
    )

    class SessionFictive:
        def add(self, objet):
            self.objet = objet

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    donnees = DonneesMissionAmbulanceSchema(
        patient="Jean Rabe",
        destination="Anosy",
        distance_km=4.5,
    )
    session = SessionFictive()
    demande = _creer_demande_en_attente(
        session,
        donnees,
        patient_id=None,
        telephone_contact="0341234567",
        jeton_suivi_hash="a" * 64,
    )

    assert session.objet is demande
    assert demande.statut == "en_attente_confirmation"
    assert demande.ambulance_id is None
    assert demande.lit_id is None
    assert demande.telephone_contact == "0341234567"
    assert MissionAmbulance.__table__.c.ambulance_id.nullable


def test_regulator_confirmation_assigns_vehicle_and_reserves_required_bed(monkeypatch):
    mission_id = uuid.uuid4()
    ambulance = Ambulance(
        id=uuid.uuid4(),
        numero="AMB-REG",
        est_principale=True,
        statut=StatutAmbulance.DISPONIBLE,
    )
    lit = Lit(
        id=uuid.uuid4(),
        numero="URG-REG",
        categorie=CategorieLit.URGENCE,
        statut=StatutLit.LIBRE,
    )
    demande = MissionAmbulance(
        id=mission_id,
        ambulance_id=None,
        nom_patient="RABE",
        prenoms_patient="Jean",
        adresse_destination="Anosy",
        latitude_destination=-18.91,
        longitude_destination=47.52,
        distance_km=4.5,
        itineraire_index=0,
        distance_aller_km=2.25,
        duree_aller_minutes=8,
        distance_retour_km=2.25,
        duree_retour_minutes=8,
        urgence_vitale=False,
        patient_infectieux=False,
        tarif_base=70000,
        frais_retard=0,
        montant_total=70000,
        statut="en_attente_confirmation",
        heure_depart=datetime.now(timezone.utc),
    )
    itineraire = SimpleNamespace(
        distance_km=4.2,
        aller=SimpleNamespace(distance_km=2.1, duree_estimee_minutes=7),
        retour=SimpleNamespace(distance_km=2.1, duree_estimee_minutes=7),
    )
    monkeypatch.setattr(
        "app.api.v1.endpoints.ambulances._calculer_itineraires_destination",
        lambda donnees: [itineraire],
    )

    class Requete:
        def __init__(self, resultat):
            self.resultat = resultat

        def filter(self, *args):
            return self

        def order_by(self, *args):
            return self

        def with_for_update(self):
            return self

        def all(self):
            return self.resultat

    class SessionFictive:
        def query(self, modele):
            return Requete([lit] if modele is Lit else None)

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    _affecter_ambulance_a_demande(SessionFictive(), demande, ambulance)

    assert demande.ambulance_id == ambulance.id
    assert demande.statut == "assigne"
    assert demande.lit_id == lit.id
    assert ambulance.statut == StatutAmbulance.NON_DISPONIBLE
    assert lit.statut == StatutLit.RESERVE
    assert lit.mission_reservation_id == mission_id


def test_public_ambulance_routes_do_not_require_staff_role_dependencies():
    routes_publiques = [
        route for route in routeur_ambulances.routes
        if route.path.startswith("/ambulances/public/")
    ]

    assert routes_publiques
    assert all(not route.dependencies for route in routes_publiques)
    route_suivi = next(route for route in routes_publiques if route.path.endswith("/suivi"))
    assert "jeton" in route_suivi.endpoint.__annotations__


def test_retour_centre_enregistre_chrono_termine_course_et_libere_ambulance():
    maintenant = datetime.now(timezone.utc)
    ambulance = Ambulance(
        id=uuid.uuid4(),
        numero="AMB-TEST",
        est_principale=True,
        statut=StatutAmbulance.NON_DISPONIBLE,
    )
    mission = MissionAmbulance(
        id=uuid.uuid4(),
        ambulance_id=ambulance.id,
        ambulance=ambulance,
        nom_patient="Test",
        prenoms_patient="Patient",
        adresse_destination="Anosy",
        latitude_destination=-18.9156,
        longitude_destination=47.5203,
        distance_km=4.61,
        tarif_base=70000,
        frais_retard=0,
        montant_total=70000,
        statut="SUR_PLACE",
        heure_depart=maintenant - timedelta(hours=2),
        heure_arrivee_sur_lieux=maintenant - timedelta(minutes=130),
    )

    class Requete:
        def __init__(self, resultat):
            self.resultat = resultat

        def filter(self, *args):
            return self

        def with_for_update(self):
            return self

        def one_or_none(self):
            return self.resultat

        def one(self):
            return self.resultat

    class SessionFictive:
        def query(self, modele):
            resultat = mission if modele is MissionAmbulance else ambulance
            return Requete(resultat)

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    resultat = terminer_mission(
        mission.id,
        RetourCentreAmbulanceSchema(minutes_sur_place=130),
        SessionFictive(),
    )

    assert resultat.minutes_sur_place == 130
    assert resultat.minutes_retard == 70
    assert resultat.frais_retard == 70000
    assert resultat.cout_total == 140000
    assert resultat.statut.value == "terminee"
    assert resultat.heure_retour is not None
    assert ambulance.statut == StatutAmbulance.DISPONIBLE


def test_retour_centre_attribue_le_lit_urgence_au_patient():
    maintenant = datetime.now(timezone.utc)
    ambulance = Ambulance(
        id=uuid.uuid4(),
        numero="AMB-TEST",
        est_principale=True,
        statut=StatutAmbulance.NON_DISPONIBLE,
    )
    lit = Lit(
        id=uuid.uuid4(),
        numero="URG-01",
        categorie=CategorieLit.URGENCE,
        statut=StatutLit.LIBRE,
    )
    mission = MissionAmbulance(
        id=uuid.uuid4(),
        ambulance_id=ambulance.id,
        ambulance=ambulance,
        nom_patient="RABE",
        prenoms_patient="Jean",
        adresse_destination="Anosy",
        latitude_destination=-18.9156,
        longitude_destination=47.5203,
        distance_km=4.61,
        tarif_base=70000,
        frais_retard=0,
        montant_total=70000,
        statut="EN_ROUTE",
        heure_depart=maintenant,
    )

    class Requete:
        def __init__(self, resultat):
            self.resultat = resultat

        def filter(self, *args):
            return self

        def with_for_update(self):
            return self

        def one_or_none(self):
            return self.resultat

        def one(self):
            return self.resultat

    class SessionFictive:
        def query(self, modele):
            return Requete({MissionAmbulance: mission, Ambulance: ambulance, Lit: lit}[modele])

        def commit(self):
            pass

        def refresh(self, objet):
            pass

    resultat = terminer_mission(
        mission.id,
        RetourCentreAmbulanceSchema(minutes_sur_place=45, lit_id=lit.id),
        SessionFictive(),
    )

    assert resultat.lit_id == lit.id
    assert resultat.lit_numero == "URG-01"
    assert lit.statut == StatutLit.OCCUPE
    assert lit.nom_patient_actuel == "RABE"
    assert lit.prenoms_patient_actuel == "Jean"
    assert lit.date_occupation is not None


def test_osrm_route_uses_coordinates_and_keeps_fractional_distance(monkeypatch):
    class ReponseRoute:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "code": "Ok",
                "routes": [{
                    "distance": 12540,
                    "duration": 3600,
                    "legs": [{"steps": [{
                        "distance": 2500,
                        "name": "Route Nationale",
                        "maneuver": {"type": "turn", "modifier": "right"},
                    }]}],
                }],
            }

    appel = {}
    monkeypatch.setattr(osrm, "_geocoder_origine", lambda: (-18.92, 47.43))
    monkeypatch.setattr(osrm, "_geocoder", lambda adresse: (-18.91, 47.44))

    def reponse_get(url, **kwargs):
        appel["url"] = url
        return ReponseRoute()

    monkeypatch.setattr(osrm.httpx, "get", reponse_get)

    itineraire = osrm.calculer_itineraire("Destination test")

    assert appel["url"].endswith("47.43,-18.92;47.44,-18.91")
    assert itineraire.distance_km == 12.54
    assert itineraire.duree_estimee_minutes == 60
    assert itineraire.etapes[0].instruction == "Tourner à droite sur Route Nationale"
    assert itineraire.etapes[0].distance_m == 2500
    assert itineraire.latitude_destination == -18.91
    assert itineraire.longitude_destination == 47.44


def test_catalogue_tana_contains_only_bounded_coordinates():
    lieux = osrm.lister_lieux_tana()

    assert len(lieux) >= 300
    assert any(lieu["id"] == "anosy" for lieu in lieux)
    assert all(osrm._dans_zone_antananarivo(lieu["latitude"], lieu["longitude"]) for lieu in lieux)


def test_osrm_routes_from_catalog_coordinates_without_geocoding(monkeypatch):
    class ReponseRoute:
        def raise_for_status(self):
            pass

        def json(self):
            return {"code": "Ok", "routes": [{"distance": 4321, "duration": 1200, "legs": []}]}

    appel = {}
    monkeypatch.setattr(osrm, "_geocoder_origine", lambda: (-18.8980556, 47.5430556))
    monkeypatch.setattr(osrm, "_geocoder", lambda adresse: (_ for _ in ()).throw(AssertionError("geocodage inattendu")))

    def reponse_get(url, **kwargs):
        appel["url"] = url
        return ReponseRoute()

    monkeypatch.setattr(osrm.httpx, "get", reponse_get)

    itineraire = osrm.calculer_itineraire_coordonnees(-18.9156496, 47.520382)

    assert appel["url"].endswith("47.5430556,-18.8980556;47.520382,-18.9156496")
    assert itineraire.distance_km == 4.321
    assert itineraire.latitude_destination == -18.9156496
    assert itineraire.longitude_destination == 47.520382


def test_osrm_returns_alternative_routes_for_selection(monkeypatch):
    class ReponseRoute:
        def raise_for_status(self):
            pass

        def json(self):
            return {
                "code": "Ok",
                "routes": [
                    {"distance": 4321, "duration": 1200, "legs": []},
                    {"distance": 5100, "duration": 900, "legs": []},
                ],
            }

    appel = {}
    monkeypatch.setattr(osrm, "_geocoder_origine", lambda: (-18.8980556, 47.5430556))

    def reponse_get(url, **kwargs):
        appel.update(kwargs)
        return ReponseRoute()

    monkeypatch.setattr(osrm.httpx, "get", reponse_get)

    itineraires = osrm.calculer_itineraires_coordonnees(-18.9156496, 47.520382)

    assert appel["params"]["alternatives"] == "true"
    assert [itineraire.distance_km for itineraire in itineraires] == [4.321, 5.1]
    assert [itineraire.duree_estimee_minutes for itineraire in itineraires] == [20, 15]


def test_simulation_exposes_all_route_choices(monkeypatch):
    aller = (
        osrm.Itineraire(4.321, 20, (), -18.9156, 47.5203),
        osrm.Itineraire(5.1, 15, (), -18.9156, 47.5203),
    )
    retour = osrm.Itineraire(0.5, 2, (), -18.898, 47.543)
    itineraires = tuple(osrm.ItineraireMission(route, retour) for route in aller)
    monkeypatch.setattr(
        endpoints_v1.ambulances,
        "_calculer_itineraires_destination",
        lambda donnees: itineraires,
    )

    resultat = simuler_trajet(SimulationTrajetSchema(destination="Anosy"))

    assert [option.index for option in resultat.itineraires] == [0, 1]
    assert [option.distance_km for option in resultat.itineraires] == [4.82, 5.6]
    assert [option.cout_base for option in resultat.itineraires] == [70000, 130000]
    assert resultat.distance_km == resultat.itineraires[0].distance_km


def test_osrm_rejects_destination_coordinates_outside_tana():
    try:
        osrm.calculer_itineraire_coordonnees(-18.1492, 49.4023)
    except osrm.DestinationIntrouvable as erreur:
        assert "hors de la zone" in str(erreur)
    else:
        raise AssertionError("Les coordonnées hors de Tana doivent être refusées.")


def test_geocoder_limits_search_to_antananarivo(monkeypatch):
    class ReponseGeocodage:
        def raise_for_status(self):
            pass

        def json(self):
            return [{"lat": "-18.9156496", "lon": "47.520382"}]

    appel = {}

    def reponse_get(url, **kwargs):
        appel.update(kwargs["params"])
        return ReponseGeocodage()

    monkeypatch.setattr(osrm.httpx, "get", reponse_get)

    assert osrm._geocoder("Anosy, Antananarivo") == (-18.9156496, 47.520382)
    assert appel["bounded"] == 1
    assert appel["viewbox"] == osrm.ZONE_VIEWBOX


def test_geocoder_rejects_results_outside_antananarivo(monkeypatch):
    class ReponseGeocodage:
        def raise_for_status(self):
            pass

        def json(self):
            return [{"lat": "-18.1492", "lon": "49.4023"}]

    monkeypatch.setattr(osrm.httpx, "get", lambda *args, **kwargs: ReponseGeocodage())

    try:
        osrm._geocoder("Toamasina")
    except osrm.DestinationIntrouvable as erreur:
        assert "hors de la zone" in str(erreur)
    else:
        raise AssertionError("Une destination hors d'Antananarivo doit être refusée.")
