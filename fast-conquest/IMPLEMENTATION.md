# Fast Conquête — intégration et recette

L'intégration est préparée dans la branche `feature/fast-conquete` et la PR 21. Elle n'est pas activée en production : les migrations et l'Edge Function restent à déployer après la recette connectée et PWA demandée avant mise en production.

## Implémentation

- Moteur à six équipes et trois terrains, deux qualifications, Conquête 1, Conquête 2 et deux finales seulement : 14 matchs. Départages parfaits par tirage serveur validé par l'organisateur ; trois tirs au but par équipe, puis mort subite. Classement final, Champion et Roi du terrain.
- Commandes serveur authentifiées, abonnement effectif existant, droits organisateur et co-gestionnaire désigné. État client ignoré, verrou et contrôle de version en base. Les rencontres utilisent les tables existantes de matchs, buts et affectations pour les statistiques.
- Création avec mode obligatoire, six équipes équilibrées à partir des notes effectives, gestion des capitaines, vote collégial confidentiel, échanges précis, verrouillage et refus d'un remplaçant par équipe.
- Brouillons confidentiels des co-gestionnaires présents, modifiables jusqu'à clôture. Un seul report dans l'historique à la clôture ; les notes historiques ne deviennent pas modifiables.
- Identité terre cuite/bordeaux/noir, progression, phases, classement, vainqueurs aux tirs au but, direct, espace organisateur et espace confidentiel en haut des résultats. La PWA reçoit une nouvelle version de cache lors du déploiement.
- Corrections et suppressions réservées à l'organisateur autorisé. Les phases dépendantes sont réinitialisées explicitement lors d'une correction ou suppression. Un match supprimé doit être régénéré pour poursuivre le tableau.
- Les statistiques Fast Conquête utilisent le vainqueur de la finale pour les trophées, le vainqueur des tirs au but pour les victoires et les matchs terminés pour les apparitions. Les phases décisives ne changent pas le classement qualificatif.

## Vérifications effectuées le 7 octobre 2026

44 tests Node/jsdom passent : 22 Fast Conquête et 22 tests existants sur la saisie des matchs, les droits, le championnat, le circuit Roi du terrain, les rôles et les remplaçants. Vérification syntaxique des JavaScript modifiés et `git diff --check` sans erreur.

Tests SQL exécutés dans des transactions annulées, sans tournoi de test conservé :

- parcours complet des 14 rencontres et six places finales ; aucun match Boulogne dans les finales ;
- même parcours réalisé par un co-gestionnaire désigné autorisé à saisir les scores ; validation du départage réservée à l'organisateur ;
- privilèges des RPC, confidentialité des tables, refus d'un co-gestionnaire non désigné, blocage des tours futurs et verrouillage des équipes ;
- génération des six équipes, modification d'un vote, échange précis appliqué par l'organisateur, verrouillage et suppression du tournoi ;
- modification d'une note avant clôture, absence de publication prématurée, report unique de la note finale dans l'historique, refus de modification après clôture.

`integration-sql.cjs` reproduit le parcours complet en transaction annulée avec un groupe de test autorisé et les variables FAST_TEST_OWNER, FAST_TEST_WORKSPACE et FAST_TEST_PITCHES (trois UUID séparés par des virgules). Ce fixture insère directement les confirmations des capitaines ; il ne remplace pas la recette de leur connexion réelle.

## Vérifications restant nécessaires avant production

Le navigateur disponible affiche l'écran de connexion : aucun parcours avec un compte organisateur, co-gestionnaire ou capitaine n'a été validé dans le navigateur. Aucun test sur Android PWA ou iPhone PWA réel n'a été réalisé. Le transport HTTP de l'Edge Function, la connexion des capitaines, les interactions complètes entre les écrans, les performances et le rendu visuel sur ces appareils restent à vérifier.

L'audit des abonnements réutilise les droits existants. Il ne constitue pas une validation exhaustive de toutes les fonctionnalités commerciales de l'application.

## Préparation de recette et déploiement

Sur un environnement de recette avant activation publique :

1. Appliquer les deux migrations `20261007090000_fast_conquest.sql` puis `20261007091000_fast_conquest_shared_substitutes.sql`.
2. Déployer `supabase/functions/fast-conquest/index.ts` avec ses deux dépendances et `verify_jwt=true`. La clé service reste exclusivement dans l'Edge Function.
3. Publier les changements de la PR, vérifier les erreurs serveur et les conseils de sécurité Supabase, puis exécuter la recette connectée et PWA avant l'ouverture publique du format.
