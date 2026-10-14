"""Routes d'authentification : inscription patient, connexion, rafraîchissement, profil."""
from pathlib import Path
import uuid
from datetime import datetime, timezone
import re

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import obtenir_utilisateur_courant
from app.core.security import (
    creer_access_token,
    creer_refresh_token,
    decoder_token,
    hasher_mot_de_passe,
    verifier_mot_de_passe,
)
from app.db.session import obtenir_db
from app.models.enums import RoleUtilisateur
from app.models.patient import Patient
from app.models.rendez_vous import RendezVous
from app.models.utilisateur import Utilisateur
from app.schemas.auth import (
    ConnexionSchema,
    InscriptionPatientSchema,
    ModificationMotDePasseSchema,
    RafraichirTokenSchema,
    TokenSchema,
)
from app.schemas.utilisateur import ModificationProfilPatientSchema, PatientOut, UtilisateurOut

_MALAGASY_TEL_RE = re.compile(r"^\+261[0-9]{6,9}$")

routeur = APIRouter(prefix="/auth", tags=["Authentification"])
DOSSIER_PHOTOS_PATIENTS = Path(__file__).resolve().parents[4] / "private_uploads" / "patients"
TAILLE_MAX_PHOTO = 2 * 1024 * 1024
SIGNATURES_IMAGES = (
    (".jpg", lambda contenu: contenu.startswith(b"\xff\xd8\xff")),
    (".png", lambda contenu: contenu.startswith(b"\x89PNG\r\n\x1a\n")),
    (".gif", lambda contenu: contenu.startswith((b"GIF87a", b"GIF89a"))),
    (".webp", lambda contenu: contenu.startswith(b"RIFF") and contenu[8:12] == b"WEBP"),
)


def _patient_autorise_photo(
    patient: Patient,
    utilisateur: Utilisateur,
    db: Session,
) -> bool:
    if utilisateur.role == RoleUtilisateur.PATIENT:
        return utilisateur.patient is not None and utilisateur.patient.id == patient.id
    if utilisateur.role != RoleUtilisateur.MEDECIN:
        return False
    service = utilisateur.personnel.service if utilisateur.personnel else None
    if not service:
        return False
    return db.query(RendezVous.id).filter(
        RendezVous.patient_id == patient.id,
        RendezVous.service_nom == service,
    ).first() is not None


def _chemin_photo_patient(patient: Patient) -> Path | None:
    if not patient.photo_profil:
        return None
    return DOSSIER_PHOTOS_PATIENTS / Path(patient.photo_profil).name


@routeur.post("/inscription-patient", response_model=UtilisateurOut, status_code=status.HTTP_201_CREATED)
def inscription_patient(donnees: InscriptionPatientSchema, db: Session = Depends(obtenir_db)):
    """Un patient crée lui-même son compte (auto-inscription)."""
    telephone = donnees.telephone.replace(" ", "").replace("-", "")
    if not _MALAGASY_TEL_RE.fullmatch(telephone):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le numéro doit être Malagasy et commencer par +261.",
        )
    if db.query(Utilisateur).filter(Utilisateur.identifiant == telephone).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce numéro est déjà associé à un compte.")

    nouvel_utilisateur = Utilisateur(
        identifiant=telephone,
        mot_de_passe_hash=hasher_mot_de_passe(donnees.mot_de_passe),
        role=RoleUtilisateur.PATIENT,
    )
    nouvel_utilisateur.patient = Patient(
        nom=donnees.nom,
        prenoms=donnees.prenoms,
        telephone=telephone,
        date_naissance=donnees.date_naissance,
        adresse=donnees.adresse,
    )
    db.add(nouvel_utilisateur)
    db.commit()
    db.refresh(nouvel_utilisateur)
    return nouvel_utilisateur


@routeur.post("/connexion", response_model=TokenSchema, status_code=status.HTTP_200_OK)
def connexion(donnees: ConnexionSchema, db: Session = Depends(obtenir_db)):
    """Connexion par téléphone patient ou matricule/identifiant du personnel."""
    identifiant = donnees.identifiant.replace(" ", "").replace("-", "") if donnees.identifiant.startswith("+261") else donnees.identifiant
    utilisateur = (
        db.query(Utilisateur)
        .filter(Utilisateur.identifiant == identifiant)
        .first()
    )
    if utilisateur is None or not utilisateur.est_actif or not verifier_mot_de_passe(
        donnees.mot_de_passe, utilisateur.mot_de_passe_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiant ou mot de passe incorrect.",
        )

    if utilisateur.role == RoleUtilisateur.PATIENT and not _MALAGASY_TEL_RE.fullmatch(identifiant):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiant ou mot de passe incorrect.")

    utilisateur.derniere_connexion = datetime.now(timezone.utc)
    db.commit()

    return TokenSchema(
        access_token=creer_access_token(str(utilisateur.id), utilisateur.role.value),
        refresh_token=creer_refresh_token(str(utilisateur.id)),
    )


@routeur.post("/rafraichir", response_model=TokenSchema)
def rafraichir_token(donnees: RafraichirTokenSchema, db: Session = Depends(obtenir_db)):
    """Échange un refresh token valide contre une nouvelle paire de tokens."""
    exception_token = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalide ou expiré."
    )

    contenu = decoder_token(donnees.refresh_token)
    if contenu is None or contenu.get("type") != "refresh":
        raise exception_token

    try:
        utilisateur_id = uuid.UUID(contenu["sub"])
    except (KeyError, ValueError):
        raise exception_token

    utilisateur = db.get(Utilisateur, utilisateur_id)
    if utilisateur is None or not utilisateur.est_actif:
        raise exception_token

    return TokenSchema(
        access_token=creer_access_token(str(utilisateur.id), utilisateur.role.value),
        refresh_token=creer_refresh_token(str(utilisateur.id)),
    )


@routeur.get("/moi", response_model=UtilisateurOut)
def profil_courant(utilisateur: Utilisateur = Depends(obtenir_utilisateur_courant)):
    """Retourne le profil complet de l'utilisateur actuellement connecté."""
    return utilisateur


@routeur.put("/profil-patient", response_model=PatientOut)
def modifier_profil_patient(
    donnees: ModificationProfilPatientSchema,
    utilisateur: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    if utilisateur.role != RoleUtilisateur.PATIENT or utilisateur.patient is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cette action est réservée au profil du patient connecté.",
        )
    patient = utilisateur.patient
    patient.nom = donnees.nom
    patient.prenoms = donnees.prenoms
    patient.date_naissance = donnees.date_naissance
    patient.lieu_naissance = donnees.lieu_naissance
    patient.adresse = donnees.adresse
    db.commit()
    db.refresh(patient)
    return patient


@routeur.put("/profil-patient/photo", status_code=status.HTTP_204_NO_CONTENT)
def enregistrer_photo_profil_patient(
    photo: UploadFile = File(...),
    utilisateur: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    if utilisateur.role != RoleUtilisateur.PATIENT or utilisateur.patient is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cette action est réservée au profil du patient connecté.",
        )
    contenu = photo.file.read(TAILLE_MAX_PHOTO + 1)
    if len(contenu) > TAILLE_MAX_PHOTO:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="La photo ne doit pas dépasser 2 Mo.")
    format_image = next(
        ((extension, verifier) for extension, verifier in SIGNATURES_IMAGES if verifier(contenu)),
        None,
    )
    if format_image is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Le fichier doit être une image JPG, PNG, GIF ou WebP valide.",
        )

    patient = utilisateur.patient
    ancien_fichier = _chemin_photo_patient(patient)
    nom_fichier = f"{patient.id}-{uuid.uuid4().hex}{format_image[0]}"
    DOSSIER_PHOTOS_PATIENTS.mkdir(parents=True, exist_ok=True)
    chemin_photo = DOSSIER_PHOTOS_PATIENTS / nom_fichier
    chemin_photo.write_bytes(contenu)
    patient.photo_profil = nom_fichier
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        chemin_photo.unlink(missing_ok=True)
        raise
    if ancien_fichier is not None and ancien_fichier != chemin_photo:
        ancien_fichier.unlink(missing_ok=True)


@routeur.get("/patients/{patient_id}/photo")
def obtenir_photo_profil_patient(
    patient_id: uuid.UUID,
    utilisateur: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    patient = db.get(Patient, patient_id)
    if patient is None or not _patient_autorise_photo(patient, utilisateur, db):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo de profil introuvable.")
    chemin_photo = _chemin_photo_patient(patient)
    if chemin_photo is None or not chemin_photo.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo de profil introuvable.")
    return FileResponse(
        chemin_photo,
        headers={"Cache-Control": "private, no-store"},
    )


@routeur.delete("/profil-patient/photo", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_photo_profil_patient(
    utilisateur: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    if utilisateur.role != RoleUtilisateur.PATIENT or utilisateur.patient is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cette action est réservée au profil du patient connecté.",
        )
    patient = utilisateur.patient
    chemin_photo = _chemin_photo_patient(patient)
    patient.photo_profil = None
    db.commit()
    if chemin_photo is not None:
        chemin_photo.unlink(missing_ok=True)


@routeur.put("/mot-de-passe", status_code=status.HTTP_204_NO_CONTENT)
def modifier_mot_de_passe(
    donnees: ModificationMotDePasseSchema,
    utilisateur: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    if utilisateur.role != RoleUtilisateur.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seul un SuperAdmin peut modifier un mot de passe.",
        )
    if not verifier_mot_de_passe(donnees.mot_de_passe_actuel, utilisateur.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe actuel est incorrect.",
        )
    if verifier_mot_de_passe(donnees.nouveau_mot_de_passe, utilisateur.mot_de_passe_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le nouveau mot de passe doit être différent de l’ancien.",
        )

    utilisateur.mot_de_passe_hash = hasher_mot_de_passe(donnees.nouveau_mot_de_passe)
    db.commit()