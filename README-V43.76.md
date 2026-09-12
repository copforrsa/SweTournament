# V43.76

Super Admin : entrée dédiée pour administrer un tournoi test avec sa session isolée, sélection explicite du tournoi, retour au Super Admin. Vérification côté serveur dans le registre existant des tests, avant d’accorder le rôle administrateur dans le groupe de test.

Suppression avec confirmation dans Tests de la page d’inscription : seul le tournoi test et ses données dépendantes sont supprimés. Le groupe et ses joueurs restent disponibles. Les tournois réels sont refusés par cet outil.

Actualisation : le bouton de nouvelle version renouvelle l’URL sans changer les paramètres métier. La page de récupération existante retire caches et anciens service workers, sans vider localStorage ou sessionStorage.

Top 5 à côté des buteurs/passeurs : note Match existante, matchs terminés uniquement, cinq joueurs maximum. Dernier tournoi terminé de la saison avant les premiers résultats du tournoi sélectionné. Affichage conditionné au module Top Player existant. Aucun classement inventé si aucune note n’est disponible.

Validation : tests SQL avec rollback pour les droits, la suppression et la protection des tournois réels ; tests de l’entrée dédiée ; tests navigateur pour confirmation/annulation, conservation du stockage et Top 5 responsive.

Sauvegarde : backup/v43.75-before-test-management.
