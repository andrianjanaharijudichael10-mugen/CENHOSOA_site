import os
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

# 1. URL de base de votre API
BASE_URL = "http://127.0.0.1:8000"

# Vos identifiants SuperAdmin
IDENTIFIANT = os.environ.get("SUPERADMIN_IDENTIFIANT", "admin-cenhosoa")
PASSWORD = os.environ.get("SUPERADMIN_PASSWORD")
if not IDENTIFIANT or not PASSWORD:
    raise SystemExit("Configurez SUPERADMIN_IDENTIFIANT et SUPERADMIN_PASSWORD dans l'environnement.")

print("1. Connexion en cours pour récupérer le token...")

login_url = f"{BASE_URL}/api/v1/auth/connexion"

payload = {
    "identifiant": IDENTIFIANT,
    "mot_de_passe": PASSWORD
}

response = requests.post(login_url, json=payload)

if response.status_code != 200:
    exit(f"❌ Erreur de connexion ({response.status_code}) : {response.text}")

data = response.json()
token = data.get("access_token") or data.get("token")

if not token:
    exit(f"❌ Connexion réussie mais token introuvable : {data}")

print("✅ Token récupéré avec succès !")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print("\n2. Mise à jour des informations globales du centre...")
# Ajout du préfixe /api/v1/
info_url = f"{BASE_URL}/api/v1/informations-centre"
info_payload = {
    "email_centre": "contact@cenhosoa.mg",
    "telephones": [
        {"numero": "020 22 XXX XX", "libelle": "Standard", "ordre": 1},
        {"numero": "034 XX XXX XX", "libelle": "Urgences", "ordre": 2}
    ]
}

response_info = requests.put(info_url, json=info_payload, headers=headers)
if response_info.status_code in [200, 201]:
    print("✅ Informations globales mises à jour avec succès !")
else:
    print(f"⚠️ Erreur lors de la mise à jour des infos ({response_info.status_code}) : {response_info.text}")

print("\n3. Création des services...")
# Ajout du préfixe /api/v1/
services_url = f"{BASE_URL}/api/v1/services"
services_a_creer = [
    {
        "nom": "Cardiologie",
        "description": "Service de soins et de diagnostic cardiovasculaire",
        "actif": True
    },
    {
        "nom": "Urgences",
        "description": "Prise en charge des urgences médicales 24h/24",
        "actif": True
    }
]

for service in services_a_creer:
    response_service = requests.post(services_url, json=service, headers=headers)
    if response_service.status_code in [200, 201]:
        print(f"✅ Service '{service['nom']}' créé avec succès !")
    else:
        print(f"⚠️ Erreur pour le service '{service['nom']}' ({response_service.status_code}) : {response_service.text}")

print("\n🎉 Initialisation terminée !")