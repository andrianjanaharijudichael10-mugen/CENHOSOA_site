"""Dépendances FastAPI réutilisables : session DB, utilisateur courant, rôles."""
import uuid
from collections.abc import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decoder_token
from app.db.session import obtenir_db
from app.models.enums import RoleUtilisateur
from app.models.utilisateur import Utilisateur

# Affiche un simple champ "coller le token" dans Swagger, au lieu du
# formulaire username/password d'OAuth2PasswordBearer (qui ne correspond
# pas à notre endpoint /auth/connexion, lequel attend du JSON).
schema_securite = HTTPBearer()


def obtenir_utilisateur_courant(
    identifiants: HTTPAuthorizationCredentials = Depends(schema_securite),
    db: Session = Depends(obtenir_db),
) -> Utilisateur:
    """Décode le token d'accès et retourne l'Utilisateur correspondant."""
    exception_identification = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants invalides ou expirés.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    donnees = decoder_token(identifiants.credentials)
    if donnees is None or donnees.get("type") != "access":
        raise exception_identification

    try:
        utilisateur_id = uuid.UUID(donnees["sub"])
    except (KeyError, ValueError):
        raise exception_identification

    utilisateur = db.get(Utilisateur, utilisateur_id)
    if utilisateur is None:
        raise exception_identification
    if not utilisateur.est_actif:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Compte désactivé."
        )
    return utilisateur


def exiger_roles(*roles_autorises: RoleUtilisateur):
    """Fabrique une dépendance qui n'autorise que les rôles listés."""

    def verificateur(
        utilisateur: Utilisateur = Depends(obtenir_utilisateur_courant),
    ) -> Utilisateur:
        if utilisateur.role not in roles_autorises:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas les droits nécessaires pour cette action.",
            )
        return utilisateur

    return verificateur