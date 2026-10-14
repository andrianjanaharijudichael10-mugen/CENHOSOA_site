"""Constantes et règles partagées du cycle de vie des lits."""
from datetime import datetime, timedelta, timezone

from app.models.enums import CategorieLit, StatutLit
DUREE_TRIAGE_MAX = timedelta(minutes=30)
SEUIL_ALERTE_TRIAGE = timedelta(minutes=45)
DUREE_URGENCE_MAX = timedelta(hours=12)
DUREE_BIONETTOYAGE = timedelta(hours=2)
DUREE_RESERVATION_TRANSFERT = timedelta(minutes=5)
SEUIL_PLAN_BLANC = 19


def date_utc(valeur: datetime | None) -> datetime | None:
    if valeur is None:
        return None
    if valeur.tzinfo is None:
        return valeur.replace(tzinfo=timezone.utc)
    return valeur.astimezone(timezone.utc)


def duree_depuis(date_debut: datetime | None, maintenant: datetime | None = None) -> timedelta:
    debut = date_utc(date_debut)
    fin = date_utc(maintenant) or datetime.now(timezone.utc)
    return fin - debut if debut else timedelta(0)


def statut_apres_liberation(categorie: str | CategorieLit) -> StatutLit:
    return StatutLit.NETTOYAGE if categorie == CategorieLit.SALLE_SEPTIQUE else StatutLit.LIBRE


def motif_infectieux_valide(categorie: str | CategorieLit, motif: str | None) -> bool:
    return categorie != CategorieLit.SALLE_SEPTIQUE or bool(motif and motif.strip())
