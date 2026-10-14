"""Diffusion en temps réel des changements de données."""
from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect


class GestionnaireTempsReel:
    def __init__(self) -> None:
        self.connexions: set[WebSocket] = set()

    async def connecter(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connexions.add(websocket)

    def deconnecter(self, websocket: WebSocket) -> None:
        self.connexions.discard(websocket)

    async def diffuser(self, domaine: str) -> None:
        message = {"type": "donnees_modifiees", "domaine": domaine}
        for websocket in tuple(self.connexions):
            try:
                await websocket.send_json(message)
            except (WebSocketDisconnect, RuntimeError):
                self.deconnecter(websocket)


gestionnaire_temps_reel = GestionnaireTempsReel()


def domaine_modifie(chemin: str) -> str | None:
    segments = chemin.strip("/").split("/")
    if len(segments) < 3 or segments[:2] != ["api", "v1"]:
        return None

    if segments[2] == "auth":
        if len(segments) > 3 and segments[3] in {"inscription-patient", "profil-patient"}:
            return "patients"
        return None

    if segments[2] == "ambulances" and "simuler-trajet" in segments[3:]:
        return None

    return {
        "ambulances": "ambulances",
        "dossiers-medicaux": "dossiers",
        "informations-centre": "informations",
        "lits": "lits",
        "rendez-vous": "rendez-vous",
        "services": "services",
        "utilisateurs": "administration",
    }.get(segments[2])
