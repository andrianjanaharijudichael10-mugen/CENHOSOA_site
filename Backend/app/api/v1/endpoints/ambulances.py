"""API de régulation et de suivi des missions d'ambulance."""
import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session, contains_eager, joinedload

from app.api.deps import exiger_roles, obtenir_utilisateur_courant
from app.core.osrm import (
    DestinationIntrouvable,
    ServiceItineraireIndisponible,
    calculer_itineraires_mission,
    calculer_itineraires_mission_coordonnees,
    lister_lieux_tana,
)
from app.db.session import obtenir_db
from app.models.ambulance import Ambulance, MissionAmbulance
from app.models.enums import (
    CategorieLit,
    ROLES_ACCES_AMBULANCES,
    RoleUtilisateur,
    StatutAmbulance,
    StatutLit,
    StatutMissionAmbulance,
)
from app.models.lit import Lit
from app.models.patient import Patient
from app.models.utilisateur import Utilisateur
from app.schemas.ambulance import (
    AmbulanceOut,
    CompleterDemandeAmbulanceSchema,
    ConfirmationDemandeAmbulanceSchema,
    CreationAmbulanceSchema,
    CreationDemandeAmbulanceInviteSchema,
    CreationMissionAmbulanceSchema,
    DemandeAmbulanceInviteOut,
    DemandeAmbulanceUrgenteSchema,
    DonneesMissionAmbulanceSchema,
    EtapeItineraireOut,
    MissionAmbulanceOut,
    PatientRattachementAmbulanceOut,
    LitUrgenceDisponibleOut,
    LieuTanaOut,
    OptionItineraireOut,
    PriseEnChargeAmbulanceSchema,
    RetourCentreAmbulanceSchema,
    RefusDemandeAmbulanceSchema,
    RattacherDemandeAmbulanceSchema,
    SimulationTrajetOut,
    SimulationTrajetSchema,
    TransitionMissionSchema,
)

routeur = APIRouter(prefix="/ambulances", tags=["Régulation des ambulances"])
ROLES_ACCES = tuple(ROLES_ACCES_AMBULANCES)
DELAI_GRATUIT_MINUTES = 60
FRAIS_PAR_PALIER_RETARD = 35000
DELAI_DECHARGEMENT_MINUTES = 30
DELAI_BIONETTOYAGE_AMBULANCE_MINUTES = 45


def cout_base_pour_distance(distance_km: float) -> int:
    return 70000 if distance_km <= 5 else 130000


def calculer_frais_retard(minutes_sur_place: int) -> tuple[int, int]:
    minutes_retard = max(0, minutes_sur_place - DELAI_GRATUIT_MINUTES)
    paliers = (minutes_retard + 59) // 60
    return minutes_retard, paliers * FRAIS_PAR_PALIER_RETARD


def calculer_frais_retard_declare(minutes_retard: int) -> int:
    paliers = (minutes_retard + 59) // 60
    return paliers * FRAIS_PAR_PALIER_RETARD


def _calculer_itineraires_destination(donnees):
    if donnees.latitude_destination is not None:
        return calculer_itineraires_mission_coordonnees(
            donnees.latitude_destination,
            donnees.longitude_destination,
        )
    return calculer_itineraires_mission(donnees.destination.strip())


def _sortie_mission(mission: MissionAmbulance) -> MissionAmbulanceOut:
    valeur_statut = str(mission.statut).upper()
    statut_legacy = {
        "EN_ROUTE": StatutMissionAmbulance.ASSIGNE,
        "SUR_PLACE": StatutMissionAmbulance.SUR_LES_LIEUX,
        "TERMINEE": StatutMissionAmbulance.TERMINEE,
    }
    if valeur_statut in statut_legacy:
        statut_sortie = statut_legacy[valeur_statut]
    elif valeur_statut in {statut.name for statut in StatutMissionAmbulance}:
        statut_sortie = StatutMissionAmbulance[valeur_statut]
    else:
        statut_sortie = StatutMissionAmbulance.EN_COURS

    return MissionAmbulanceOut(
        id=mission.id,
        ambulance_id=mission.ambulance_id,
        ambulance_code=mission.ambulance.code if mission.ambulance else None,
        ambulance_nom=mission.ambulance.nom if mission.ambulance else None,
        type_ambulance=mission.ambulance.type if mission.ambulance else None,
        lit_id=mission.lit_id,
        lit_numero=mission.lit.numero if mission.lit else None,
        lit_categorie=mission.lit.categorie if mission.lit else None,
        lit_secondaire_id=mission.lit_secondaire_id,
        lit_secondaire_numero=mission.lit_secondaire.numero if mission.lit_secondaire else None,
        lit_secondaire_categorie=mission.lit_secondaire.categorie if mission.lit_secondaire else None,
        patient_id=mission.patient_id,
        telephone_contact=mission.telephone_contact,
        informations_medicales=mission.notes,
        patient=mission.patient,
        destination=mission.destination,
        distance_km=round(float(mission.distance_km), 2),
        cout_base=int(mission.cout_base),
        statut=statut_sortie,
        adresse_patient=mission.adresse_patient or mission.destination,
        distance_aller_km=round(float(mission.distance_aller_km or 0), 2),
        duree_aller_minutes=mission.duree_aller_minutes or 0,
        distance_retour_km=round(float(mission.distance_retour_km or 0), 2),
        duree_retour_minutes=mission.duree_retour_minutes or 0,
        urgence_vitale=bool(mission.urgence_vitale),
        patient_infectieux=bool(mission.patient_infectieux),
        motif_infectieux=mission.motif_infectieux,
        heure_depart=mission.heure_depart,
        heure_arrivee=mission.heure_arrivee,
        heure_transport=mission.heure_transport,
        heure_arrivee_urgences=mission.heure_arrivee_urgences,
        heure_limite_dechargement=(
            mission.heure_arrivee_urgences + timedelta(minutes=DELAI_DECHARGEMENT_MINUTES)
            if mission.heure_arrivee_urgences
            else None
        ),
        heure_bionettoyage=mission.heure_bionettoyage,
        heure_fin_bionettoyage=(
            mission.heure_bionettoyage + timedelta(minutes=DELAI_BIONETTOYAGE_AMBULANCE_MINUTES)
            if mission.heure_bionettoyage and mission.patient_infectieux
            else None
        ),
        heure_prise_en_charge=mission.heure_prise_en_charge,
        heure_retour=mission.heure_retour,
        minutes_sur_place=mission.minutes_sur_place,
        minutes_retard=mission.minutes_retard,
        frais_retard=int(mission.frais_retard or 0),
        cout_total=int(mission.cout_total),
        message_refus=mission.message_refus,
    )


@routeur.get(
    "",
    response_model=list[AmbulanceOut],
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def lister_ambulances(db: Session = Depends(obtenir_db)):
    return db.query(Ambulance).order_by(Ambulance.numero).all()


@routeur.get("/public/ambulances-disponibles")
def compter_ambulances_publiques(db: Session = Depends(obtenir_db)):
    nombre = db.query(Ambulance).filter(
        Ambulance.statut == StatutAmbulance.DISPONIBLE
    ).count()
    return {"nombre_disponibles": nombre}


@routeur.post(
    "",
    response_model=AmbulanceOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def creer_ambulance(donnees: CreationAmbulanceSchema, db: Session = Depends(obtenir_db)):
    if db.query(Ambulance).filter(Ambulance.numero == donnees.numero).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une ambulance porte déjà ce numéro.",
        )
    ambulance = Ambulance(numero=donnees.numero.strip(), est_principale=donnees.est_principale)
    db.add(ambulance)
    db.commit()
    db.refresh(ambulance)
    return ambulance


@routeur.delete(
    "/{ambulance_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def supprimer_ambulance(ambulance_id: uuid.UUID, db: Session = Depends(obtenir_db)):
    ambulance = db.get(Ambulance, ambulance_id)
    if ambulance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambulance introuvable.")
    if db.query(MissionAmbulance).filter(MissionAmbulance.ambulance_id == ambulance_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cette ambulance est liée à des missions. Son historique doit être conservé.",
        )
    db.delete(ambulance)
    db.commit()


@routeur.get(
    "/lits-urgence-disponibles",
    response_model=list[LitUrgenceDisponibleOut],
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def lister_lits_urgence_disponibles(db: Session = Depends(obtenir_db)):
    lits = (
        db.query(Lit)
        .filter(
            Lit.categorie.in_([
                CategorieLit.URGENCE,
                CategorieLit.DECHOCAGE,
                CategorieLit.SALLE_SEPTIQUE,
            ]),
            Lit.statut == StatutLit.LIBRE,
        )
        .order_by(Lit.numero)
        .all()
    )
    return [
        LitUrgenceDisponibleOut(id=lit.id, numero=lit.numero, categorie=lit.categorie)
        for lit in lits
    ]


@routeur.get(
    "/public/lits-urgence-disponibles",
    response_model=list[LitUrgenceDisponibleOut],
)
def lister_lits_urgence_publics(db: Session = Depends(obtenir_db)):
    return lister_lits_urgence_disponibles(db)


@routeur.get(
    "/lieux-tana",
    response_model=list[LieuTanaOut],
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def obtenir_lieux_tana():
    return [LieuTanaOut(**lieu) for lieu in lister_lieux_tana()]


@routeur.get("/public/lieux-tana", response_model=list[LieuTanaOut])
def obtenir_lieux_tana_publics():
    return obtenir_lieux_tana()


@routeur.post(
    "/simuler-trajet",
    response_model=SimulationTrajetOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def simuler_trajet(donnees: SimulationTrajetSchema):
    if not donnees.destination.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="La destination est requise.")

    try:
        itineraires = _calculer_itineraires_destination(donnees)
    except DestinationIntrouvable as erreur:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(erreur)) from erreur
    except ServiceItineraireIndisponible as erreur:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(erreur)) from erreur

    options = [
        OptionItineraireOut(
            index=index,
            distance_km=round(itineraire.distance_km, 2),
            duree_estimee_minutes=itineraire.duree_estimee_minutes,
            distance_aller_km=round(itineraire.aller.distance_km, 2),
            duree_aller_minutes=itineraire.aller.duree_estimee_minutes,
            distance_retour_km=round(itineraire.retour.distance_km, 2),
            duree_retour_minutes=itineraire.retour.duree_estimee_minutes,
            etapes=[
                EtapeItineraireOut(instruction=etape.instruction, distance_m=etape.distance_m)
                for etape in (*itineraire.aller.etapes, *itineraire.retour.etapes)
            ],
            cout_base=cout_base_pour_distance(itineraire.distance_km),
        )

        for index, itineraire in enumerate(itineraires)
    ]
    itineraire_recommande = options[0]
    return SimulationTrajetOut(
        distance_km=itineraire_recommande.distance_km,
        duree_estimee_minutes=itineraire_recommande.duree_estimee_minutes,
        distance_aller_km=itineraire_recommande.distance_aller_km,
        duree_aller_minutes=itineraire_recommande.duree_aller_minutes,
        distance_retour_km=itineraire_recommande.distance_retour_km,
        duree_retour_minutes=itineraire_recommande.duree_retour_minutes,
        etapes=itineraire_recommande.etapes,
        cout_base=itineraire_recommande.cout_base,
        itineraires=options,
    )


@routeur.post("/public/simuler-trajet", response_model=SimulationTrajetOut)
def simuler_trajet_public(donnees: SimulationTrajetSchema):
    return simuler_trajet(donnees)


@routeur.get(
    "/missions",
    response_model=list[MissionAmbulanceOut],
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def lister_missions(db: Session = Depends(obtenir_db)):
    missions = (
        db.query(MissionAmbulance)
        .join(Ambulance)
        .options(
            contains_eager(MissionAmbulance.ambulance),
            joinedload(MissionAmbulance.lit),
            joinedload(MissionAmbulance.lit_secondaire),
        )
        .order_by(MissionAmbulance.heure_depart.desc())
        .all()
    )
    return [_sortie_mission(mission) for mission in missions]


@routeur.post(
    "/missions",
    response_model=MissionAmbulanceOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def creer_mission(
    donnees: CreationMissionAmbulanceSchema,
    utilisateur: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    mission = _creer_demande_en_attente(
        db, donnees, patient_id=None, telephone_contact=None
    )
    return _sortie_mission(mission)


@routeur.post(
    "/missions/patient",
    response_model=MissionAmbulanceOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.PATIENT))],
)
def creer_mission_patient(
    donnees: DonneesMissionAmbulanceSchema,
    utilisateur: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    patient = utilisateur.patient
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aucun profil patient n'est associé à ce compte.",
        )
    donnees_patient = donnees.model_copy(
        update={"patient": f"{patient.prenoms} {patient.nom}".strip()}
    )
    mission = _creer_demande_en_attente(
        db,
        donnees_patient,
        patient_id=patient.id,
        telephone_contact=patient.telephone,
    )
    return _sortie_mission(mission)


@routeur.post(
    "/public/missions",
    response_model=DemandeAmbulanceInviteOut,
    status_code=status.HTTP_201_CREATED,
)
def creer_mission_invite(
    donnees: CreationDemandeAmbulanceInviteSchema,
    db: Session = Depends(obtenir_db),
):
    jeton_suivi = secrets.token_urlsafe(32)
    mission = _creer_demande_en_attente(
        db,
        donnees,
        patient_id=None,
        telephone_contact=donnees.telephone_contact,
        jeton_suivi_hash=hashlib.sha256(jeton_suivi.encode("utf-8")).hexdigest(),
    )
    return DemandeAmbulanceInviteOut(mission=_sortie_mission(mission), jeton_suivi=jeton_suivi)


@routeur.post(
    "/public/missions/urgence",
    response_model=DemandeAmbulanceInviteOut,
    status_code=status.HTTP_201_CREATED,
)
def creer_mission_urgente_invite(
    donnees: DemandeAmbulanceUrgenteSchema,
    db: Session = Depends(obtenir_db),
):
    donnees_mission = _donnees_mission_urgente(donnees, "Patient non renseigné")
    jeton_suivi = secrets.token_urlsafe(32)
    mission = _creer_demande_en_attente(
        db,
        donnees_mission,
        patient_id=None,
        telephone_contact=donnees.telephone_contact,
        jeton_suivi_hash=hashlib.sha256(jeton_suivi.encode("utf-8")).hexdigest(),
    )
    return DemandeAmbulanceInviteOut(mission=_sortie_mission(mission), jeton_suivi=jeton_suivi)


@routeur.post(
    "/missions/patient/urgence",
    response_model=MissionAmbulanceOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.PATIENT))],
)
def creer_mission_urgente_patient(
    donnees: DemandeAmbulanceUrgenteSchema,
    utilisateur: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    patient = utilisateur.patient
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aucun profil patient n'est associé à ce compte.",
        )
    donnees_mission = _donnees_mission_urgente(
        donnees,
        f"{patient.prenoms} {patient.nom}".strip(),
    )
    return _creer_demande_en_attente(
        db,
        donnees_mission,
        patient_id=patient.id,
        telephone_contact=donnees.telephone_contact,
    )


@routeur.get(
    "/missions/demandes-en-attente",
    response_model=list[MissionAmbulanceOut],
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def lister_demandes_ambulance_en_attente(db: Session = Depends(obtenir_db)):
    demandes = (
        db.query(MissionAmbulance)
        .filter(MissionAmbulance.statut == StatutMissionAmbulance.EN_ATTENTE_CONFIRMATION.value)
        .order_by(MissionAmbulance.urgence_vitale.desc(), MissionAmbulance.heure_depart.asc())
        .all()
    )
    return [_sortie_mission(demande) for demande in demandes]


@routeur.post(
    "/missions/{mission_id}/confirmer",
    response_model=MissionAmbulanceOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def confirmer_demande_ambulance(
    mission_id: uuid.UUID,
    donnees: ConfirmationDemandeAmbulanceSchema,
    db: Session = Depends(obtenir_db),
):
    demande = (
        db.query(MissionAmbulance)
        .filter(MissionAmbulance.id == mission_id)
        .with_for_update()
        .one_or_none()
    )
    if demande is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable.")
    if demande.statut != StatutMissionAmbulance.EN_ATTENTE_CONFIRMATION.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette demande a déjà été traitée.")
    ambulance = (
        db.query(Ambulance)
        .filter(Ambulance.id == donnees.ambulance_id)
        .with_for_update()
        .one_or_none()
    )
    if ambulance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambulance introuvable.")
    if ambulance.statut != StatutAmbulance.DISPONIBLE:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette ambulance n'est plus disponible.")
    _affecter_ambulance_a_demande(db, demande, ambulance)
    return _sortie_mission(demande)


@routeur.post(
    "/missions/{mission_id}/refuser",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def refuser_demande_ambulance(
    mission_id: uuid.UUID,
    donnees: RefusDemandeAmbulanceSchema,
    db: Session = Depends(obtenir_db),
):
    demande = (
        db.query(MissionAmbulance)
        .filter(MissionAmbulance.id == mission_id)
        .with_for_update()
        .one_or_none()
    )
    if demande is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable.")
    if demande.statut != StatutMissionAmbulance.EN_ATTENTE_CONFIRMATION.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette demande a déjà été traitée.")
    motifs_message = []
    if "lit_indisponible" in donnees.motifs:
        if demande.urgence_vitale:
            precisions_lit = "lit de déchocage (urgence vitale)"
            if demande.patient_infectieux:
                precisions_lit += " et de salle septique"
        elif demande.patient_infectieux:
            precisions_lit = "lit de salle septique"
        else:
            precisions_lit = "lit d'urgence"
        motifs_message.append(f"manque de {precisions_lit}")
    if "ambulance_indisponible" in donnees.motifs:
        motifs_message.append("manque d'ambulance disponible")

    message = f"Nous ne pouvons pas procéder à votre demande en raison de {' et '.join(motifs_message)}."

    message += (
        "\nVeuillez contacter l'un de ces établissements :\n"
        "- CHU HJRA (Anosy) : +261 20 22 279 79 ou +261 33 11 890 58\n"
        "- Ambulance Municipale (Commune d'Antananarivo) : +261 20 22 200 40"
    )

    demande.statut = StatutMissionAmbulance.ANNULEE.value
    demande.message_refus = message
    db.commit()


@routeur.get(
    "/patients-pour-rattachement",
    response_model=list[PatientRattachementAmbulanceOut],
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def lister_patients_pour_rattachement(db: Session = Depends(obtenir_db)):
    patients = db.query(Patient).order_by(Patient.nom, Patient.prenoms).all()
    return [
        PatientRattachementAmbulanceOut(id=patient.id, nom=patient.nom, prenoms=patient.prenoms)
        for patient in patients
    ]


@routeur.post(
    "/missions/{mission_id}/rattacher-patient",
    response_model=MissionAmbulanceOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def rattacher_mission_au_patient(
    mission_id: uuid.UUID,
    donnees: RattacherDemandeAmbulanceSchema,
    db: Session = Depends(obtenir_db),
):
    mission = (
        db.query(MissionAmbulance)
        .filter(MissionAmbulance.id == mission_id)
        .with_for_update()
        .one_or_none()
    )
    if mission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission introuvable.")
    if mission.patient_id is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette mission est déjà rattachée à un patient.")

    patient = db.query(Patient).filter(Patient.id == donnees.patient_id).one_or_none()
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier patient introuvable.")
    if not donnees.identite_verifiee:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Vérifiez l'identité du patient avant le rattachement.",
        )

    _appliquer_rattachement_patient(db, mission, patient)

    db.commit()
    db.refresh(mission)
    return _sortie_mission(mission)


def _normaliser_telephone_pour_correspondance(valeur: str | None) -> str | None:
    if not valeur:
        return None
    chiffres = "".join(caractere for caractere in valeur if caractere.isdigit())
    return chiffres or None


def _normaliser_nom_pour_correspondance(valeur: str | None) -> str | None:
    if not valeur:
        return None
    valeur = " ".join(valeur.strip().lower().split())
    return valeur or None


def _rattacher_mission_au_patient_existant(
    db: Session,
    mission: MissionAmbulance,
    *,
    patient_nom: str | None = None,
    telephone_contact: str | None = None,
) -> Patient | None:
    if mission.patient_id is not None:
        return None

    telephone_normalise = _normaliser_telephone_pour_correspondance(telephone_contact or mission.telephone_contact)
    nom_normalise = _normaliser_nom_pour_correspondance(patient_nom or mission.patient)

    if not hasattr(db, "query"):
        return None

    patients = db.query(Patient).all()
    if telephone_normalise:
        for patient in patients:
            if _normaliser_telephone_pour_correspondance(patient.telephone) == telephone_normalise:
                return patient

    if nom_normalise:
        correspondances = []
        for patient in patients:
            nom_patient = _normaliser_nom_pour_correspondance(f"{patient.prenoms} {patient.nom}")
            if nom_patient == nom_normalise:
                correspondances.append(patient)
        if len(correspondances) == 1:
            return correspondances[0]

    return None


def _appliquer_rattachement_patient(
    db: Session,
    mission: MissionAmbulance,
    patient: Patient,
) -> None:
    mission.patient_id = patient.id
    mission.prenoms_patient = patient.prenoms
    mission.nom_patient = patient.nom
    if not mission.telephone_contact:
        mission.telephone_contact = patient.telephone
    mission.jeton_suivi_hash = None

    lits_ids = [identifiant for identifiant in (mission.lit_id, mission.lit_secondaire_id) if identifiant]
    if lits_ids:
        lits = (
            db.query(Lit)
            .filter(Lit.id.in_(lits_ids))
            .order_by(Lit.id)
            .with_for_update()
            .all()
        )
        for lit in lits:
            if lit.mission_reservation_id == mission.id or (
                lit.statut == StatutLit.OCCUPE and lit.patient_id is None
            ):
                lit.patient_id = patient.id
                lit.nom_patient_actuel = patient.nom
                lit.prenoms_patient_actuel = patient.prenoms


def _creer_demande_en_attente(
    db: Session,
    donnees: DonneesMissionAmbulanceSchema,
    *,
    patient_id: uuid.UUID | None,
    telephone_contact: str | None,
    jeton_suivi_hash: str | None = None,
) -> MissionAmbulance:
    try:
        itineraires = _calculer_itineraires_destination(donnees)
    except DestinationIntrouvable as erreur:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(erreur)) from erreur
    except ServiceItineraireIndisponible as erreur:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(erreur)) from erreur

    if donnees.itineraire_index >= len(itineraires):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="L'itinéraire choisi n'est plus disponible. Veuillez relancer la simulation.",
        )
    itineraire = itineraires[donnees.itineraire_index]
    parties_patient = donnees.patient.strip().split(maxsplit=1)
    demande = MissionAmbulance(
        id=uuid.uuid4(),
        ambulance_id=None,
        patient_id=patient_id,
        nom_patient=parties_patient[-1] if len(parties_patient) > 1 else "",
        prenoms_patient=parties_patient[0] if parties_patient else "",
        adresse_destination=donnees.destination.strip(),
        adresse_patient=donnees.destination.strip(),
        latitude_destination=itineraire.aller.latitude_destination,
        longitude_destination=itineraire.aller.longitude_destination,
        distance_km=itineraire.distance_km,
        itineraire_index=donnees.itineraire_index,
        distance_aller_km=itineraire.aller.distance_km,
        duree_aller_minutes=itineraire.aller.duree_estimee_minutes,
        distance_retour_km=itineraire.retour.distance_km,
        duree_retour_minutes=itineraire.retour.duree_estimee_minutes,
        urgence_vitale=donnees.urgence_vitale,
        patient_infectieux=donnees.patient_infectieux,
        motif_infectieux=donnees.motif_infectieux.strip() if donnees.motif_infectieux else None,
        telephone_contact=telephone_contact,
        jeton_suivi_hash=jeton_suivi_hash,
        tarif_base=cout_base_pour_distance(itineraire.distance_km),
        frais_retard=0,
        montant_total=cout_base_pour_distance(itineraire.distance_km),
        statut=StatutMissionAmbulance.EN_ATTENTE_CONFIRMATION.value,
        heure_depart=datetime.now(timezone.utc),
    )
    patient_existant = _rattacher_mission_au_patient_existant(
        db,
        demande,
        patient_nom=donnees.patient,
        telephone_contact=telephone_contact,
    )
    if patient_existant is not None:
        _appliquer_rattachement_patient(db, demande, patient_existant)

    db.add(demande)
    db.commit()
    db.refresh(demande)
    return demande


def _affecter_ambulance_a_demande(
    db: Session,
    demande: MissionAmbulance,
    ambulance: Ambulance,
) -> None:
    donnees = DonneesMissionAmbulanceSchema(
        patient=demande.patient,
        destination=demande.destination,
        latitude_destination=demande.latitude_destination,
        longitude_destination=demande.longitude_destination,
        distance_km=demande.distance_km,
        itineraire_index=demande.itineraire_index,
        urgence_vitale=demande.urgence_vitale,
        patient_infectieux=demande.patient_infectieux,
        motif_infectieux=demande.motif_infectieux,
    )
    try:
        itineraires = _calculer_itineraires_destination(donnees)
    except DestinationIntrouvable as erreur:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(erreur)) from erreur
    except ServiceItineraireIndisponible as erreur:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(erreur)) from erreur
    if demande.itineraire_index >= len(itineraires):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="L'itinéraire sélectionné n'est plus disponible pour cette demande.",
        )

    categories_reservees = []
    if demande.urgence_vitale:
        categories_reservees.append(CategorieLit.DECHOCAGE)
    if demande.patient_infectieux:
        categories_reservees.append(CategorieLit.SALLE_SEPTIQUE)
    if not categories_reservees:
        categories_reservees.append(CategorieLit.URGENCE)
    lits_candidats = (
        db.query(Lit)
        .filter(Lit.categorie.in_(categories_reservees), Lit.statut == StatutLit.LIBRE)
        .order_by(Lit.categorie, Lit.numero)
        .with_for_update()
        .all()
    )
    lits = []
    for categorie in categories_reservees:
        lit = next((candidat for candidat in lits_candidats if candidat.categorie == categorie), None)
        if lit is None:
            libelle = {
                CategorieLit.DECHOCAGE: "Aucun lit de déchoquage n'est disponible.",
                CategorieLit.SALLE_SEPTIQUE: "Aucun lit de salle septique n'est disponible.",
                CategorieLit.URGENCE: "Aucun lit d'urgence n'est disponible.",
            }[categorie]
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=libelle)
        lits.append(lit)
        lits_candidats.remove(lit)

    itineraire = itineraires[demande.itineraire_index]
    maintenant = datetime.now(timezone.utc)
    lit_principal = lits[0]
    lit_secondaire = lits[1] if len(lits) > 1 else None
    cout_base = cout_base_pour_distance(itineraire.distance_km)
    demande.ambulance_id = ambulance.id
    demande.lit_id = lit_principal.id
    demande.lit_secondaire_id = lit_secondaire.id if lit_secondaire else None
    demande.distance_km = itineraire.distance_km
    demande.distance_aller_km = itineraire.aller.distance_km
    demande.duree_aller_minutes = itineraire.aller.duree_estimee_minutes
    demande.distance_retour_km = itineraire.retour.distance_km
    demande.duree_retour_minutes = itineraire.retour.duree_estimee_minutes
    demande.tarif_base = cout_base
    demande.montant_total = cout_base
    demande.statut = StatutMissionAmbulance.ASSIGNE.value
    demande.heure_depart = maintenant
    ambulance.statut = StatutAmbulance.NON_DISPONIBLE
    for lit in lits:
        lit.statut = StatutLit.RESERVE
        lit.date_reservation = maintenant
        lit.mission_reservation_id = demande.id
        lit.nom_patient_actuel = demande.nom_patient
        lit.prenoms_patient_actuel = demande.prenoms_patient
        lit.patient_id = demande.patient_id
        lit.motif_admission = f"Réservation ambulance {ambulance.numero}"
        lit.motif_infectieux = demande.motif_infectieux
    db.commit()
    db.refresh(demande)


@routeur.get("/missions/moi", response_model=list[MissionAmbulanceOut])
def lister_missions_patient(
    utilisateur: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    if utilisateur.role != RoleUtilisateur.PATIENT or utilisateur.patient is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cette consultation est réservée à l'espace patient.",
        )
    missions = (
        db.query(MissionAmbulance)
        .filter(MissionAmbulance.patient_id == utilisateur.patient.id)
        .options(
            joinedload(MissionAmbulance.ambulance),
            joinedload(MissionAmbulance.lit),
            joinedload(MissionAmbulance.lit_secondaire),
        )
        .order_by(MissionAmbulance.heure_depart.desc())
        .all()
    )
    return [_sortie_mission(mission) for mission in missions]


@routeur.get("/public/missions/{mission_id}/suivi", response_model=MissionAmbulanceOut)
def suivre_mission_invite(
    mission_id: uuid.UUID,
    jeton: str = Header(alias="X-Suivi-Ambulance"),
    db: Session = Depends(obtenir_db),
):
    mission = _obtenir_mission_invite_avec_jeton(db, mission_id, jeton)
    return _sortie_mission(mission)


@routeur.patch(
    "/public/missions/{mission_id}/completer",
    response_model=MissionAmbulanceOut,
)
def completer_mission_invite(
    mission_id: uuid.UUID,
    donnees: CompleterDemandeAmbulanceSchema,
    jeton: str = Header(alias="X-Suivi-Ambulance"),
    db: Session = Depends(obtenir_db),
):
    mission = _obtenir_mission_invite_avec_jeton(db, mission_id, jeton, verrouiller=True)
    if str(mission.statut).lower() in {
        StatutMissionAmbulance.TERMINEE.value,
        StatutMissionAmbulance.ANNULEE.value,
    }:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Les informations d'une mission terminée ou annulée ne peuvent plus être modifiées.",
        )

    if donnees.patient is not None:
        parties_patient = donnees.patient.split(maxsplit=1)
        mission.prenoms_patient = parties_patient[0]
        mission.nom_patient = parties_patient[1] if len(parties_patient) > 1 else ""
    if donnees.telephone_contact is not None:
        mission.telephone_contact = donnees.telephone_contact
    if donnees.informations_medicales is not None:
        mission.notes = donnees.informations_medicales

    db.commit()
    db.refresh(mission)
    return _sortie_mission(mission)


def _obtenir_mission_invite_avec_jeton(
    db: Session,
    mission_id: uuid.UUID,
    jeton: str,
    *,
    verrouiller: bool = False,
) -> MissionAmbulance:
    requete = db.query(MissionAmbulance).filter(
        MissionAmbulance.id == mission_id,
        MissionAmbulance.patient_id.is_(None),
        MissionAmbulance.jeton_suivi_hash.is_not(None),
    )
    if verrouiller:
        requete = requete.with_for_update()
    mission = requete.one_or_none()
    empreinte = hashlib.sha256(jeton.encode("utf-8")).hexdigest()
    if mission is None or not hmac.compare_digest(mission.jeton_suivi_hash, empreinte):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suivi introuvable ou jeton invalide.",
        )
    return mission


def _creer_mission(
    db: Session,
    donnees: DonneesMissionAmbulanceSchema,
    ambulance_id: uuid.UUID,
    *,
    patient_id: uuid.UUID | None = None,
    telephone_contact: str | None = None,
    jeton_suivi_hash: str | None = None,
):
    ambulance = (
        db.query(Ambulance)
        .filter(Ambulance.id == ambulance_id)
        .with_for_update()
        .one_or_none()
    )
    if ambulance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambulance introuvable.")
    if ambulance.statut != StatutAmbulance.DISPONIBLE:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette ambulance n'est pas disponible.")
    try:
        itineraires = _calculer_itineraires_destination(donnees)
    except DestinationIntrouvable as erreur:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(erreur)) from erreur
    except ServiceItineraireIndisponible as erreur:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(erreur)) from erreur

    if donnees.itineraire_index >= len(itineraires):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="L'itinéraire choisi n'est plus disponible. Veuillez relancer la simulation.",
        )
    itineraire = itineraires[donnees.itineraire_index]
    distance_km = itineraire.distance_km
    cout_base = cout_base_pour_distance(distance_km)
    patient = donnees.patient.strip()
    parties_patient = patient.split(maxsplit=1)
    categories_reservees = []
    if donnees.urgence_vitale:
        categories_reservees.append(CategorieLit.DECHOCAGE)
    if donnees.patient_infectieux:
        categories_reservees.append(CategorieLit.SALLE_SEPTIQUE)
    if not categories_reservees:
        categories_reservees.append(CategorieLit.URGENCE)

    lits_candidats = (
        db.query(Lit)
        .filter(Lit.categorie.in_(categories_reservees), Lit.statut == StatutLit.LIBRE)
        .order_by(Lit.categorie, Lit.numero)
        .with_for_update()
        .all()
    )
    lit_par_categorie = {}
    for categorie in categories_reservees:
        lit = next((candidat for candidat in lits_candidats if candidat.categorie == categorie), None)
        if lit is None:
            if categorie == CategorieLit.DECHOCAGE:
                detail = "Capacité de Déchocage Saturée à Soavinandriana - Admission Impossible."
            elif categorie == CategorieLit.SALLE_SEPTIQUE:
                detail = "Aucun lit de salle septique n'est disponible pour ce patient infectieux."
            else:
                detail = "Aucun lit d'urgence n'est disponible pour réserver cette mission."
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)
        lit_par_categorie[categorie] = lit
        lits_candidats.remove(lit)

    mission_id = uuid.uuid4()
    lit_principal = lit_par_categorie[categories_reservees[0]]
    lit_secondaire = lit_par_categorie[categories_reservees[1]] if len(categories_reservees) > 1 else None
    mission = MissionAmbulance(
        id=mission_id,
        ambulance_id=ambulance.id,
        lit_id=lit_principal.id,
        lit_secondaire_id=lit_secondaire.id if lit_secondaire else None,
        nom_patient=parties_patient[-1] if len(parties_patient) > 1 else "",
        prenoms_patient=parties_patient[0] if len(parties_patient) > 0 else "",
        adresse_destination=donnees.destination.strip(),
        adresse_patient=donnees.destination.strip(),
        latitude_destination=itineraire.aller.latitude_destination,
        longitude_destination=itineraire.aller.longitude_destination,
        distance_km=distance_km,
        distance_aller_km=itineraire.aller.distance_km,
        duree_aller_minutes=itineraire.aller.duree_estimee_minutes,
        distance_retour_km=itineraire.retour.distance_km,
        duree_retour_minutes=itineraire.retour.duree_estimee_minutes,
        urgence_vitale=donnees.urgence_vitale,
        patient_infectieux=donnees.patient_infectieux,
        motif_infectieux=donnees.motif_infectieux.strip() if donnees.motif_infectieux else None,
        telephone_contact=telephone_contact,
        jeton_suivi_hash=jeton_suivi_hash,
        patient_id=patient_id,
        tarif_base=cout_base,
        statut=StatutMissionAmbulance.ASSIGNE.value,
        heure_depart=datetime.now(timezone.utc),
        frais_retard=0,
        montant_total=cout_base,
        lit=lit_principal,
    )
    db.add(mission)
    db.flush()
    for lit in [lit_principal, lit_secondaire]:
        if lit is None:
            continue
        lit.statut = StatutLit.RESERVE
        lit.date_reservation = mission.heure_depart
        lit.mission_reservation_id = mission.id
        lit.nom_patient_actuel = mission.nom_patient
        lit.prenoms_patient_actuel = mission.prenoms_patient
        lit.patient_id = mission.patient_id
        lit.motif_admission = f"Réservation ambulance {ambulance.numero}"
        lit.motif_infectieux = mission.motif_infectieux
    ambulance.statut = StatutAmbulance.NON_DISPONIBLE
    db.commit()
    db.refresh(mission)
    return _sortie_mission(mission)


def _donnees_mission_urgente(
    donnees: DemandeAmbulanceUrgenteSchema,
    patient: str,
) -> DonneesMissionAmbulanceSchema:
    return DonneesMissionAmbulanceSchema(
        patient=patient,
        destination=donnees.destination,
        latitude_destination=donnees.latitude_destination,
        longitude_destination=donnees.longitude_destination,
        distance_km=1,
        urgence_vitale=donnees.urgence_vitale,
        patient_infectieux=donnees.patient_infectieux,
        motif_infectieux=(
            donnees.motif_infectieux
            or ("Non précisé lors de la demande urgente" if donnees.patient_infectieux else None)
        ),
    )


@routeur.post(
    "/missions/{mission_id}/transition",
    response_model=MissionAmbulanceOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def transitionner_mission(
    mission_id: uuid.UUID,
    donnees: TransitionMissionSchema,
    db: Session = Depends(obtenir_db),
):
    mission = (
        db.query(MissionAmbulance)
        .filter(MissionAmbulance.id == mission_id)
        .with_for_update()
        .one_or_none()
    )
    if mission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission introuvable.")

    transitions = {
        StatutMissionAmbulance.ASSIGNE: StatutMissionAmbulance.ARRIVE_URGENCES,
        StatutMissionAmbulance.SUR_LES_LIEUX: StatutMissionAmbulance.EN_TRANSPORT,
        StatutMissionAmbulance.EN_TRANSPORT: StatutMissionAmbulance.ARRIVE_URGENCES,
        StatutMissionAmbulance.ARRIVE_URGENCES: StatutMissionAmbulance.EN_BIONETTOYAGE,
        StatutMissionAmbulance.EN_BIONETTOYAGE: StatutMissionAmbulance.TERMINEE,
    }
    try:
        statut_actuel = StatutMissionAmbulance(str(mission.statut).lower())
    except ValueError:
        statut_actuel = {
            "EN_ROUTE": StatutMissionAmbulance.ASSIGNE,
            "SUR_PLACE": StatutMissionAmbulance.SUR_LES_LIEUX,
        }.get(str(mission.statut).upper())
    if statut_actuel is None or transitions.get(statut_actuel) != donnees.statut:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette transition de mission n'est pas autorisée.")

    maintenant = datetime.now(timezone.utc)
    ambulance = (
        db.query(Ambulance)
        .filter(Ambulance.id == mission.ambulance_id)
        .with_for_update()
        .one()
    )

    if donnees.statut == StatutMissionAmbulance.SUR_LES_LIEUX:
        mission.heure_arrivee_sur_lieux = maintenant
    elif donnees.statut == StatutMissionAmbulance.EN_TRANSPORT:
        mission.heure_transport = maintenant
        mission.heure_prise_en_charge = maintenant
    elif donnees.statut == StatutMissionAmbulance.ARRIVE_URGENCES:
        if statut_actuel == StatutMissionAmbulance.ASSIGNE:
            if donnees.minutes_retard is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Saisissez le retard déclaré par le chauffeur à son arrivée au centre.",
                )
            mission.minutes_retard = donnees.minutes_retard
            mission.frais_retard = calculer_frais_retard_declare(donnees.minutes_retard)
            mission.cout_total = mission.cout_base + mission.frais_retard
        lits_reserves_ids = [identifiant for identifiant in (mission.lit_id, mission.lit_secondaire_id) if identifiant]
        lits_reserves = (
            db.query(Lit)
            .filter(Lit.id.in_(lits_reserves_ids))
            .order_by(Lit.id)
            .with_for_update()
            .all()
        )
        lit_choisi_id = donnees.lit_id or (lits_reserves_ids[0] if len(lits_reserves_ids) == 1 else None)
        if lit_choisi_id not in lits_reserves_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Choisissez l'un des lits réservés à cette mission pour l'admission.",
            )
        lit_choisi = next((lit for lit in lits_reserves if lit.id == lit_choisi_id), None)
        if lit_choisi is None or lit_choisi.statut != StatutLit.RESERVE or lit_choisi.mission_reservation_id != mission.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Le lit réservé n'est plus disponible.")
        for lit in lits_reserves:
            if lit.id == lit_choisi.id:
                lit.statut = StatutLit.OCCUPE
                lit.date_occupation = maintenant
                lit.date_liberation = None
                lit.date_reservation = None
                lit.mission_reservation_id = None
                lit.motif_admission = f"Transport par ambulance {ambulance.numero}"
                lit.motif_infectieux = mission.motif_infectieux
                mission.lit_id = lit.id
                mission.lit_secondaire_id = None
                mission.lit = lit
            else:
                _liberer_reservation_ambulance(lit)
        mission.heure_arrivee_urgences = maintenant
    elif donnees.statut == StatutMissionAmbulance.EN_BIONETTOYAGE:
        if mission.heure_arrivee_urgences is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Enregistrez d'abord l'arrivée aux urgences.")
        mission.heure_bionettoyage = maintenant
        if mission.patient_infectieux and mission.lit_id is not None:
            lit = db.query(Lit).filter(Lit.id == mission.lit_id).with_for_update().one()
            if lit.categorie == CategorieLit.SALLE_SEPTIQUE and lit.statut == StatutLit.OCCUPE:
                lit.statut = StatutLit.NETTOYAGE
                lit.date_debut_nettoyage = maintenant
                lit.nom_patient_actuel = None
                lit.prenoms_patient_actuel = None
                lit.patient_id = None
                lit.motif_admission = None
                lit.date_occupation = None
                lit.date_liberation = maintenant
                lit.motif_infectieux = None
    elif donnees.statut == StatutMissionAmbulance.TERMINEE:
        if mission.patient_infectieux and mission.heure_bionettoyage is not None:
            duree_nettoyage = maintenant - mission.heure_bionettoyage
            if duree_nettoyage.total_seconds() < DELAI_BIONETTOYAGE_AMBULANCE_MINUTES * 60:
                secondes_restantes = DELAI_BIONETTOYAGE_AMBULANCE_MINUTES * 60 - int(duree_nettoyage.total_seconds())
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Bionettoyage obligatoire : attendez encore {max(1, (secondes_restantes + 59) // 60)} minute(s).",
                )
        mission.heure_fin = maintenant
        mission.minutes_sur_place = (
            max(0, int((maintenant - mission.heure_arrivee_urgences).total_seconds() // 60))
            if mission.heure_arrivee_urgences
            else None
        )
        if mission.minutes_retard is None:
            mission.minutes_retard, mission.frais_retard = calculer_frais_retard(mission.minutes_sur_place or 0)
        mission.cout_total = mission.cout_base + mission.frais_retard
        ambulance.statut = StatutAmbulance.DISPONIBLE

    mission.statut = donnees.statut.value
    db.commit()
    db.refresh(mission)
    return _sortie_mission(mission)


def _liberer_reservation_ambulance(lit: Lit) -> None:
    lit.statut = StatutLit.LIBRE
    lit.date_reservation = None
    lit.mission_reservation_id = None
    lit.nom_patient_actuel = None
    lit.prenoms_patient_actuel = None
    lit.patient_id = None
    lit.motif_admission = None
    lit.motif_infectieux = None


@routeur.post(
    "/missions/{mission_id}/arrivee",
    response_model=MissionAmbulanceOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def enregistrer_arrivee(mission_id: uuid.UUID, db: Session = Depends(obtenir_db)):
    mission = (
        db.query(MissionAmbulance)
        .filter(MissionAmbulance.id == mission_id)
        .with_for_update()
        .one_or_none()
    )
    if mission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission introuvable.")
    if str(mission.statut).upper() not in {"EN_ROUTE", "SUR_PLACE"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette mission est déjà terminée.")
    if mission.heure_arrivee is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="L'arrivée a déjà été enregistrée.")

    mission.heure_arrivee_sur_lieux = datetime.now(timezone.utc)
    mission.statut = "SUR_PLACE"
    db.commit()
    db.refresh(mission)
    return _sortie_mission(mission)


@routeur.post(
    "/missions/{mission_id}/prise-en-charge",
    response_model=MissionAmbulanceOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def enregistrer_prise_en_charge(
    mission_id: uuid.UUID,
    donnees: PriseEnChargeAmbulanceSchema,
    db: Session = Depends(obtenir_db),
):
    mission = (
        db.query(MissionAmbulance)
        .filter(MissionAmbulance.id == mission_id)
        .with_for_update()
        .one_or_none()
    )
    if mission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission introuvable.")
    if str(mission.statut).upper() not in {"EN_ROUTE", "SUR_PLACE"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette mission est déjà terminée.")
    if mission.heure_arrivee is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Enregistrez d'abord l'arrivée sur les lieux.")
    if mission.heure_prise_en_charge is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="La prise en charge a déjà été enregistrée.")

    heure_prise_en_charge = datetime.now(timezone.utc)
    minutes_sur_place = donnees.minutes_sur_place
    mission.heure_prise_en_charge = heure_prise_en_charge
    mission.minutes_sur_place = minutes_sur_place
    mission.minutes_retard, mission.frais_retard = calculer_frais_retard(minutes_sur_place)
    mission.cout_total = mission.cout_base + mission.frais_retard

    db.commit()
    db.refresh(mission)
    return _sortie_mission(mission)


@routeur.post(
    "/missions/{mission_id}/terminer",
    response_model=MissionAmbulanceOut,
    dependencies=[Depends(exiger_roles(*ROLES_ACCES))],
)
def terminer_mission(
    mission_id: uuid.UUID,
    donnees: RetourCentreAmbulanceSchema,
    db: Session = Depends(obtenir_db),
):
    mission = (
        db.query(MissionAmbulance)
        .filter(MissionAmbulance.id == mission_id)
        .with_for_update()
        .one_or_none()
    )
    if mission is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mission introuvable.")
    if str(mission.statut).upper() not in {"EN_ROUTE", "SUR_PLACE"}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cette mission est déjà terminée.")

    ambulance = (
        db.query(Ambulance)
        .filter(Ambulance.id == mission.ambulance_id)
        .with_for_update()
        .one()
    )
    lit = None
    if donnees.lit_id is not None:
        lit = (
            db.query(Lit)
            .filter(Lit.id == donnees.lit_id)
            .with_for_update()
            .one_or_none()
        )
        if lit is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lit d'urgence introuvable.")
        if lit.categorie != CategorieLit.URGENCE:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Seuls les lits de catégorie Urgence peuvent être attribués à cette course.",
            )
        if lit.statut != StatutLit.LIBRE:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce lit d'urgence n'est plus libre.")

    heure_retour = datetime.now(timezone.utc)
    mission.minutes_sur_place = donnees.minutes_sur_place
    mission.lit_id = lit.id if lit else None
    mission.lit = lit
    mission.minutes_retard, mission.frais_retard = calculer_frais_retard(donnees.minutes_sur_place)
    mission.cout_total = mission.cout_base + mission.frais_retard
    mission.statut = "TERMINEE"
    mission.heure_fin = heure_retour
    ambulance.statut = StatutAmbulance.DISPONIBLE
    if lit is not None:
        lit.statut = StatutLit.OCCUPE
        lit.nom_patient_actuel = mission.nom_patient
        lit.prenoms_patient_actuel = mission.prenoms_patient
        lit.patient_id = mission.patient_id
        lit.motif_admission = f"Transport par ambulance {ambulance.numero}"
        lit.date_occupation = heure_retour
        lit.date_liberation = None

    db.commit()
    db.refresh(mission)
    return _sortie_mission(mission)