"""Routes réservées au SuperAdmin pour gérer les comptes du personnel."""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import exiger_roles, obtenir_utilisateur_courant
from app.core.security import hasher_mot_de_passe
from app.db.session import obtenir_db
from app.models.enums import ROLES_PERSONNEL, RoleUtilisateur
from app.models.personnel import Personnel
from app.models.service import Service
from app.models.utilisateur import Utilisateur
from app.schemas.utilisateur import (
    CreationPersonnelSchema,
    ModificationStatutUtilisateurSchema,
    ReinitialisationMotDePassePersonnelSchema,
    UtilisateurOut,
)

routeur = APIRouter(prefix="/utilisateurs", tags=["Utilisateurs"])


@routeur.post(
    "/personnel",
    response_model=UtilisateurOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def creer_personnel(donnees: CreationPersonnelSchema, db: Session = Depends(obtenir_db)):
    """Un SuperAdmin crée un compte du personnel, y compris les profils de régulation."""
    if donnees.role not in ROLES_PERSONNEL and donnees.role != RoleUtilisateur.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le rôle doit correspondre à un profil du personnel ou à un SuperAdmin.",
        )
    service_personnel = donnees.service.strip() if donnees.service else None
    if donnees.role in {RoleUtilisateur.SECRETAIRE, RoleUtilisateur.MEDECIN}:
        service_actif = (
            db.query(Service)
            .filter(Service.nom == service_personnel, Service.est_actif.is_(True))
            .first()
        )
        if service_actif is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le personnel médical et le secrétariat doivent être rattachés à un service hospitalier actif.",
            )
    if db.query(Utilisateur).filter(Utilisateur.identifiant == donnees.matricule).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Cet identifiant est déjà utilisé.")
    if db.query(Personnel).filter(Personnel.matricule == donnees.matricule).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ce matricule est déjà utilisé.")

    nouvel_utilisateur = Utilisateur(
        identifiant=donnees.matricule,
        mot_de_passe_hash=hasher_mot_de_passe(donnees.mot_de_passe),
        role=donnees.role,
    )
    nouvel_utilisateur.personnel = Personnel(
        nom=donnees.nom,
        prenoms=donnees.prenoms,
        matricule=donnees.matricule,
        service=service_personnel,
        telephone=donnees.telephone,
    )
    db.add(nouvel_utilisateur)
    db.commit()
    db.refresh(nouvel_utilisateur)
    return nouvel_utilisateur


@routeur.get(
    "",
    response_model=list[UtilisateurOut],
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def lister_utilisateurs(db: Session = Depends(obtenir_db)):
    """Liste tous les comptes (réservé au SuperAdmin)."""
    return db.query(Utilisateur).all()


@routeur.delete(
    "/{utilisateur_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def supprimer_compte_personnel(
    utilisateur_id: uuid.UUID,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    """Supprime un compte du personnel et son profil associé (réservé au SuperAdmin)."""
    utilisateur = db.get(Utilisateur, utilisateur_id)
    if utilisateur is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compte introuvable.")
    if utilisateur.id == utilisateur_courant.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vous ne pouvez pas supprimer votre propre compte.",
        )
    if utilisateur.role not in ROLES_PERSONNEL:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cette action est réservée aux comptes du personnel.",
        )
    db.delete(utilisateur)
    db.commit()


@routeur.put(
    "/{utilisateur_id}/mot-de-passe",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def reinitialiser_mot_de_passe_personnel(
    utilisateur_id: uuid.UUID,
    donnees: ReinitialisationMotDePassePersonnelSchema,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    utilisateur = db.get(Utilisateur, utilisateur_id)
    if utilisateur is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compte introuvable.")
    if utilisateur.id == utilisateur_courant.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Utilisez la modification sécurisée pour changer le mot de passe de votre propre compte.",
        )
    if (
        utilisateur.role not in ROLES_PERSONNEL
        and utilisateur.role not in {RoleUtilisateur.PATIENT, RoleUtilisateur.SUPERADMIN}
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cette action est réservée aux comptes du personnel, patients et SuperAdmin.",
        )

    utilisateur.mot_de_passe_hash = hasher_mot_de_passe(donnees.nouveau_mot_de_passe)
    db.commit()


@routeur.patch(
    "/{utilisateur_id}/statut",
    response_model=UtilisateurOut,
    dependencies=[Depends(exiger_roles(RoleUtilisateur.SUPERADMIN))],
)
def modifier_statut_utilisateur(
    utilisateur_id: uuid.UUID,
    donnees: ModificationStatutUtilisateurSchema,
    utilisateur_courant: Utilisateur = Depends(obtenir_utilisateur_courant),
    db: Session = Depends(obtenir_db),
):
    utilisateur = db.get(Utilisateur, utilisateur_id)
    if utilisateur is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Compte introuvable.")
    if utilisateur.id == utilisateur_courant.id and not donnees.est_actif:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vous ne pouvez pas désactiver votre propre compte.",
        )
    if utilisateur.role == RoleUtilisateur.SUPERADMIN and utilisateur.est_actif and not donnees.est_actif:
        autres_superadmins_actifs = (
            db.query(Utilisateur)
            .filter(
                Utilisateur.role == RoleUtilisateur.SUPERADMIN,
                Utilisateur.est_actif.is_(True),
                Utilisateur.id != utilisateur.id,
            )
            .count()
        )
        if autres_superadmins_actifs == 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Le dernier compte SuperAdmin actif ne peut pas être désactivé.",
            )

    utilisateur.est_actif = donnees.est_actif
    db.commit()
    db.refresh(utilisateur)
    return utilisateur
    