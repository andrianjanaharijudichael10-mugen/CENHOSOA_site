"""Routes du module Services : information publique + gestion SuperAdmin."""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import exiger_roles
from app.db.session import obtenir_db
from app.models.enums import RoleUtilisateur
from app.models.service import Service
from app.schemas.service import CreationServiceSchema, ModificationServiceSchema, ServiceOut

routeur = APIRouter(prefix="/services", tags=["Services"])

EXTENSIONS_IMAGE_AUTORISEES = {".jpg", ".jpeg", ".png", ".webp"}
TAILLE_MAX_IMAGE_OCTETS = 5 * 1024 * 1024  # 5 Mo
DOSSIER_PHOTOS_RESPONSABLES = Path("app/static/uploads/services")


# ---------- Consultation publique (patients, visiteurs non connectés) ----------

@routeur.get("", response_model=list[ServiceOut])
def lister_services(db: Session = Depends(obtenir_db)):
    """Liste les services actifs de l'hôpital. Accessible sans authentification."""
    return db.query(Service).filter(Service.est_actif.is_(True)).order_by(Service.nom).all()


@routeur.get("/{service_id}", response_model=ServiceOut)
def obtenir_service(service_id: uuid.UUID, db: Session = Depends(obtenir_db)):
    """Détail d'un service actif. Accessible sans authentification."""
    service = (
        db.query(Service)
        .filter(Service.id == service_id, Service.est_actif.is_(True))
        .first()
    )
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service introuvable.")
    return service


# ---------- Gestion, réservée au SuperAdmin ----------

@routeur.get(
    "/admin/tous",
    response_model=list[ServiceOut],
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def lister_tous_les_services(db: Session = Depends(obtenir_db)):
    """Liste tous les services, actifs et inactifs (réservé au SuperAdmin)."""
    return db.query(Service).order_by(Service.nom).all()


@routeur.post(
    "",
    response_model=ServiceOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def creer_service(donnees: CreationServiceSchema, db: Session = Depends(obtenir_db)):
    if db.query(Service).filter(Service.nom == donnees.nom).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Un service porte déjà ce nom.")

    nouveau_service = Service(**donnees.model_dump())
    db.add(nouveau_service)
    db.commit()
    db.refresh(nouveau_service)
    return nouveau_service


@routeur.put(
    "/{service_id}",
    response_model=ServiceOut,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def modifier_service(service_id: uuid.UUID, donnees: ModificationServiceSchema, db: Session = Depends(obtenir_db)):
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service introuvable.")

    donnees_modifiees = donnees.model_dump(exclude_unset=True)
    if "nom" in donnees_modifiees:
        conflit = (
            db.query(Service)
            .filter(Service.nom == donnees_modifiees["nom"], Service.id != service_id)
            .first()
        )
        if conflit:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Un service porte déjà ce nom.")

    for champ, valeur in donnees_modifiees.items():
        setattr(service, champ, valeur)

    db.commit()
    db.refresh(service)
    return service


@routeur.post(
    "/{service_id}/photo-responsable",
    response_model=ServiceOut,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
async def televerser_photo_responsable(
    service_id: uuid.UUID,
    requete: Request,
    fichier: UploadFile = File(..., description="Image du responsable (jpg, jpeg, png ou webp, 5 Mo max)."),
    db: Session = Depends(obtenir_db),
):
    """Upload direct d'une image depuis l'ordinateur du SuperAdmin (remplace photo_responsable_url)."""
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service introuvable.")

    extension = Path(fichier.filename or "").suffix.lower()
    if extension not in EXTENSIONS_IMAGE_AUTORISEES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format d'image non supporté (jpg, jpeg, png ou webp uniquement).",
        )

    contenu = await fichier.read()
    if len(contenu) > TAILLE_MAX_IMAGE_OCTETS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="L'image dépasse la taille maximale de 5 Mo."
        )

    DOSSIER_PHOTOS_RESPONSABLES.mkdir(parents=True, exist_ok=True)
    nom_fichier = f"{uuid.uuid4()}{extension}"
    (DOSSIER_PHOTOS_RESPONSABLES / nom_fichier).write_bytes(contenu)

    service.photo_responsable_url = f"{str(requete.base_url).rstrip('/')}/fichiers/uploads/services/{nom_fichier}"
    db.commit()
    db.refresh(service)
    return service


@routeur.delete(
    "/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def supprimer_service(service_id: uuid.UUID, db: Session = Depends(obtenir_db)):
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service introuvable.")
    db.delete(service)
    db.commit()