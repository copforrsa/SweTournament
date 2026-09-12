# SWÉ Tournament V43.67

Un clic sur « Créer 1 match test automatique » génère 10 joueurs fictifs, deux équipes de 5 et un match isolé. La sélection de comptes SWÉ est facultative : chaque compte sélectionné remplace un joueur fictif et peut consulter le test. Avec 11 ou 12 comptes, le test comporte deux équipes de 6. Aucun compte Auth ni profil joueur réel n’est créé.

Le lien « Ouvrir l’onglet Matchs » charge le renderer existant de Matchs en mode test. Le Super Admin peut démarrer, saisir les scores, ajouter un buteur/passeur, annuler un but et terminer le match. Les résultats du même match sont accessibles dans l’onglet Direct. Les comptes sélectionnés peuvent consulter ; la modification reste réservée au Super Admin et contrôlée côté Supabase.

Les données de test restent isolées des groupes et statistiques réels. Le bouton indique le chargement, empêche les doubles clics et permet de réessayer après une erreur avec la même demande.

Validation : génération avec 0, 1 et 4 comptes, équipes complétées à 10 joueurs, idempotence, droits, scores et buts contrôlés dans une transaction annulée ; parcours navigateur PC/tablette/mobile utilisant le module Matchs partagé ; contrôles existants conservés.

Sauvegarde : `backup/v43.66-before-test-create-feedback-20260912` et `supabase/backups/pre_v4367_match_test_functions.sql`.

Migration Supabase appliquée : `20260912022633_automatic_test_match_players_v4367.sql`.

Déploiement : extraire `swe-www-v43.67.zip` puis copier le contenu de `www` dans `/home/swetouk/www/`.
