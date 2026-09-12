# SWÉ Tournament V43.73

## Problèmes corrigés

- Le navigateur refusait la prérequête CORS du paiement des accès co-gestionnaires : configuration d’origine optionnelle absente. La fonction existante accepte par défaut le domaine canonique de production et continue de vérifier la session et le rôle administrateur avant Stripe. La confirmation native a été retirée ; le prix reste indiqué avant Stripe. Un double clic ne crée pas deux demandes ; une nouvelle tentative conserve son identifiant.
- Les appels concurrents de chargement public reconstruisaient le formulaire alors que des éléments avaient déjà été déplacés dans la présentation. Une ouverture partage maintenant un chargement unique puis la fonction de rafraîchissement existante. La présentation elle-même est idempotente.
- Les dates civiles sont affichées sans conversion au jour précédent dans les fuseaux négatifs. La date de la compétition réelle était déjà le 13 septembre 2026 et n’a pas été modifiée.
- Cinq inscriptions restent visibles ; une section native permet de développer et masquer le reste, en conservant son état pendant l’actualisation. Les classements buteurs et passeurs de saison utilisent les données et les renderers existants, sous les inscrits.
- Les derniers résultats s’ouvrent dans leur page dédiée ; Retour conserve le code court du lien partagé.
- La sélection d’un joueur charge uniquement sa note Academy, par une fonction limitée au lien public, au tournoi et au joueur de ce groupe. Aucun identifiant d’évaluateur ni avis individuel n’est publié. La note Match est la moyenne des matchs terminés du groupe ; les compteurs indiquent explicitement les performances dans le tournoi sélectionné. L’état sans note est affiché simplement.
- L’administrateur peut nommer le groupe de notation dans Tournois → Gérer → Consignes et groupe de notation. La modification reste soumise à la RLS administrateur du workspace.

## Test complet

Super Admin → Tests inscription permet de créer un tournoi classique ou Roi du terrain à une date choisie. Un workspace dédié reçoit 30 joueurs fictifs, 30 inscriptions et des notes variées (deux joueurs sans note). Ces fiches ne sont associées à aucun compte réel. Le tournoi est non répertorié, sans paiement en ligne. Les équipes et matchs restent à créer dans les onglets habituels pour contrôler le processus.

Fixture créée : TEST SWÉ — 30 joueurs — 13/09, code court `3AF14A2`. Le tournoi réel conserve le code court `18BD3F5` et ses 16 inscriptions présentes lors de la sauvegarde.

## Validation

- Syntaxe JavaScript et tests du paiement : prérequête, origine refusée, administrateur autorisé, co-gestionnaire/session invalide refusés, tarifs mensuels et annuels, double clic, erreurs et nouvelle tentative.
- Supabase : lecture anonyme d’une note sélectionnée, absence de note, mauvais jeton/tournoi, concordance de la note Forssa avec les données réelles, création réservée au Super Admin et idempotence.
- Navigateur : ordinateur/tablette/mobile, fuseau Martinique, navigation retour, 30 inscrits avec disclosure, notes, absence de duplication lors de trois chargements concurrents, saisie conservée, classement de saison et scénarios existants de matchs/buts/passes/remplacements/clôture.
- Un paiement réel n’a pas été exécuté : le passage authentifié complet jusqu’à Stripe devra être essayé depuis le compte administrateur. Les appels de test Stripe sont simulés ; les prérequêtes et refus sans session ont été vérifiés sur la fonction déployée.

Le linter Supabase signale volontairement l’entrée publique de lecture en SECURITY DEFINER (contrôle du lien et du périmètre dans la fonction privée) et le registre privé de tests en RLS sans politique (aucun accès direct client). Voir [documentation du linter](https://supabase.com/docs/guides/database/database-linter). Les alertes préexistantes du projet n’ont pas été modifiées dans ce lot.

## Sauvegarde

Branche `backup/v43.72-before-payments-registration-20260912`, commit `2d896ea1cfc21f15debeed2d28bdede59ad189a4`, et archive dédiée des données du tournoi / fonctions avant modification. Aucun déploiement n’exige de changer le lien partagé.
