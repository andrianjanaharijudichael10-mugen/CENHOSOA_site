"""
Fonctions de sécurité :
- hashage et vérification des mots de passe (bcrypt)
- création et décodage des tokens JWT (access + refresh)
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import bcrypt
from jose import JWTError, jwt

from app.core.config import parametres


# ---------- Mots de passe ----------

def hasher_mot_de_passe(mot_de_passe: str) -> str:
    """Retourne le hash bcrypt d'un mot de passe en clair."""
    sel = bcrypt.gensalt()
    return bcrypt.hashpw(mot_de_passe.encode("utf-8"), sel).decode("utf-8")


def verifier_mot_de_passe(mot_de_passe_clair: str, mot_de_passe_hash: str) -> bool:
    """Vérifie qu'un mot de passe en clair correspond au hash stocké."""
    return bcrypt.checkpw(
        mot_de_passe_clair.encode("utf-8"), mot_de_passe_hash.encode("utf-8")
    )


# ---------- Tokens JWT ----------

def _creer_token(sujet: str, duree: timedelta, type_token: Literal["access", "refresh"], role: str | None = None) -> str:
    maintenant = datetime.now(timezone.utc)
    donnees: dict[str, Any] = {
        "sub": sujet,
        "type": type_token,
        "iat": maintenant,
        "exp": maintenant + duree,
    }
    if role is not None:
        donnees["role"] = role
    return jwt.encode(donnees, parametres.SECRET_KEY, algorithm=parametres.ALGORITHM)


def creer_access_token(utilisateur_id: str, role: str) -> str:
    duree = timedelta(minutes=parametres.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _creer_token(utilisateur_id, duree, "access", role=role)


def creer_refresh_token(utilisateur_id: str) -> str:
    duree = timedelta(days=parametres.REFRESH_TOKEN_EXPIRE_DAYS)
    return _creer_token(utilisateur_id, duree, "refresh")


def decoder_token(token: str) -> dict[str, Any] | None:
    """Décode un token JWT. Retourne None si invalide ou expiré."""
    try:
        return jwt.decode(token, parametres.SECRET_KEY, algorithms=[parametres.ALGORITHM])
    except JWTError:
        return None