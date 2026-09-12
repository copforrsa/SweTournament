# V43.71 — Feuille d’inscription premium en production

Le rendu validé est relié au formulaire existant et au snapshot réel. Le code court, le tournoi ciblé, les inscriptions et les RPC d’inscription existants sont conservés. Les champs sont déplacés dans la présentation, sans duplication de formulaire ni nouvel observateur du DOM.

- Repères : vert inscriptions, bleu équipes, orange direct, violet résultats, doré consignes et turquoise missions.
- Même lien avant et après clôture : participants consultables, direct dès le premier match commencé (y compris 0–0), résultats après la fin.
- Encarts facultatifs vides absents. Invités, règles d’inscription, règles du format et historique se développent et se replient.
- Les règles rappellent les remplaçants, les cinq invitations et la tournée à la prochaine édition en cas de désistement de dernière minute. Le signalement d’absence reste disponible après fermeture, jusqu’à la fin du tournoi.
- Un membre retrouve les invités des éditions précédentes, sélectionne un ancien invité ou saisit un nouveau nom. Les invités déjà inscrits sont indiqués et non sélectionnables. Le RPC existant retrouve la fiche par nom ; aucune deuxième structure d’invités n’est créée.
- Tournois → Gérer → Consignes : message pour tous et choix des missions. L’écriture utilise les RLS administrateur existantes. Les missions personnelles sont disponibles pour le co-gestionnaire connecté lorsqu’il sélectionne son nom ; elles n’accordent aucun droit de tirage ou de notation.

## Base et droits

Migration additive `registration_briefing_authenticated_v4371` : colonne JSON publique pour le message/les choix de consignes ; RPC personnel en lecture seule, réservé aux comptes authentifiés membres administrateurs/co-gestionnaires du workspace ciblé. Aucun identifiant d’un autre compte ni jeton de notation n’est retourné.

Les fonctions existantes d’inscription, de validation d’équipes et de matchs ne sont pas modifiées. La fenêtre de notation est lue dans les sessions existantes. Les règles de tirage et les autorisations de notation existantes restent contrôlées côté serveur.

Sauvegarde du code : `backup/v43.70-before-premium-production-20260912`. Sauvegarde privée du tournoi et de ses 16 inscrits remise séparément. Elle n’est pas incluse dans le dépôt ou le package WWW.

## Validation

Chromium ordinateur/tablette/mobile : même lien court, inscriptions, anciens/nouveaux invités, champs conservés pendant rafraîchissement, ouverture/fermeture des règles, live 0–0, clôture puis fin, historique, saisie de matchs et studio Super Admin. Requêtes distantes simulées durant les tests navigateur : aucune inscription de test dans le tournoi réel.

RLS en transactions annulées : administrateur autorisé à modifier les consignes ; co-gestionnaire en lecture personnelle, sans écriture ; compte extérieur sans accès ; RPC personnel inaccessible à `anon`.

Le domaine actif est servi par GitHub Pages (CNAME du dépôt et réponse du serveur vérifiés). Promotion sur `main` après succès des tests, puis contrôle de la publication Pages et des fichiers servis. Le package WWW reste disponible comme livrable de secours, avec `www/` directement à l’intérieur.
