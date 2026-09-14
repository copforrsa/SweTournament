# SWÉ Tournament V43.99

## Diagnostic et évolution

- Le dashboard co-gestionnaire réutilisait l'accueil commun et ne rendait pas visibles les tâches attendues.
- Le nouveau dashboard premium est alimenté par le tournoi sélectionné et remplace seulement le contenu de l'accueil co-gestionnaire.
- Aucun observateur DOM permanent n'a été ajouté afin de préserver la correction de stabilité Edge de la V43.98.

## Connexions conservées

- Vote des équipes : écran `Équipes`, RPC `get_tournament_team_review_state` et `vote_tournament_team_review`.
- Notation des joueurs : route `?rate=<tournament_id>`, RPC `get_post_tournament_rating_sheet` et `submit_post_tournament_player_review`.
- Navigation : écrans existants `players`, `teams`, `matches` et `ranking`.
- Contexte : `S.activeTour`, `loadTournament()` et les données déjà chargées pour le tournoi actif.

## Données et progressions

- Vote d'équipe : `0 / nombre d'équipes` avant le vote global de composition, puis `nombre d'équipes / nombre d'équipes` une fois le verdict enregistré.
- Notation : nombre de joueurs distincts déjà notés par l'évaluateur / joueurs présents, confirmés et affectés à une équipe.
- Le compteur d'actions inclut uniquement les actions ouvertes, autorisées et non terminées.
- La première mise en avant de « Joueurs / Notes » est persistée par `utilisateur + tournoi` dans le schéma privé.

## Migrations

- `20260913235729_coorganizer_tournament_dashboard_onboarding.sql`
- `20260913235832_coorganizer_tournament_action_progress.sql`
- `20260914000413_coorganizer_onboarding_tournament_index.sql`

Les fonctions sont `SECURITY DEFINER`, utilisent un `search_path` vide, refusent `anon` et ne sont exécutables que par `authenticated`. La table d'onboarding est privée et accessible uniquement via RPC.

## Tests

- Scénarios automatisés : tournoi sélectionné, progressions, première visite persistante, permissions serveur, responsive et accessibilité.
- Contrôle visuel Playwright : avant, après ordinateur et après mobile.
