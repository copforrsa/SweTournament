# V43.72 — Carte joueur : historique et note exacte

La carte de Forssa omettait les matchs du 30 août : ce tournoi terminé possède des scores et des compositions, mais ses matchs importés sont restés « scheduled », sans dates de début/fin, et ses affectations individuelles sont incomplètes.

- Lecture des compositions pour ces seuls matchs historiques lorsque le joueur n'a pas d'affectation explicite. Une affectation explicite, y compris le banc, reste prioritaire. Les remplacements des matchs modernes sont respectés.
- Les matchs à venir ne comptent pas comme joués ; une avance dans un match en direct ne compte pas comme une victoire.
- Le calcul partagé est limité aux cartes privée et publique par token/code court. Les règles de visibilité et les liens de partage existants sont conservés. Aucun résultat, but, inscription ou rattachement de joueur n'est modifié.
- La carte privée charge ses statistiques actuelles via sa RPC existante au lieu de réutiliser l'ancien état du tableau de bord.
- Les étoiles reflètent la note décimale, affichée explicitement « 3,3 / 5 ». Une note absente affiche « Non noté ». L'ancienne case « Étoiles » devient « Tournois joués ».
- Les deux pages de partage utilisent un seul rendu externe, compatible avec leur politique CSP.
- Le tableau de bord global et la RPC publique par ID restent inchangés : l'élargissement initial a été refusé par le contrôle automatique ; seule la correction ciblée des cartes a été appliquée.

Vérification Supabase : Forssa SWE-B2A9B0CB, 2 tournois, 12 matchs, 3 victoires, 2 buts, 0 passe, 0 tournoi remporté, note 3,3/5. Cartes privée et publique identiques ; note égale à celle du profil.

Migration appliquée : `player_card_statistics_only_v4372`, source `supabase/player_card_stats_v4372.sql`. Calcul interne privé non exécutable par anon/authenticated ; cartes accessibles selon leurs autorisations existantes. Tests SQL en tables temporaires et transaction annulée : historique incomplet, remplacement, banc, futur, direct, match nul, but contre son camp, égalité des rôles.

Sauvegarde des sources : branche `backup/v43.71-before-player-card-stats-20260912`. Définitions SQL avant changement dans `supabase/backups/pre_v4372_player_card_functions.sql`. Sauvegarde ciblée des données et fonctions également remise en ZIP.

Cette version conserve la page premium V43.71 publiée et le lien d'inscription du 13/09 : https://app.swetournament.fr/?s=18BD3F5.

Validation de livraison : syntaxe JS, suite de non-régression existante, cartes privées/publiques aux largeurs 1280/768/360, liens courts et tokens, note nulle, carte indisponible et captures. Les tests navigateur simulent tous les appels distants, sans écriture en production.
