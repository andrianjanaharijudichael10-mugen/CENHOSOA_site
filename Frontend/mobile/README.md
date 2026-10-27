# CENHOSOA Mobile

Application Expo / React Native qui affiche le site CENHOSOA dans une WebView.
Les pages, comptes et fonctionnalités restent ceux du site; l’application
nécessite donc une URL web accessible depuis le téléphone.

## Tester sur un téléphone connecté au même Wi-Fi

Les commandes partent de `Frontend\mobile`. Ouvrez un terminal séparé pour
chaque serveur et laissez-les tourner pendant le test.

Le téléphone doit pouvoir joindre le serveur web et l'API sur l'adresse Wi-Fi
du PC. Repérez l'adresse IPv4 de l'interface Wi-Fi avec `ipconfig` (sur ce PC,
elle est actuellement `192.168.43.137`) et remplacez cette adresse dans les
exemples ci-dessous si elle change.

1. Démarrez l'API en autorisant l'origine du site et les connexions du réseau :

   ```powershell
   cd ..\..\Backend
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

   Dans `Backend\.env`, ajoutez
   `ORIGINES_AUTORISEES=["http://192.168.43.137:5173","http://localhost:5173","http://127.0.0.1:5173"]`,
   puis redémarrez l'API pour que FastAPI recharge cette autorisation CORS. Si
   vous définissez aussi cette variable dans PowerShell, utilisez la même liste
   complète : les variables de session remplacent celles du fichier `.env`.

2. Dans un autre terminal, démarrez le site en le rendant accessible sur le
   réseau Wi-Fi, et indiquez à ses appels API l'adresse du PC :

   ```powershell
   cd ..\Frontend
   $env:VITE_API_URL="http://192.168.43.137:8000/api/v1"
   npm run dev -- --host 0.0.0.0
   ```

3. Vérifiez sur le téléphone, dans son navigateur, que
   `http://192.168.43.137:5173` et `http://192.168.43.137:8000/` sont accessibles.
   Si Windows affiche une demande de pare-feu, autorisez Node.js et Python sur
   les réseaux privés. Vérifiez que le PC et le téléphone sont sur le même
   Wi-Fi, sans isolation des appareils clients.

4. Dans `Frontend\mobile\.env`, configurez l'URL du site et l'accès HTTP local :

```env
EXPO_PUBLIC_WEB_URL=http://192.168.43.137:5173
EXPO_PUBLIC_ALLOW_INSECURE_WEBVIEW=true
```

5. Générez puis installez l'APK autonome de test sur le téléphone :

   ```powershell
   subst R: (Resolve-Path ..\..).Path
   Set-Location R:\Frontend\mobile\android
   .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
   Set-Location $env:TEMP
   subst R: /D
   ```

   Le lecteur court évite la limite de longueur de chemin de Windows pendant la
   compilation native; l'APK est configuré pour les téléphones Android ARM64.
   L'APK se trouve dans
   `Frontend\mobile\android\app\build\outputs\apk\release\app-release.apk`.
   Transférez-le sur le téléphone pour l'installer. Ce build local de test est
   signé avec la clé debug du projet et n'est pas destiné à la publication sur
   Google Play. Le téléphone doit pouvoir joindre le PC tant que l'application
   est utilisée.

Les modifications du site rechargées par Vite sont visibles sans reconstruire
l'APK. Il faut le reconstruire après un changement de son URL `.env`. L'accès
HTTP et les adresses IP privées ne sont autorisés que pour ce mode de test local.

Pour un déploiement, servez le site et l'API derrière des URL publiques HTTPS,
mettez à jour `VITE_API_URL`, `ORIGINES_AUTORISEES` et
`EXPO_PUBLIC_WEB_URL`, puis générez un build de production. Ne publiez pas de
secrets dans les variables `EXPO_PUBLIC_*` : elles sont intégrées au binaire.

## Navigation

- Le site responsive occupe toute la zone d’affichage de la WebView; aucune
  barre de navigation native ne réduit l’espace de la page.
- Le bouton de retour natif Android revient dans l’historique de la WebView.
- JavaScript, stockage local et cookies sont activés pour permettre au site de
  conserver les sessions et l’authentification.
- Les liens HTTPS externes et les liens `tel:` et `mailto:` sont ouverts
  dans l’application appropriée du téléphone.
