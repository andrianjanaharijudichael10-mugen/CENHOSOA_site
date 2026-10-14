# CENHOSOA Mobile

Application React Native avec Expo, compatible iOS, Android et navigateur. Elle utilise le backend FastAPI et les mêmes routes REST que le portail web.

## Prérequis

- Node.js LTS et npm
- Python et l’environnement du backend configuré
- Le backend CENHOSOA lancé sur le port `8000`

## Tester dans un navigateur

Depuis un terminal PowerShell :

```powershell
cd "Frontend\mobile"
Copy-Item .env.example .env
npm install
npm run web
```

Ouvrir l’adresse affichée par Expo (généralement `http://localhost:8081`). Le backend doit être démarré séparément :

```powershell
cd "Backend"
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Les origines locales `localhost:8081` et `127.0.0.1:8081` sont autorisées par défaut dans la configuration CORS du backend. Si Expo affiche une autre origine, l’ajouter à `ORIGINES_AUTORISEES` dans `Backend\app\core\config.py`, puis redémarrer FastAPI.

## URL de l’API

La variable `EXPO_PUBLIC_API_URL` configure la base de l’API. La valeur de développement dans `.env.example` est :

```text
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

- Navigateur sur le même ordinateur : `localhost`
- Émulateur Android : `http://10.0.2.2:8000/api/v1`
- Téléphone physique : remplacer `localhost` par l’adresse IP LAN de l’ordinateur qui héberge FastAPI. Le téléphone et l’ordinateur doivent être sur le même réseau.

Après toute modification de `.env`, redémarrer Expo. Le backend doit être accessible depuis l’appareil et autoriser l’origine du navigateur.

## Autres commandes

```powershell
npm run android
npm run ios
npm run check
```

`npm run check` vérifie la compatibilité des dépendances avec Expo. Pour générer un bundle web statique :

```powershell
npx expo export --platform web
```

## Fonctionnalités mobiles

- Accueil public, consultation des spécialités et authentification patient/personnel.
- Demande de rendez-vous sur créneau ou à une date souhaitée, annulation et suivi.
- Demande d’ambulance pour un patient connecté ou un visiteur, simulation d’itinéraire et suivi sécurisé par jeton pour les demandes invitées.
- Interfaces de planning, dossiers, lits, régulation des missions et administration selon le rôle retourné par l’API.
- Profil patient et déconnexion.
- Actualisation des vues concernées à la réception des notifications WebSocket.

Les fonctionnalités d’administration, de dossier médical et de gestion opérationnelle restent adaptées aux écrans mobiles ; elles ne reproduisent pas encore chaque action avancée du portail web.

Sur iOS et Android, les jetons sont conservés dans `expo-secure-store`. Sur le web, ils sont conservés dans `localStorage`, qui n’offre pas les mêmes garanties de stockage chiffré que le stockage natif.
