# V43.70 — Prévisualisation de la feuille d’inscription

Le Super Admin dispose de « Tests inscription ». Le studio permet de générer un scénario avec des joueurs fictifs, personnaliser les informations, choisir le format et visualiser les étapes de l’inscription au bilan. Il s’ouvre également dans une fenêtre indépendante.

- Les champs d’inscription individuelle, invités, téléphone conditionnel, code équipe, créateur, nom, couleur et composition sont présentés dans le test.
- Le message destiné à tous les inscrits et les missions des co-gestionnaires sont configurables dans des menus repliables. Les encarts sans contenu sont absents de la page.
- Consigne prévue : « Ton avis sera demandé dans la soirée pour valider la composition des équipes. »
- Le lien du direct apparaît au premier match commencé, y compris à 0–0. Les étapes de notation ouverte puis expirée illustrent la fenêtre existante de 48 heures.
- Les règles Roi du terrain et classique sont illustratives. Poules + phases finales et relance individuelle sont des concepts de prévisualisation, sans moteur ni nouveaux droits activés en production.

## Isolation et conservation du lien

Le studio ne charge pas Supabase, ne transmet aucune donnée et n’enregistre aucune inscription, invitation, note ou composition réelle. Sa CSP interdit les connexions réseau de données et l’envoi de formulaires. Aucun changement de schéma ou de données Supabase n’est appliqué.

Le lien d’inscription déjà diffusé conserve son code, son tournoi et ses inscriptions. Le rendu et le traitement du formulaire public existant restent ceux de V43.69. La nouvelle présentation sera activée sur ce même lien uniquement après validation visuelle.

Sauvegarde source : `backup/v43.69-before-registration-preview-20260912`.
Une sauvegarde ciblée du tournoi du 13/09 et de ses 14 inscriptions a été remise séparément ; les données personnelles ne sont pas intégrées au dépôt ni au WWW.

## Vérification

Tests Chromium ordinateur, tablette et mobile : parcours existants, accès au studio depuis le Super Admin, étapes du tournoi, direct à 0–0, conservation des champs lors du choix de nom, consignes vides masquées, formats, composition d’équipe et absence de requêtes externes ou d’écriture. Une version HTML autonome est également vérifiée pour la revue hors installation.

## Utilisation

Installer le contenu de `www` depuis le package V43.70, puis Super Admin → Tests inscription → Personnaliser le test. Le studio est une prévisualisation ; l’installation n’active pas le nouveau rendu sur les inscriptions réelles.
