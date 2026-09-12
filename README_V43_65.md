# SWÉ Tournament V43.65

L’historique public était interrompu par une référence à `regs` hors de sa portée. Le module additionnel appelait aussi `get_public_workspace_snapshot_v2` avec `p_public_token` au lieu de `p_token` et ne lisait pas le contexte des liens courts. Le rendu est désormais effectué dans `app.js` à partir de son snapshot existant. Les invités et les résultats du tournoi précédent sont repliés au départ, les liens d’historique conservent le retour vers l’inscription.

Le compteur utilise les totaux existants pour les inscriptions et les saisons. Les autres pages de l’application ont un compteur distinct, visible en pied de page. L’onglet Super Admin → Rapports donne les vues cumulées par page et la dernière consultation. Il s’agit de vues, pas de visiteurs uniques ; aucun email, téléphone ou paramètre d’URL secret n’est enregistré par ce compteur. Les vues antérieures à son activation ne sont pas reconstituées.

Super Admin → Match test permet de choisir 2 à 12 comptes par ID SWÉ et de créer exactement un match. L’identifiant de demande protège contre une double création en cas de répétition de la requête. Le Super Admin démarre le match, choisit un buteur et un passeur, ajoute/annule un but et termine le match. Le lien Live utilise le renderer existant et se met à jour toutes les 15 secondes. Seuls les comptes sélectionnés et les Super Admin peuvent lire ce match ; seul le Super Admin peut le piloter. Aucune invitation n’est envoyée automatiquement.

La simulation utilise les tables `matches`, `goals` et `match_player_assignments` et leurs déclencheurs existants. Elle crée un espace explicitement nommé TEST, sans accès public ni adhésion des joueurs, et des fiches de simulation sans lien aux profils globaux. Les statistiques réelles et les compétitions existantes restent séparées de cette simulation. Les tests récents restent consultables depuis le Super Admin.

Tournois → Générer les équipes équilibrées appelle `runSmartTeamGeneration` sur le tournoi choisi. La confirmation existante reste requise lorsqu’une génération remplace des équipes ou des matchs.

`build-version.js` est l’unique source de `SWE_BUILD_VERSION`. Les anciens modules ne réécrivent plus cette variable et le chargement en double des anciens scripts a été retiré. La protection du sélecteur Samsung de V43.64 est conservée.

Validation : syntaxe JavaScript ; tests des compteurs ; parcours navigateur PC/tablette/mobile avec données simulées ; création, score/buteur/passeur, annulation et fin testés dans Supabase avec ROLLBACK ; contrôle des refus pour admin standard, co-gestionnaires, joueurs et accès anonyme. Un essai physique sur Samsung/iPhone reste à faire après copie du WWW.

La migration `20260912120000_page_reports_and_match_tests.sql` a déjà été appliquée au projet Supabase SWÉ. Les tests SQL du dossier `tests` s’exécutent avec privilèges d’administration dans une transaction annulée et ne doivent pas être utilisés comme données de démonstration.

Sauvegarde : branche `backup/v43.64-before-match-test-reports-20260912` au commit `da5fed264f0ea218b1d55429741ac2662d96c1b1`. L’archive SQL conservée séparément contient les définitions du schéma et des fonctions, pas les lignes métier ni Auth/Storage. Elle n’est pas un export complet de base.

Déploiement : extraire le ZIP WWW puis copier le contenu de `www` dans `/home/swetouk/www/`. Ne pas téléverser le dossier de tests ni les sauvegardes SQL dans le répertoire web public. Aucun changement de chmod/chown n’est nécessaire pour ce lot.
