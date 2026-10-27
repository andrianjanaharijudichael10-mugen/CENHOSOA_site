# Actualisations en temps réel

L'API diffuse les changements réussis sur `ws(s)://<hôte-api>/api/v1/temps-reel`.
Le navigateur établit cette connexion à partir de `VITE_API_URL` et actualise
les données de la page concernée sans recharger l'application. Les messages ne
contiennent que le domaine modifié, jamais de données patient.

En production, configurez `ORIGINES_AUTORISEES` avec l'origine réelle du
frontend et vérifiez que le proxy HTTP autorise les connexions WebSocket.
La diffusion en mémoire couvre un seul processus backend ; plusieurs workers
ou instances nécessitent un broker partagé pour relayer les événements.

## Initialiser les données de base

Après le démarrage de l'API et la création du compte SuperAdmin, le script
`setup_cenhosoa.py` peut créer les services Cardiologie et Urgences s'ils ne sont
pas déjà présents. Il conserve les informations du centre si aucune valeur
optionnelle n'est fournie.

Configurez `SUPERADMIN_IDENTIFIANT` et `SUPERADMIN_PASSWORD` dans `.env`.
`CENHOSOA_API_URL` permet de remplacer l'URL locale par défaut. Pour mettre à
jour les coordonnées du centre, configurez `CENTRE_EMAIL` et/ou
`CENTRE_TELEPHONES_JSON`, ce dernier devant contenir un tableau JSON de numéros,
libellés et ordre d'affichage. Puis exécutez :

```powershell
python setup_cenhosoa.py
```