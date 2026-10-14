"""Consultations et dossiers médicaux accessibles aux médecins."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import exiger_roles, obtenir_utilisateur_courant
from app.db.session import obtenir_db
from app.models.consultation import Consultation
from app.models.enums import RoleUtilisateur
from app.models.patient import Patient
from app.models.rendez_vous import RendezVous
from app.models.utilisateur import Utilisateur
from app.schemas.consultation import (
    ConsultationOut,
    CreationConsultationSchema,
    DossierPatientCompletOut,
    DossierMedicalOut,
)

routeur = APIRouter(
    prefix="/dossiers-medicaux",
    tags=["Dossiers médicaux"],
)


def _service_medecin(utilisateur: Utilisateur) -> str:
    service = utilisateur.personnel.service if utilisateur.personnel else None
    if not service:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aucun service n'est associé à ce compte médecin.",
        )
    return service


@routeur.get(
    "/patients/{patient_id}",
    response_model=DossierMedicalOut,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.PATIENT, RoleUtilisateur.MEDECIN))],
)
def obtenir_dossier_patient(
    patient_id: uuid.UUID,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable.")

    if utilisateur_courant.role == RoleUtilisateur.PATIENT:
        if utilisateur_courant.patient is None or utilisateur_courant.patient.id != patient.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable.")
        requete_consultations = db.query(Consultation).filter(
            Consultation.patient_id == patient.id,
        )
    else:
        service = _service_medecin(utilisateur_courant)
        a_un_rendez_vous_dans_service = (
            db.query(RendezVous.id)
            .filter(
                RendezVous.patient_id == patient.id,
                RendezVous.service_nom == service,
            )
            .first()
        )
        if a_un_rendez_vous_dans_service is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable.")
        requete_consultations = (
            db.query(Consultation)
            .join(RendezVous, Consultation.rendez_vous_id == RendezVous.id)
            .filter(
                Consultation.patient_id == patient.id,
                RendezVous.service_nom == service,
            )
        )
    consultations = requete_consultations.order_by(Consultation.date_creation.desc()).all()
    return DossierMedicalOut(
        patient_id=patient.id,
        patient_nom=patient.nom,
        patient_prenoms=patient.prenoms,
        patient_date_naissance=patient.date_naissance,
        patient_lieu_naissance=patient.lieu_naissance,
        patient_adresse=patient.adresse,
        patient_a_photo=patient.photo_profil is not None,
        consultations=consultations,
    )


@routeur.get(
    "/patients/{patient_id}/complet",
    response_model=DossierPatientCompletOut,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.PATIENT, RoleUtilisateur.MEDECIN))],
)
def obtenir_dossier_complet_patient(
    patient_id: uuid.UUID,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable.")
    requete_rendez_vous = db.query(RendezVous).filter(RendezVous.patient_id == patient.id)
    if utilisateur_courant.role == RoleUtilisateur.PATIENT:
        if utilisateur_courant.patient is None or utilisateur_courant.patient.id != patient.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable.")
    else:
        service = _service_medecin(utilisateur_courant)
        requete_rendez_vous = requete_rendez_vous.filter(RendezVous.service_nom == service)
    rendez_vous = (
        requete_rendez_vous
        .order_by(RendezVous.date_souhaitee.desc(), RendezVous.date_creation.desc())
        .all()
    )
    if utilisateur_courant.role == RoleUtilisateur.MEDECIN and not rendez_vous:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable.")
    consultations = (
        db.query(Consultation)
        .filter(Consultation.rendez_vous_id.in_([rdv.id for rdv in rendez_vous]))
        .all()
    )
    consultations_par_rendez_vous = {
        consultation.rendez_vous_id: consultation for consultation in consultations
    }
    return DossierPatientCompletOut(
        patient_id=patient.id,
        patient_nom=patient.nom,
        patient_prenoms=patient.prenoms,
        patient_telephone=patient.telephone,
        patient_date_naissance=patient.date_naissance,
        patient_lieu_naissance=patient.lieu_naissance,
        patient_adresse=patient.adresse,
        patient_a_photo=patient.photo_profil is not None,
        rendez_vous=[
            {
                "id": rdv.id,
                "service_nom": rdv.service_nom,
                "date_souhaitee": rdv.date_souhaitee,
                "date_confirmee": rdv.date_confirmee,
                "numero_file": rdv.numero_file,
                "motif": rdv.motif,
                "statut": rdv.statut,
                "commentaire": rdv.commentaire,
                "consultation": consultations_par_rendez_vous.get(rdv.id),
            }
            for rdv in rendez_vous
        ],
    )


@routeur.post(
    "/rendez-vous/{rendez_vous_id}/consultations",
    response_model=ConsultationOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.MEDECIN))],
)
def creer_consultation(
    rendez_vous_id: uuid.UUID,
    donnees: CreationConsultationSchema,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    service = _service_medecin(utilisateur_courant)
    rendez_vous = db.get(RendezVous, rendez_vous_id)
    if rendez_vous is None or rendez_vous.service_nom != service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rendez-vous introuvable.")
    if rendez_vous.statut != "arrive":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Le patient doit être marqué comme arrivé avant l'enregistrement de la consultation.",
        )
    if db.query(Consultation.id).filter(Consultation.rendez_vous_id == rendez_vous.id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une consultation est déjà enregistrée pour ce rendez-vous.",
        )

    prochain_rendez_vous = None
    if donnees.prochain_rendez_vous is not None:
        if rendez_vous.service_id is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Le service de ce rendez-vous n'est plus disponible pour planifier un suivi.",
            )
        rendez_vous_actif = (
            db.query(RendezVous.id)
            .filter(
                RendezVous.patient_id == rendez_vous.patient_id,
                RendezVous.service_id == rendez_vous.service_id,
                RendezVous.id != rendez_vous.id,
                RendezVous.statut.in_({"en_attente", "confirme"}),
            )
            .first()
        )
        if rendez_vous_actif is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Le patient a déjà un rendez-vous actif dans ce service.",
            )
        conflit_creneau = (
            db.query(RendezVous.id)
            .filter(
                RendezVous.service_id == rendez_vous.service_id,
                RendezVous.date_confirmee == donnees.prochain_rendez_vous,
                RendezVous.statut == "confirme",
            )
            .first()
        )
        if conflit_creneau is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un rendez-vous est déjà confirmé pour ce service à cette date.",
            )
        prochain_rendez_vous = RendezVous(
            patient_id=rendez_vous.patient_id,
            service_id=rendez_vous.service_id,
            service_nom=rendez_vous.service_nom,
            date_souhaitee=donnees.prochain_rendez_vous,
            date_confirmee=donnees.prochain_rendez_vous,
            motif="Suivi médical",
            statut="confirme",
        )

    rendez_vous.statut = "termine"
    db.flush()
    if prochain_rendez_vous is not None:
        db.add(prochain_rendez_vous)
    consultation = Consultation(
        patient_id=rendez_vous.patient_id,
        rendez_vous_id=rendez_vous.id,
        medecin_id=utilisateur_courant.personnel.id,
        remarques=donnees.remarques,
        medicaments_prescrits=[
            medicament.model_dump() for medicament in donnees.medicaments_prescrits
        ],
        controle_supplementaire=donnees.controle_supplementaire,
        medicaments=donnees.medicaments or (
            donnees.medicaments_prescrits[0].nom if donnees.medicaments_prescrits else None
        ),
        quantite_matin=donnees.quantite_matin or (
            donnees.medicaments_prescrits[0].matin if donnees.medicaments_prescrits else None
        ),
        quantite_midi=donnees.quantite_midi or (
            donnees.medicaments_prescrits[0].midi if donnees.medicaments_prescrits else None
        ),
        quantite_soir=donnees.quantite_soir or (
            donnees.medicaments_prescrits[0].soir if donnees.medicaments_prescrits else None
        ),
        ordonnance=donnees.ordonnance,
    )
    db.add(consultation)
    try:
        db.commit()
    except IntegrityError as erreur:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cette consultation ou ce rendez-vous de suivi a déjà été créé.",
        ) from erreur

    db.refresh(consultation)
    return consultation
