# Fast Conquête — état de développement

Ce dossier n'est pas chargé par l'application en production. Aucun tournoi, droit ou historique existant n'a été modifié.

## Moteur livré

`engine.cjs` définit les quatre phases et leurs 14 rencontres. Les qualifications ont deux tours, deux adversaires différents et deux terrains différents par équipe. Les transitions attendent toutes les rencontres obligatoires. Un départage parfait reste en attente de tirage aléatoire et de validation de l'organisateur. Les matchs décisifs utilisent trois tirs par équipe puis la mort subite ; les tirs ne changent pas les scores réglementaires. Les finales comportent exclusivement Carrefour et Mercedes. Les six places finales et le Roi du terrain sont calculés.

Validation : `node --test fast-conquest/engine.test.cjs` — neuf tests passent.

Ce moteur pur ne constitue pas une API autorisée : ses fonctions doivent être appelées exclusivement par l'adaptateur serveur après vérification des droits et des versions. Les snapshots clients ne doivent jamais être acceptés comme source de vérité.

## Audit initial et intégration restant à réaliser

- Les abonnements effectifs passent par `get_workspace_organizer_access`, `get_workspace_features_v2` et `private.swe_workspace_full_access`. Réutiliser les règles de plans, essais, cadeaux et droits temporaires existantes ; ne pas déduire l'accès d'une simple chaîne « Organisateur » ni d'un indicateur client.
- Ajouter `fast_conquest` aux contraintes de formats sans toucher les anciens formats. Utiliser des slots idempotents et verrouiller les transitions côté serveur. Les appels co-gestionnaire doivent être limités au tournoi désigné. Suppression réservée à l'administrateur autorisé et au super administrateur.
- Les composants Conquête historiques utilisent à la fois les valeurs `format`, `rotation_mode`, les libellés de noms, `rotation_role` et `competition_type`. Plusieurs reconnaissent « Conquête » par une expression régulière sur le nom. Exclure explicitement Fast Conquête de ces chemins avant d'activer son interface.
- Le moteur historique de matchs inclut des gardes contre les équipes simultanément affectées. Conserver un terrain prévu pour les qualifications futures et n'activer les affectations qu'au tour concerné.
- Les feuilles existantes rendent les notes de niveau définitives. Les notes éditables demandées doivent utiliser un brouillon confidentiel spécifique à Fast Conquête, puis un unique report à clôture pour éviter de cumuler les corrections dans l'équilibrage. Ne pas rendre les notes historiques modifiables.
- Réutiliser la composition organisateur et le salon existant, mais enregistrer explicitement le mode obligatoire et la liste des co-gestionnaires désignés. Ajouter échanges précis, commentaires confidentiels et verrouillage serveur des équipes.
- Ajouter le refus d'un remplaçant par une équipe avec une portée tournoi/équipe ; les affectations restent propres au match.
- Ajouter une confirmation des buteurs/passeurs par chacun des deux capitaines avant validation. Vérifier l'identité des capitaines côté serveur, sans contourner les droits de saisie des résultats.
- Intégrer l'identité terre cuite/bordeaux/noir, les rôles des trois terrains, la progression, le classement final et le Roi dans l'organisateur, le direct et la PWA.
- Vérifier les statistiques de saison : isoler qualifications, phases décisives et classement final ; ne pas réutiliser le classement qualificatif comme classement final.

## Recette restant requise avant production

Tests d'intégration SQL : droits authentifiés, droits expirés, changement de rôle, accès intergroupes, confidentialité des votes et notes, verrouillage des compositions, confirmations capitaines, concurrence de validations, idempotence, corrections administrateur et statistiques.

Tests UI : création et édition avec les deux modes, tournoi à six équipes, erreur de quota/terrains, ouverture et clôture de vote, refus remplaçant, qualification avec égalité parfaite, phases et finale.

Recette navigateur, Android PWA et iPhone PWA sur appareils réels, plus non-régression Championnat, Roi du terrain, Conquête classique et leurs historiques. Aucune de ces recettes d'intégration ou appareils n'est déclarée validée par les tests unitaires du moteur.
