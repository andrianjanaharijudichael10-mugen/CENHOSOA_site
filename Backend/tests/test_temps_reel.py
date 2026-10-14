import asyncio

from fastapi.testclient import TestClient

from app.core.temps_reel import GestionnaireTempsReel, domaine_modifie


def test_domaines_modifies_identifient_les_ecrans_concernes():
    assert domaine_modifie("/api/v1/ambulances/missions") == "ambulances"
    assert domaine_modifie("/api/v1/dossiers-medicaux/patients/1") == "dossiers"
    assert domaine_modifie("/api/v1/auth/profil-patient") == "patients"
    assert domaine_modifie("/api/v1/auth/connexion") is None
    assert domaine_modifie("/api/v1/ambulances/missions/moi") == "ambulances"
    assert domaine_modifie("/api/v1/ambulances/missions/moi?actif=true") == "ambulances"
    assert domaine_modifie("/api/v1/ambulances/simuler-trajet") is None
    assert domaine_modifie("/api/v1/ambulances/public/simuler-trajet") is None
    assert domaine_modifie("/autre/route") is None


def test_diffuser_envoie_seulement_le_domaine_sans_donnees_patient():
    class ConnexionFictive:
        def __init__(self):
            self.messages = []

        async def send_json(self, message):
            self.messages.append(message)

    gestionnaire = GestionnaireTempsReel()
    connexion = ConnexionFictive()
    gestionnaire.connexions.add(connexion)

    asyncio.run(gestionnaire.diffuser("rendez-vous"))

    assert connexion.messages == [{
        "type": "donnees_modifiees",
        "domaine": "rendez-vous",
    }]


def test_websocket_recoit_une_notification_apres_une_modification_api():
    from app.main import app as application

    api = application.app

    async def modifier_donnees():
        return {"ok": True}

    api.add_api_route(
        "/api/v1/ambulances/__test_temps_reel",
        modifier_donnees,
        methods=["POST"],
    )
    route = next(
        route
        for route in api.router.routes
        if getattr(route, "path", None) == "/api/v1/ambulances/__test_temps_reel"
    )
    try:
        client = TestClient(application)
        with client.websocket_connect(
            "/api/v1/temps-reel",
            headers={"origin": "http://localhost:5173"},
        ) as websocket:
            response = client.post(
                "/api/v1/ambulances/__test_temps_reel",
                headers={"origin": "http://localhost:5173"},
            )
            assert response.status_code == 200
            assert websocket.receive_json() == {
                "type": "donnees_modifiees",
                "domaine": "ambulances",
            }
    finally:
        api.router.routes.remove(route)
