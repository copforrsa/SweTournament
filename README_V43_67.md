# SWÉ Tournament V43.67

Le bouton de création d’un match test reste cliquable et explique si la sélection contient moins de 2 ou plus de 12 comptes. Une indication permanente décrit la sélection attendue et confirme lorsque le match est prêt.

Pendant la création, un indicateur de chargement bloque les doubles clics. Une erreur rend le bouton et la sélection disponibles ; une nouvelle tentative conserve l’identifiant de la demande pour éviter les doublons. L’allocation de cet identifiant est protégée par le même traitement des erreurs.

Les contrôles Supabase et la règle de 2 à 12 comptes restent en place. Aucune migration ni modification des données.

Validation navigateur : sélections de 0, 1, 13 puis 2 comptes ; appel de création ; attente ; erreur ; nouvelle tentative ; ouverture du match. Les contrôles existants des résultats publics, de l’inscription et des droits restent inclus.

Sauvegarde : `backup/v43.66-before-test-create-feedback-20260912`.

Déploiement : extraire `swe-www-v43.67.zip` puis copier le contenu de `www` dans `/home/swetouk/www/`.
