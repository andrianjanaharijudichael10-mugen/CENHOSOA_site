# CENHOSOA

Application de gestion du centre hospitalier CENHOSOA, composée d'un site web
(React / Vite), d'une API (FastAPI) et d'une application mobile (Expo / React
Native).

## Prérequis

- [Git](https://git-scm.com/)
- [Python 3.10 ou plus récent](https://www.python.org/downloads/)
- [Node.js et npm](https://nodejs.org/)
- [PostgreSQL](https://www.postgresql.org/)

## Récupérer le projet

```powershell
git clone https://github.com/andrianjanaharijudichael10-mugen/CENHOSOA_site.git
cd CENHOSOA_site
```

## Lancer l'API

Démarrez PostgreSQL et créez une base de données (par exemple `homi_base`).
Depuis la racine du dépôt, préparez l'environnement Python :

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Modifiez `Backend\.env` et renseignez au minimum `DATABASE_URL` (par exemple
`postgresql://utilisateur:mot_de_passe@localhost:5432/homi_base`) et
`SECRET_KEY` (clé aléatoire privée). Pour générer une clé, exécutez
`python -c "import secrets; print(secrets.token_urlsafe(32))"`.
Vous pouvez également définir `SUPERADMIN_PASSWORD` pour créer le compte
SuperAdmin au démarrage de l'API.

Appliquez les migrations puis démarrez l'API :

```powershell
alembic upgrade head
uvicorn app.main:app --reload
```

L'API est disponible à <http://localhost:8000>, et sa documentation interactive
à <http://localhost:8000/docs>. Gardez ce terminal ouvert.

## Lancer le site web

Dans un nouveau terminal, depuis la racine du dépôt :

```powershell
cd Frontend
npm ci
npm run dev
```

Ouvrez l'adresse affichée par Vite, généralement
<http://localhost:5173>. Par défaut, le site utilise l'API à
`http://localhost:8000/api/v1`. Pour utiliser une autre adresse, créez
`Frontend\.env` et ajoutez par exemple :

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Lancer l'application mobile (optionnel)

L'application Expo affiche le site dans une WebView : le site web et l'API
doivent donc déjà être démarrés.

```powershell
cd Frontend\mobile
npm ci
npm start
```

Suivez les instructions d'Expo pour ouvrir l'application sur un émulateur ou un
téléphone. Pour un téléphone physique, configurez l'adresse réseau du PC dans
`Frontend\mobile\.env` (`EXPO_PUBLIC_WEB_URL`) et suivez le guide détaillé de
[Frontend/mobile/README.md](./Frontend/mobile/README.md).

## Structure du dépôt

- `Backend/` : API FastAPI, migrations de base de données et tests.
- `Frontend/` : site React/Vite.
- `Frontend/mobile/` : application Expo / React Native.
