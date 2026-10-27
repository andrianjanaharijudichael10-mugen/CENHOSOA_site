import json
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

API_URL = os.environ.get("CENHOSOA_API_URL", "http://127.0.0.1:8000").rstrip("/")
IDENTIFIANT = os.environ.get("SUPERADMIN_IDENTIFIANT", "admin-cenhosoa").strip()
MOT_DE_PASSE = os.environ.get("SUPERADMIN_PASSWORD")
EMAIL_CENTRE = os.environ.get("CENTRE_EMAIL", "").strip()
TELEPHONES_CENTRE_JSON = os.environ.get("CENTRE_TELEPHONES_JSON", "").strip()
DELAI_REQUETE_SECONDES = 10.0

SERVICES_INITIAUX = (
    {
        "nom": "Cardiologie",
        "description": "Service de soins et de diagnostic cardiovasculaire",
    },
    {
        "nom": "Urgences",
        "description": "Prise en charge des urgences médicales 24h/24",
    },
)


def _telephones_configures() -> list[dict] | None:
    if not TELEPHONES_CENTRE_JSON:
        return None

    telephones = json.loads(TELEPHONES_CENTRE_JSON)
    if not isinstance(telephones, list) or any(not isinstance(item, dict) for item in telephones):
        raise ValueError("CENTRE_TELEPHONES_JSON doit être une liste d'objets JSON.")
    return telephones


def _obtenir_jeton(client: httpx.Client) -> str:
    if not IDENTIFIANT or not MOT_DE_PASSE:
        raise ValueError("Configurez SUPERADMIN_IDENTIFIANT et SUPERADMIN_PASSWORD.")

    reponse = client.post(
        "/api/v1/auth/connexion",
        json={"identifiant": IDENTIFIANT, "mot_de_passe": MOT_DE_PASSE},
    )
    reponse.raise_for_status()
    donnees = reponse.json()
    if not isinstance(donnees, dict):
        raise ValueError("La réponse de connexion doit être un objet JSON.")
    jeton = donnees.get("access_token")
    if not jeton:
        raise ValueError("La réponse de connexion ne contient pas de jeton d'accès.")
    return jeton


def _initialiser_informations_centre(
    client: httpx.Client,
    entetes: dict[str, str],
    telephones: list[dict] | None,
) -> None:
    if not EMAIL_CENTRE and telephones is None:
        print("Informations du centre ignorées : aucune valeur de configuration fournie.")
        return

    reponse = client.get("/api/v1/informations-centre")
    reponse.raise_for_status()
    informations = reponse.json()
    if not isinstance(informations, dict):
        raise ValueError("Les informations du centre doivent être un objet JSON.")
    charge = {
        "email_centre": EMAIL_CENTRE or informations.get("email_centre"),
        "telephones": telephones if telephones is not None else informations.get("telephones", []),
    }
    reponse = client.put(
        "/api/v1/informations-centre",
        json=charge,
        headers=entetes,
    )
    reponse.raise_for_status()
    print("Informations du centre mises à jour.")


def _initialiser_services(client: httpx.Client, entetes: dict[str, str]) -> None:
    reponse = client.get("/api/v1/services/admin/tous", headers=entetes)
    reponse.raise_for_status()
    noms_existants = {
        service["nom"].casefold()
        for service in reponse.json()
        if isinstance(service.get("nom"), str)
    }

    for service in SERVICES_INITIAUX:
        if service["nom"].casefold() in noms_existants:
            print(f"Service déjà présent : {service['nom']}.")
            continue

        reponse = client.post(
            "/api/v1/services",
            json=service,
            headers=entetes,
        )
        reponse.raise_for_status()
        noms_existants.add(service["nom"].casefold())
        print(f"Service créé : {service['nom']}.")


def main() -> int:
    try:
        telephones = _telephones_configures()
        with httpx.Client(
            base_url=API_URL,
            timeout=DELAI_REQUETE_SECONDES,
        ) as client:
            jeton = _obtenir_jeton(client)
            entetes = {"Authorization": f"Bearer {jeton}"}
            _initialiser_informations_centre(client, entetes, telephones)
            _initialiser_services(client, entetes)
    except (httpx.HTTPError, ValueError, json.JSONDecodeError) as erreur:
        print(f"Échec de l'initialisation : {erreur}")
        return 1

    print("Initialisation terminée.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
