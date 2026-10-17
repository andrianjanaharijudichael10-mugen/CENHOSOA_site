# CENHOSOA Mobile

Application Expo / React Native qui affiche le site CENHOSOA dans une WebView.
Les pages, comptes et fonctionnalités restent ceux du site; l’application
nécessite donc une URL web accessible depuis le téléphone.

## Configuration

Pour le test local, utiliser une URL locale du site web de référence. Le fichier
`.env` est prêt avec :

```env
EXPO_PUBLIC_WEB_URL=http://127.0.0.1:5173
EXPO_PUBLIC_ALLOW_INSECURE_WEBVIEW=true
```

En production, il faut utiliser une URL HTTPS publique. Ne publiez pas de secrets
dans les variables `EXPO_PUBLIC_*` : elles sont intégrées au binaire de
l’application.

## Démarrer

```powershell
npm install
npm start
```

Utiliser Expo Go ou un build de développement sur un appareil Android/iOS.
Après toute modification de l’URL, redémarrer Expo pour intégrer la nouvelle
configuration.

## Navigation

- Le bouton de retour natif Android et le bouton de l’en-tête reviennent dans
  l’historique de la WebView.
- L’actualisation relance le chargement du site.
- Les liens HTTPS externes et les liens `tel:`, `sms:` et `mailto:` sont ouverts
  dans l’application appropriée du téléphone.
- JavaScript, stockage local et cookies sont activés pour permettre au site de
  conserver les sessions et l’authentification.
