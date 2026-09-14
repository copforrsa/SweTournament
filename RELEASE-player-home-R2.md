# Accueil joueur R2

La page joueur présentait les réglages avant les matchs et conservait un long menu d'organisation. L'accueil met désormais les SWÉs rapides, les inscriptions, les statistiques et les matchs créés au premier plan.

## Comportement

- Logo officiel, rubriques Accueil / Mes inscriptions / Mes SWÉs / Mes stats / Mon profil ; menu mobile dédié.
- Menu du compte : profil joueur, espaces déjà accessibles, déconnexion. Réutilise le sélecteur d'espace et le bouton de déconnexion existants.
- Quatre statistiques colorées à l'accueil, huit et filtre de groupe dans Mes stats.
- SWÉs publics et sur demande : mêmes listes, champs, confirmations et actions qu'avant ; aperçu limité à deux événements, liste complète via Tout voir.
- Mes SWÉs : données du RPC existant `get_my_community_swes_v2`, gestion dans le créateur existant. Erreur explicite, délai maximal de 10 secondes, cache mémoire par utilisateur et invalidation lors d'une visite du créateur.
- Les inscriptions aux matchs rapides s'ajoutent aux inscriptions aux tournois.
- Offre organisateur reliée au parcours existant ; aucune nouvelle règle de facturation.
- Les invitations co-gestionnaire conservent leurs éléments, leurs actions et leurs conditions de paiement.

## Compatibilité

Les nouvelles rubriques n'utilisent ni `.tab`, ni `.view`, ni `data-view`. Le routeur `setView`, les onglets natifs, leurs droits, les formulaires et les événements de paiement ne sont pas remplacés. Le style de navigation est limité à la vue joueur active. Les autres vues retrouvent le menu existant. Aucun observateur DOM permanent ajouté.

Le créateur rapide émet désormais `swe:page-view` après son ouverture, comme les autres vues, pour désactiver immédiatement la présentation joueur. Les ressources R2 portent de nouvelles références de cache. Le site vitrine OVH n'est pas concerné.

## Vérification

- 53 tests locaux réussis, dont 5 scénarios DOM dédiés aux rubriques, à la navigation admin/co-gestionnaire et aux droits, au retour du créateur, aux formulaires conservés, aux actions d'inscription, au compte et à l'isolation des données.
- Syntaxe des trois JavaScript modifiés/ajoutés contrôlée.
- Fonction de lecture existante vérifiée en production : filtrage par utilisateur connecté et refus sans authentification. Aucune migration ni fonction serveur modifiée.
- Navigateur partagé déconnecté ; aperçu local bloqué dans cet environnement. Le rendu final dans une session joueur réelle reste à vérifier. Les tests DOM ne valident pas les pixels ni un paiement réel.

## Retour arrière

Retirer le chargement de `player-home.js` dans `hotfix-v4244.js` et la feuille `player-home.css` de `index.html`, puis changer la référence du chargeur. La structure et les handlers d'origine sont conservés. Aucun retour arrière en base nécessaire.
