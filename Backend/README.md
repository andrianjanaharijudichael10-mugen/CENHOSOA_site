# Actualisations en temps réel

L'API diffuse les changements réussis sur `ws(s)://<hôte-api>/api/v1/temps-reel`.
Le navigateur établit cette connexion à partir de `VITE_API_URL` et actualise
les données de la page concernée sans recharger l'application. Les messages ne
contiennent que le domaine modifié, jamais de données patient.

En production, configurez `ORIGINES_AUTORISEES` avec l'origine réelle du
frontend et vérifiez que le proxy HTTP autorise les connexions WebSocket.
La diffusion en mémoire couvre un seul processus backend ; plusieurs workers
ou instances nécessitent un broker partagé pour relayer les événements.