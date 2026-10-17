"""Routes publiques et administration des actualités de la page d'accueil."""
import uuid
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import exiger_roles, obtenir_utilisateur_courant
from app.db.session import obtenir_db
from app.models.actualite import Actualite
from app.models.enums import RoleUtilisateur
from app.models.utilisateur import Utilisateur
from app.schemas.actualite import ActualiteOut, ActualiteCreationSchema

routeur = APIRouter(prefix="/actualites", tags=["Actualités"])

EXTENSIONS_IMAGE_AUTORISEES = {".jpg", ".jpeg", ".png", ".webp"}
TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024
DOSSIER_PHOTOS_ACTUALITES = Path("app/static/uploads/actualites")


@routeur.get("", response_model=list[ActualiteOut])
def lister_actualites(db: Session = Depends(obtenir_db)):
    return db.query(Actualite).order_by(Actualite.date_creation.desc()).all()


async def _enregistrer_photo(requete: Request, fichier: UploadFile) -> tuple[str, Path]:
    extension = Path(fichier.filename or "").suffix.lower()
    if extension not in EXTENSIONS_IMAGE_AUTORISEES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format d'image non supporté (jpg, jpeg, png ou webp uniquement).",
        )

    contenu = await fichier.read(TAILLE_MAX_IMAGE_OCTETS + 1)
    if len(contenu) > TAILLE_MAX_IMAGE_OCTETS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'image dépasse la taille maximale de 5 Mo.",
        )
    if not contenu:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La photo de l'actualité ne peut pas être vide.",
        )

    DOSSIER_PHOTOS_ACTUALITES.mkdir(parents=True, exist_ok=True)
    chemin_photo = DOSSIER_PHOTOS_ACTUALITES / f"{uuid.uuid4()}{extension}"
    chemin_photo.write_bytes(contenu)
    url_photo = f"{str(requete.base_url).rstrip('/')}/fichiers/uploads/actualites/{chemin_photo.name}"
    return url_photo, chemin_photo


def _supprimer_photo_precedente(url_photo: str | None) -> None:
    if not url_photo:
        return
    chemin_url = urlparse(url_photo).path
    prefixe = "/fichiers/uploads/actualites/"
    if prefixe not in chemin_url:
        return
    dossier = DOSSIER_PHOTOS_ACTUALITES.resolve()
    chemin_photo = (dossier / Path(chemin_url).name).resolve()
    if chemin_photo.parent == dossier:
        chemin_photo.unlink(missing_ok=True)


@routeur.post(
    "",
    response_model=ActualiteOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
async def creer_actualite(
    requete: Request,
    texte: str = Form(..., min_length=1, max_length=250),
    details: str = Form(..., min_length=1, max_length=5000),
    fichier: UploadFile = File(..., description="Photo de l'actualité (jpg, jpeg, png ou webp, 5 Mo max)."),
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    texte = texte.strip()
    if not texte:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le texte de l'actualité ne peut pas être vide.",
        )
    details = details.strip()
    if not details:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Les détails de l'actualité ne peuvent pas être vides.",
        )
    donnees = ActualiteCreationSchema(texte=texte, details=details)
    photo_url, chemin_photo = await _enregistrer_photo(requete, fichier)

    actualite = Actualite(
        texte=donnees.texte,
        details=donnees.details,
        photo_url=photo_url,
        auteur_id=utilisateur_courant.id,
    )
    try:
        db.add(actualite)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        chemin_photo.unlink(missing_ok=True)
        raise
    db.refresh(actualite)
    return actualite


@routeur.patch(
    "/{actualite_id}",
    response_model=ActualiteOut,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
async def modifier_actualite(
    actualite_id: uuid.UUID,
    requete: Request,
    texte: str = Form(..., min_length=1, max_length=250),
    details: str = Form(..., min_length=1, max_length=5000),
    fichier: UploadFile | None = File(
        default=None,
        description="Nouvelle photo de l'actualité (jpg, jpeg, png ou webp, 5 Mo max).",
    ),
    db: Session = Depends(obtenir_db),
):
    texte = texte.strip()
    if not texte:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le texte de l'actualité ne peut pas être vide.",
        )
    details = details.strip()
    if not details:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Les détails de l'actualité ne peuvent pas être vides.",
        )
    donnees = ActualiteCreationSchema(texte=texte, details=details)
    actualite = db.get(Actualite, actualite_id)
    if actualite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Actualité introuvable.")

    ancienne_photo = actualite.photo_url
    nouvelle_photo = None
    chemin_nouvelle_photo = None
    if fichier is not None and fichier.filename:
        nouvelle_photo, chemin_nouvelle_photo = await _enregistrer_photo(requete, fichier)

    actualite.texte = donnees.texte
    actualite.details = donnees.details
    if nouvelle_photo:
        actualite.photo_url = nouvelle_photo
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        if chemin_nouvelle_photo:
            chemin_nouvelle_photo.unlink(missing_ok=True)
        raise
    db.refresh(actualite)
    if nouvelle_photo and ancienne_photo != nouvelle_photo:
        _supprimer_photo_precedente(ancienne_photo)
    return actualite
