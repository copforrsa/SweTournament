# SWÉ Tournament — norme des processus (audit 13 octobre 2026)

## Objectif
Chaque format définit une identité et un parcours déterministes. Les confirmations humaines (vote, score, départage, publication) ne sont jamais remplacées par des décisions automatiques.

| Étape | Implémentation existante | Vérification restante |
|---|---|---|
| Format et identité | `tournaments.format`, `registration-presentation.js`, `registration-format-identity.css` | Contrôle visuel sur tous les formats |
| Inscriptions | `tournament_players`, capacité maximale | Paliers 28/30 puis 30/30; attente et désinscription |
| Composition | `teams`, `team_players`, tirage | Cohérence des six équipes de cinq |
| Vote collégial | `team_draw_room_*_v2`; droits des votants choisis indépendants de leur inscription joueur | Test réel multi-comptes, publication et délai |
| Matchs Roi du terrain | `swe_king_start_with_tie_v1` | Vérifier génération initiale des 3 rencontres après publication des compositions |
| Résultats | `goals.is_own_goal`, départage, `match-finish-audit-ui.js` | Buts/CSC/TAB et clôtures |
| Rotation Roi du terrain | `private.swe_king_advance_v1` version 2 | 3 tours complets; aucun match partiel |
| Conquête/Fast | `conquest_*_v2`, `fast_conquest_commit` | Scénarios de bout en bout propres à chaque format |
| Glacière | `tournaments.third_half_active` | Vérification des contributions et récapitulatif |
| Statistiques/archives | Données matchs, buts, notation | Fin de tournoi, classements et historique |

## Diagnostic serveur
`public.swe_tournament_process_audit_v1(tournament_id)` fournit aux administrateurs un diagnostic **en lecture seule** : inscrits, équipes, matchs terminés, vote, glacière, version de rotation, prochaine étape et blocages. Il ne lance aucune opération métier. L'intégration visuelle de ce diagnostic au tableau d'administration reste à faire.

## Règles invariantes
- Un co-gestionnaire actif sélectionné par l'administrateur peut voter sans être inscrit comme joueur.
- Un joueur ajouté à une équipe ou retiré doit être reflété dans les inscriptions et les feuilles de match selon le parcours validé.
- Un résultat nul conserve le score et enregistre séparément le vainqueur et la méthode du départage.
- Pour le Roi du terrain version 2, trois rencontres sont générées uniquement après validation des trois résultats du tour précédent.
- Aucun match réel ne doit être terminé ou tournoi publié par une routine de diagnostic.

## Test de recette obligatoire
Créer un tournoi de test avec des membres existants autorisés, compléter les inscriptions, recueillir les votes dans différents comptes, publier les compositions, jouer trois tours simulés contrôlés, puis vérifier scores, CSC, départages, classement, glacière et archives. Ne pas qualifier le flux de « validé » avant exécution de cette recette.
