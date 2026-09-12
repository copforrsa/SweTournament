# SWÉ Tournament V43.66

Les détails du tournoi se referment avec « Masquer les détails », en haut ou en bas du bloc ouvert. Le bouton « Gérer » devient « Masquer » lorsque les détails sont ouverts.

La fermeture reste effective après un chargement ou un rendu différé. Elle conserve le tournoi sélectionné et ses données. Aucune migration Supabase.

Les deux noms d’équipe des résultats publics et de l’historique utilisent la même taille et le même badge sombre. Les scores sont centrés dans une colonne de largeur constante ; les buteurs restent sous leur équipe. Le module existant ne confond plus le premier nom d’équipe avec le score.

La sélection des comptes de match test affiche leur nombre et permet de développer ou réduire toute la liste. La recherche par nom ou ID et les cases déjà cochées restent disponibles. Aucun compte supplémentaire n’est créé.

La validation navigateur couvre l’ouverture, la fermeture, la réouverture et la fermeture pendant le chargement sur PC, tablette et mobile, ainsi que les contrôles existants d’inscription, de droits, de résultats et de rapports.

Sauvegarde avant correction : branche `backup/v43.65-before-collapse-20260912`.

Déploiement : extraire `swe-www-v43.66.zip`, puis copier le contenu de `www` dans `/home/swetouk/www/`.
