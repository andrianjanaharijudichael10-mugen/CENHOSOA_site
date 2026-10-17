from fastapi import APIRouter

from app.api.v1.endpoints import (
    actualites,
    ambulances,
    auth,
    infos_centre,
    lits,
    rendez_vous,
    services,
    utilisateurs,
)

routeur_api = APIRouter(prefix="/api/v1")
routeur_api.include_router(auth.routeur)
routeur_api.include_router(actualites.routeur)
routeur_api.include_router(utilisateurs.routeur)
routeur_api.include_router(services.routeur)
routeur_api.include_router(infos_centre.routeur)
routeur_api.include_router(lits.routeur)
routeur_api.include_router(ambulances.routeur)
routeur_api.include_router(rendez_vous.routeur)