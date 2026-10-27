"""Point d'entrée de l'application FastAPI - CENHOSOA."""
from pathlib import Path
import logging

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import routeur_api
from app.core.config import parametres
from app.core.security import hasher_mot_de_passe
from app.core.temps_reel import domaine_modifie, gestionnaire_temps_reel
from app.db.session import SessionLocale
from app.models.enums import RoleUtilisateur
from app.models.utilisateur import Utilisateur

app = FastAPI(
    title="API CENHOSOA",
    description="Gestion des rendez-vous, ambulances, lits d'urgence et services hospitaliers.",
    version="0.1.0",
)
logger = logging.getLogger(__name__)

DOSSIER_FICHIERS = Path("app/static")
DOSSIER_FICHIERS.mkdir(parents=True, exist_ok=True)
app.mount("/fichiers", StaticFiles(directory=DOSSIER_FICHIERS), name="fichiers")

app.include_router(routeur_api)

@app.on_event("startup")
def creer_superadmin_initial() -> None:
    """Crée le compte SuperAdmin défini par identifiant dans l'environnement."""
    if not parametres.SUPERADMIN_PASSWORD:
        logger.warning("Compte SuperAdmin initial non créé : configurez SUPERADMIN_PASSWORD.")
        return
    identifiant = parametres.SUPERADMIN_IDENTIFIANT.strip()
    if not identifiant:
        raise RuntimeError("SUPERADMIN_IDENTIFIANT ne peut pas être vide.")

    db = SessionLocale()
    try:
        existe_deja = (
            db.query(Utilisateur)
            .filter(Utilisateur.identifiant == identifiant)
            .first()
        )
        if existe_deja is None:
            db.add(
                Utilisateur(
                    identifiant=identifiant,
                    mot_de_passe_hash=hasher_mot_de_passe(parametres.SUPERADMIN_PASSWORD),
                    role=RoleUtilisateur.SUPERADMIN,
                )
            )
            db.commit()
        elif existe_deja.role != RoleUtilisateur.SUPERADMIN:
            raise RuntimeError(
                "SUPERADMIN_IDENTIFIANT est déjà utilisé par un compte qui n'est pas SuperAdmin."
            )
    finally:
        db.close()

@app.get("/", tags=["Santé"])
def verifier_etat():
    return {"statut": "ok", "service": "API CENHOSOA"}

@app.middleware("http")
async def diffuser_modifications(request: Request, call_next):
    response = await call_next(request)
    domaine = domaine_modifie(request.url.path)
    if (
        request.method in {"POST", "PUT", "PATCH", "DELETE"}
        and 200 <= response.status_code < 300
        and domaine
    ):
        try:
            await gestionnaire_temps_reel.diffuser(domaine)
        except Exception:
            logger.exception("Impossible de diffuser la mise à jour temps réel du domaine %s.", domaine)
    return response

@app.websocket("/api/v1/temps-reel")
async def connexion_temps_reel(websocket: WebSocket):
    origine = websocket.headers.get("origin")
    if origine and origine not in parametres.ORIGINES_AUTORISEES:
        await websocket.close(code=1008)
        return

    await gestionnaire_temps_reel.connecter(websocket)
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        gestionnaire_temps_reel.deconnecter(websocket)

app = CORSMiddleware(
    app=app,
    allow_origins=parametres.ORIGINES_AUTORISEES,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)