"""API de demande et de suivi des rendez-vous médicaux."""
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import extract, func, or_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import exiger_roles, obtenir_utilisateur_courant
from app.db.session import obtenir_db
from app.models.enums import RoleUtilisateur
from app.models.patient import Patient
from app.models.rendez_vous import CreneauMedecin, RendezVous
from app.models.service import Service
from app.models.utilisateur import Utilisateur
from app.schemas.rendez_vous import (
    AffectationPatientCreneauSchema,
    CreationCreneauSchema,
    CreationRendezVousSchema,
    CreneauOut,
    ModificationCreneauSchema,
    ModificationRendezVousSchema,
    PatientCreneauOut,
    ReservationCreneauSchema,
    RendezVousOut,
    StatistiquesRendezVousOut,
)

routeur = APIRouter(prefix="/rendez-vous", tags=["Rendez-vous"])
STATUTS_ACTIFS = {"en_attente", "confirme"}


def _convertir_sortie(rendez_vous: RendezVous, patient: Patient) -> RendezVousOut:
    return RendezVousOut(
        id=rendez_vous.id,
        patient_id=rendez_vous.patient_id,
        patient_nom=patient.nom,
        patient_prenoms=patient.prenoms,
        patient_telephone=patient.telephone or "",
        service_id=rendez_vous.service_id,
        service_nom=rendez_vous.service_nom,
        creneau_id=rendez_vous.creneau_id,
        numero_file=rendez_vous.numero_file,
        date_souhaitee=rendez_vous.date_souhaitee,
        date_confirmee=rendez_vous.date_confirmee,
        date_confirmee_vue=rendez_vous.date_confirmee_vue,
        motif=rendez_vous.motif,
        statut=rendez_vous.statut,
        commentaire=rendez_vous.commentaire,
        date_creation=rendez_vous.date_creation,
        date_modification=rendez_vous.date_modification,
    )


def _query_sortie(db: Session, utilisateur_courant: Utilisateur):
    requete = (
        db.query(RendezVous, Patient)
        .join(Patient, RendezVous.patient_id == Patient.id)
    )
    if utilisateur_courant.role == RoleUtilisateur.PATIENT:
        if utilisateur_courant.patient is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profil patient introuvable.")
        requete = requete.filter(RendezVous.patient_id == utilisateur_courant.patient.id)
    else:
        service_personnel = utilisateur_courant.personnel.service if utilisateur_courant.personnel else None
        if not service_personnel:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Aucun service n'est associé à ce compte.")
        requete = requete.filter(RendezVous.service_nom == service_personnel)
    return requete


@routeur.get(
    "",
    response_model=list[RendezVousOut],
    dependencies=[
        Depends(exiger_roles(
            RoleUtilisateur.PATIENT,
            RoleUtilisateur.SECRETAIRE,
            RoleUtilisateur.MEDECIN,
        ))
    ],
)
def lister_rendez_vous(
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    requete = _query_sortie(db, utilisateur_courant)
    if utilisateur_courant.role == RoleUtilisateur.PATIENT:
        requete = requete.order_by(RendezVous.date_creation.desc())
    else:
        requete = requete.order_by(
            RendezVous.date_souhaitee.asc(),
            RendezVous.numero_file.asc().nullslast(),
            RendezVous.date_creation.asc(),
        )
    lignes = requete.all()
    return [_convertir_sortie(rdv, patient) for rdv, patient in lignes]


@routeur.get(
    "/statistiques",
    response_model=StatistiquesRendezVousOut,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def obtenir_statistiques_rendez_vous(db: Session = Depends(obtenir_db)):
    statuts = dict(
        db.query(RendezVous.statut, func.count(RendezVous.id))
        .group_by(RendezVous.statut)
        .all()
    )

    maintenant = datetime.now(timezone.utc)
    index_premier_mois = maintenant.year * 12 + maintenant.month - 1 - 5
    debut_periode = datetime(
        index_premier_mois // 12,
        index_premier_mois % 12 + 1,
        1,
        tzinfo=timezone.utc,
    )
    debut_mois_suivant = (
        datetime(maintenant.year + 1, 1, 1, tzinfo=timezone.utc)
        if maintenant.month == 12
        else datetime(maintenant.year, maintenant.month + 1, 1, tzinfo=timezone.utc)
    )
    date_rendez_vous = func.coalesce(RendezVous.date_confirmee, RendezVous.date_souhaitee)
    lignes_mensuelles = (
        db.query(
            extract("year", date_rendez_vous),
            extract("month", date_rendez_vous),
            func.count(RendezVous.id),
        )
        .filter(date_rendez_vous >= debut_periode, date_rendez_vous < debut_mois_suivant)
        .group_by(
            extract("year", date_rendez_vous),
            extract("month", date_rendez_vous),
        )
        .all()
    )
    totaux_mensuels = {
        (int(annee), int(mois)): total
        for annee, mois, total in lignes_mensuelles
    }
    mensuel = []
    for decalage in range(6):
        index_mois = index_premier_mois + decalage
        annee = index_mois // 12
        mois = index_mois % 12 + 1
        mensuel.append({
            "annee": annee,
            "mois": mois,
            "total": totaux_mensuels.get((annee, mois), 0),
        })

    return {
        "total": sum(statuts.values()),
        "statuts": statuts,
        "mensuel": mensuel,
    }


@routeur.post(
    "/{rendez_vous_id}/notification-lue",
    response_model=RendezVousOut,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.PATIENT))],
)
def marquer_notification_rendez_vous_lue(
    rendez_vous_id: uuid.UUID,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    rendez_vous = db.get(RendezVous, rendez_vous_id)
    if (
        rendez_vous is None
        or utilisateur_courant.patient is None
        or rendez_vous.patient_id != utilisateur_courant.patient.id
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rendez-vous introuvable.")
    if rendez_vous.statut != "confirme" or rendez_vous.date_confirmee is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce rendez-vous ne possède pas de confirmation à consulter.",
        )

    rendez_vous.date_confirmee_vue = rendez_vous.date_confirmee
    db.commit()
    db.refresh(rendez_vous)
    return _convertir_sortie(rendez_vous, utilisateur_courant.patient)


def _verifier_service_personnel(utilisateur: Utilisateur, service: Service) -> None:
    service_personnel = utilisateur.personnel.service if utilisateur.personnel else None
    if not service_personnel or service.nom != service_personnel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service introuvable.")


def _ajouter_patient_au_creneau(
    db: Session,
    creneau: CreneauMedecin,
    service: Service,
    patient: Patient,
    motif: str,
) -> RendezVous:
    reservation_existante = (
        db.query(RendezVous)
        .filter(
            RendezVous.patient_id == patient.id,
            RendezVous.service_id == service.id,
            RendezVous.statut.in_(STATUTS_ACTIFS),
        )
        .first()
    )
    if reservation_existante:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce patient a déjà un rendez-vous actif dans ce service.",
        )

    numero_file = db.execute(
        update(CreneauMedecin)
        .where(CreneauMedecin.id == creneau.id)
        .values(dernier_numero_file=CreneauMedecin.dernier_numero_file + 1)
        .returning(CreneauMedecin.dernier_numero_file)
    ).scalar_one()
    rendez_vous = RendezVous(
        patient_id=patient.id,
        service_id=service.id,
        creneau_id=creneau.id,
        numero_file=numero_file,
        service_nom=service.nom,
        date_souhaitee=creneau.date_heure,
        motif=motif,
        statut="en_attente",
    )
    db.add(rendez_vous)
    return rendez_vous


def _sortie_creneau(db: Session, creneau: CreneauMedecin, service: Service) -> CreneauOut:
    nombre_patients = (
        db.query(RendezVous)
        .filter(
            RendezVous.creneau_id == creneau.id,
            RendezVous.statut.notin_(("annule", "refuse")),
        )
        .count()
    )
    return CreneauOut(
        id=creneau.id,
        service_id=service.id,
        service_nom=service.nom,
        date_heure=creneau.date_heure,
        date_fin=creneau.date_fin,
        est_ouvert=creneau.est_ouvert,
        nombre_patients=nombre_patients,
    )


@routeur.get(
    "/patients",
    response_model=list[PatientCreneauOut],
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SECRETAIRE, RoleUtilisateur.MEDECIN))],
)
def lister_patients_pour_creneau(
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    service_personnel = utilisateur_courant.personnel.service if utilisateur_courant.personnel else None
    if not service_personnel:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Aucun service n'est associé à ce compte.")
    lignes = db.query(Patient).order_by(Patient.nom, Patient.prenoms).all()
    return [
        PatientCreneauOut(
            id=patient.id,
            nom=patient.nom,
            prenoms=patient.prenoms,
            telephone=patient.telephone or "",
        )
        for patient in lignes
    ]


@routeur.get(
    "/creneaux",
    response_model=list[CreneauOut],
    dependencies=[
        Depends(exiger_roles(
            RoleUtilisateur.PATIENT,
            RoleUtilisateur.SECRETAIRE,
            RoleUtilisateur.MEDECIN,
        ))
    ],
)
def lister_creneaux(
    service_id: uuid.UUID | None = None,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    requete = (
        db.query(CreneauMedecin, Service)
        .join(Service, CreneauMedecin.service_id == Service.id)
        .filter(Service.est_actif.is_(True))
    )
    if utilisateur_courant.role == RoleUtilisateur.PATIENT:
        if utilisateur_courant.patient is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profil patient introuvable.")
        requete = requete.filter(CreneauMedecin.date_heure > datetime.now(timezone.utc))
    else:
        service_personnel = utilisateur_courant.personnel.service if utilisateur_courant.personnel else None
        if not service_personnel:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Aucun service n'est associé à ce compte.")
        requete = requete.filter(Service.nom == service_personnel)
    if service_id is not None:
        requete = requete.filter(CreneauMedecin.service_id == service_id)
    lignes = requete.order_by(CreneauMedecin.date_heure.asc()).all()
    return [_sortie_creneau(db, creneau, service) for creneau, service in lignes]


@routeur.post(
    "/creneaux",
    response_model=CreneauOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SECRETAIRE, RoleUtilisateur.MEDECIN))],
)
def creer_creneau(
    donnees: CreationCreneauSchema,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    service = db.get(Service, donnees.service_id)
    if service is None or not service.est_actif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service actif introuvable.")
    _verifier_service_personnel(utilisateur_courant, service)
    doublon = (
        db.query(CreneauMedecin)
        .filter(
            CreneauMedecin.service_id == service.id,
            CreneauMedecin.date_heure == donnees.date_heure,
        )
        .first()
    )
    if doublon:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Un créneau existe déjà à cette date.")

    creneau = CreneauMedecin(
        service_id=service.id,
        date_heure=donnees.date_heure,
        date_fin=donnees.date_fin,
        est_ouvert=True,
    )
    db.add(creneau)
    try:
        db.flush()
        if donnees.patient_id is not None:
            patient = db.get(Patient, donnees.patient_id)
            if patient is None:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable.")
            _ajouter_patient_au_creneau(db, creneau, service, patient, donnees.motif)
        db.commit()
    except IntegrityError as erreur:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce créneau ou cette réservation existe déjà.") from erreur
    db.refresh(creneau)
    return _sortie_creneau(db, creneau, service)


@routeur.patch(
    "/creneaux/{creneau_id}",
    response_model=CreneauOut,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SECRETAIRE, RoleUtilisateur.MEDECIN))],
)
def modifier_creneau(
    creneau_id: uuid.UUID,
    donnees: ModificationCreneauSchema,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    creneau = db.get(CreneauMedecin, creneau_id)
    if creneau is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Créneau introuvable.")
    service = db.get(Service, creneau.service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service introuvable.")
    _verifier_service_personnel(utilisateur_courant, service)
    if donnees.date_heure is not None:
        if creneau.date_heure <= datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Un créneau passé ne peut pas être modifié.")
        doublon = (
            db.query(CreneauMedecin)
            .filter(
                CreneauMedecin.service_id == service.id,
                CreneauMedecin.date_heure == donnees.date_heure,
                CreneauMedecin.id != creneau.id,
            )
            .first()
        )
        if doublon:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Un créneau existe déjà à cette date.")

        decalage = donnees.date_heure - creneau.date_heure
        rendez_vous_actifs = (
            db.query(RendezVous)
            .filter(
                RendezVous.creneau_id == creneau.id,
                RendezVous.statut.in_(STATUTS_ACTIFS),
            )
            .all()
        )
        for rendez_vous in rendez_vous_actifs:
            if rendez_vous.statut == "confirme" and rendez_vous.date_confirmee is not None:
                nouvelle_date_confirmee = rendez_vous.date_confirmee + decalage
                conflit = (
                    db.query(RendezVous)
                    .filter(
                        RendezVous.service_id == service.id,
                        RendezVous.date_confirmee == nouvelle_date_confirmee,
                        RendezVous.statut == "confirme",
                        or_(
                            RendezVous.creneau_id.is_(None),
                            RendezVous.creneau_id != creneau.id,
                        ),
                    )
                    .first()
                )
                if conflit:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Le déplacement du créneau entrerait en conflit avec un autre rendez-vous confirmé.",
                    )
                rendez_vous.date_confirmee = nouvelle_date_confirmee
                rendez_vous.date_confirmee_vue = None
            rendez_vous.date_souhaitee += decalage
        creneau.date_heure = donnees.date_heure
        creneau.date_fin = donnees.date_fin
    if donnees.est_ouvert is not None:
        if donnees.est_ouvert and creneau.date_heure <= datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Un créneau passé ne peut pas être rouvert.")
        creneau.est_ouvert = donnees.est_ouvert
    try:
        db.commit()
    except IntegrityError as erreur:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un créneau ou un rendez-vous existe déjà à ces horaires.",
        ) from erreur
    db.refresh(creneau)
    return _sortie_creneau(db, creneau, service)


@routeur.post(
    "/creneaux/{creneau_id}/patients",
    response_model=RendezVousOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SECRETAIRE, RoleUtilisateur.MEDECIN))],
)
def ajouter_patient_creneau(
    creneau_id: uuid.UUID,
    donnees: AffectationPatientCreneauSchema,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    creneau = (
        db.query(CreneauMedecin)
        .filter(CreneauMedecin.id == creneau_id)
        .with_for_update()
        .first()
    )
    if creneau is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Créneau introuvable.")
    service = db.get(Service, creneau.service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service introuvable.")
    _verifier_service_personnel(utilisateur_courant, service)
    if not creneau.est_ouvert or creneau.date_heure <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce créneau est fermé ou passé.")
    patient = db.get(Patient, donnees.patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable.")
    rendez_vous = _ajouter_patient_au_creneau(db, creneau, service, patient, donnees.motif)
    try:
        db.commit()
    except IntegrityError as erreur:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un rendez-vous actif existe déjà pour ce patient dans ce service.",
        ) from erreur
    db.refresh(rendez_vous)
    return _convertir_sortie(rendez_vous, patient)


@routeur.post(
    "/creneaux/{creneau_id}/reservations",
    response_model=RendezVousOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.PATIENT))],
)
def reserver_creneau(
    creneau_id: uuid.UUID,
    donnees: ReservationCreneauSchema,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    patient = utilisateur_courant.patient
    if patient is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profil patient introuvable.")
    creneau = (
        db.query(CreneauMedecin)
        .filter(CreneauMedecin.id == creneau_id)
        .with_for_update()
        .first()
    )
    if creneau is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Créneau introuvable.")
    service = db.get(Service, creneau.service_id)
    if service is None or not service.est_actif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service actif introuvable.")
    if not creneau.est_ouvert or creneau.date_heure <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce créneau n'est plus disponible.")

    rendez_vous = _ajouter_patient_au_creneau(db, creneau, service, patient, donnees.motif)
    try:
        db.commit()
    except IntegrityError as erreur:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un rendez-vous actif existe déjà pour ce patient dans ce service.",
        ) from erreur
    db.refresh(rendez_vous)
    return _convertir_sortie(rendez_vous, patient)


@routeur.post(
    "",
    response_model=RendezVousOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.PATIENT))],
)
def creer_rendez_vous(
    donnees: CreationRendezVousSchema,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    patient = utilisateur_courant.patient
    if patient is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profil patient introuvable.")
    service = db.get(Service, donnees.service_id)
    if service is None or not service.est_actif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service actif introuvable.")

    reservation_existante = (
        db.query(RendezVous)
        .filter(
            RendezVous.patient_id == patient.id,
            RendezVous.service_id == service.id,
            RendezVous.statut.in_(STATUTS_ACTIFS),
        )
        .first()
    )
    if reservation_existante:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vous avez déjà un rendez-vous actif dans ce service.",
        )

    rendez_vous = RendezVous(
        patient_id=patient.id,
        service_id=service.id,
        service_nom=service.nom,
        date_souhaitee=donnees.date_souhaitee,
        motif=donnees.motif,
        statut="en_attente",
    )
    db.add(rendez_vous)
    try:
        db.commit()
    except IntegrityError as erreur:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vous avez déjà un rendez-vous actif dans ce service.",
        ) from erreur
    db.refresh(rendez_vous)
    return _convertir_sortie(rendez_vous, patient)


@routeur.patch(
    "/{rendez_vous_id}",
    response_model=RendezVousOut,
    dependencies=[
        Depends(exiger_roles(
            RoleUtilisateur.PATIENT,
            RoleUtilisateur.SECRETAIRE,
            RoleUtilisateur.MEDECIN,
        ))
    ],
)
def modifier_rendez_vous(
    rendez_vous_id: uuid.UUID,
    donnees: ModificationRendezVousSchema,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    rendez_vous = db.get(RendezVous, rendez_vous_id)
    if rendez_vous is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rendez-vous introuvable.")

    if utilisateur_courant.role == RoleUtilisateur.PATIENT:
        if utilisateur_courant.patient is None or rendez_vous.patient_id != utilisateur_courant.patient.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rendez-vous introuvable.")
        if donnees.statut != "annule" or rendez_vous.statut not in STATUTS_ACTIFS:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce rendez-vous ne peut plus être annulé.")
        rendez_vous.statut = "annule"
    elif utilisateur_courant.role in {RoleUtilisateur.SECRETAIRE, RoleUtilisateur.MEDECIN}:
        service_personnel = utilisateur_courant.personnel.service if utilisateur_courant.personnel else None
        if not service_personnel or rendez_vous.service_nom != service_personnel:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rendez-vous introuvable.")

        if utilisateur_courant.role == RoleUtilisateur.MEDECIN:
            transitions_autorisees = {
                "en_attente": {"confirme", "refuse", "annule"},
                "confirme": {"confirme", "annule"},
            }
        else:
            transitions_autorisees = {
                "en_attente": {"refuse", "annule"},
                "confirme": {"arrive", "absent", "annule"},
                "arrive": {"termine"},
            }
        if donnees.statut not in transitions_autorisees.get(rendez_vous.statut, set()):
            if utilisateur_courant.role == RoleUtilisateur.SECRETAIRE and donnees.statut == "confirme":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Seul le médecin du service peut confirmer ou modifier le créneau.",
                )
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Transition de statut non autorisée.")

        if donnees.statut == "confirme":
            date_confirmee = donnees.date_confirmee
            if date_confirmee is None or date_confirmee <= datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="La date de confirmation doit être dans le futur.",
                )
            requete_conflit = (
                db.query(RendezVous)
                .filter(
                    RendezVous.service_id == rendez_vous.service_id,
                    RendezVous.date_confirmee == date_confirmee,
                    RendezVous.statut == "confirme",
                    RendezVous.id != rendez_vous.id,
                )
            )
            if rendez_vous.creneau_id is not None:
                requete_conflit = requete_conflit.filter(
                    or_(
                        RendezVous.creneau_id.is_(None),
                        RendezVous.creneau_id != rendez_vous.creneau_id,
                    )
                )
            conflit = requete_conflit.first()
            if conflit:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Un rendez-vous est déjà confirmé pour ce service à cette date.",
                )
        elif donnees.date_confirmee is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La date confirmée ne peut être définie qu'à la confirmation du rendez-vous.",
            )

        if donnees.statut == "confirme":
            date_confirmation_precedente = rendez_vous.date_confirmee
            rendez_vous.date_confirmee = date_confirmee
            if rendez_vous.statut != "confirme" or date_confirmation_precedente != date_confirmee:
                rendez_vous.date_confirmee_vue = None

        rendez_vous.statut = donnees.statut
        rendez_vous.commentaire = donnees.commentaire

    db.commit()
    db.refresh(rendez_vous)
    patient = db.get(Patient, rendez_vous.patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Le profil patient lié au rendez-vous est introuvable.")
    return _convertir_sortie(rendez_vous, patient)
