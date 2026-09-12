# V43.69 — Matchs tests partagés

Le match test apparaît dans le sélecteur de l’onglet Matchs. Il est partagé avec l’administrateur et les co-gestionnaires ayant le droit de saisie des scores dans l’espace choisi par le Super Admin. Le destinataire peut aussi retrouver son test depuis ses autres espaces où il dispose du droit Matchs ; son autorisation dans l’espace d’origine reste obligatoire.

Le module existant de saisie rapide et de remplacement est réutilisé. Deux remplaçants fictifs sont ajoutés aux nouveaux tests et aux tests encore ouverts. Le test permet de saisir ou annuler un but, ajouter/modifier/retirer un passeur, remplacer un joueur et terminer le match. Les scores et buts précédents restent conservés lors d’un remplacement. Les joueurs fictifs restent dans l’espace isolé du test.

La politique CSP autorise désormais le module intégré de même origine, ce qui corrige le panneau gris. La sélection est conservée après actualisation et séparée du tournoi réel actif.

## Sauvegarde et base

- Branche avant modification : `backup/v43.68-before-test-visibility-substitutes-20260912`.
- Fonctions sauvegardées : `supabase/backups/pre_v4369_test_management.sql`.
- Migration appliquée : `20260912085739_test_visibility_substitutes_v4369.sql`.
- Les modifications serveur sont limitées aux matchs tests. La fonction d’affectation et le traitement des remplacements des matchs normaux sont conservés.

## Validation

- Tests SQL transactionnels : administrateur, co-gestionnaire autorisé, co-gestionnaire sans droit, joueur simple, révocation des droits, partage dans l’espace, buteurs/passeurs, remplacements et isolation.
- Tests navigateur Chromium en largeurs 1280, 768 et 360 : vraie CSP, sélecteur Matchs, rechargement, changement d’espace, saisie rapide, remplacements, fin et direct.
- Régressions couvertes : inscription, historique, invités repliables, gestion du tournoi, génération d’équipes, rapports et rendu des matchs normaux.

## Installation

Extraire `swe-www-v43.69.zip`, puis copier le contenu du dossier `www` dans `/home/swetouk/www/`. Le ZIP contient directement `www`, sans archive imbriquée. Après rechargement, vérifier V43.69. Dans l’espace concerné, ouvrir Matchs et choisir « Match test » dans la liste.
