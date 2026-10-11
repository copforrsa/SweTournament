# Première base Android SWÉ

Statut : prototype interne, pas une version prête pour Google Play.

L'application embarque le site depuis les fichiers Git suivis et utilise Supabase en ligne. Aucun serveur distant n'est utilisé comme page d'accueil Capacitor. Le site en production reste indépendant.

## Préparer et construire

Depuis `mobile/`, avec Node 22 ou supérieur :

```
npm ci
npm test
npm run android:sync
```

Pour créer le projet Android la première fois, utiliser `npm run android:init`. Ouvrir ensuite `android/` dans Android Studio, installer les SDK demandés par Gradle, synchroniser et construire une variante debug pour les premiers essais.

Identifiant provisoire : `fr.swetournament.app`. Nom : SWÉ Tournament. Aucun compte de signature ni secret n'est stocké ici.

## Avant diffusion dans Google Play

- Tester sur appareil réel : connexion Supabase, maintien du profil, partage, Retour Android, clavier et import de photo.
- Adapter les origines CORS des fonctions Supabase : la version web autorise actuellement le domaine HTTPS public ; contrôler chaque endpoint avant les essais complets dans la WebView locale.
- Finaliser les liens entrants et les retours de connexion : le partage natif est présent, les Android App Links ne sont pas encore configurés.
- Auditer les liens publics supplémentaires et les téléchargements de rapports qui utilisent encore location.origin.
- Vérifier les parcours de suppression de compte, les abonnements et la déclaration de données.
- Remplacer les icônes Android générées par les ressources SWÉ adaptées.
- Produire et signer un AAB de release ; configurer Play App Signing. Un APK debug ne se téléverse pas comme livraison de production.
- Distribuer d'abord via le test interne du compte organisation Google Play, puis préparer TestFlight séparément sur macOS.

La connexion, les achats, les notifications et les liens entrants ne sont pas déclarés fonctionnels avant leur recette matérielle.
