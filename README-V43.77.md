# V43.77 — Journal des utilisateurs et joueurs test

## Journal dans Rapports

Réutilise audit_logs et security_audit_log. Reprend 177 anciens événements d’audit, 7 événements de sécurité/paiement et 204 traces de notes, créations de tournois et inscriptions conservées en base. Les reconstructions sont explicitement signalées. Aucun auteur absent n’est inventé. L’historique passé reste non exhaustif.

Les mutations métier sont désormais journalisées côté serveur, y compris les opérations déclenchées par les liens publics et les traitements automatiques. Les buts conservent leur trigger d’audit existant. Les valeurs copiées sont limitées à une liste autorisée ; aucun jeton, mot de passe, référence Stripe ou coordonnées privées n’est copié. Les ouvertures de l’application sont enregistrées par compte connecté et par onglet, avec dédoublonnage serveur. Ceci ne constitue pas un suivi de tous les clics ni un historique des tentatives de connexion échouées.

Les anciens événements d’audit sont conservés dans le journal central même après suppression de leur groupe, sans doublon à l’affichage.

Lecture réservée au Super Admin : recherche, dates, pagination et détails avant/après lorsque disponibles.

## Groupe Joueurs test

Regroupement dans Joueurs SWÉ sans déplacer les fiches entre les workspaces. Un registre privé conserve leur provenance après suppression du tournoi test. 136 fiches fictives existantes ont été reconnues par leur provenance ; aucun compte auth réel n’est créé ou supprimé.

La suppression groupée demande confirmation, supprime uniquement la liste consultée et refuse les fiches réelles, liées à un compte, déplacées ou utilisées dans un tournoi extérieur. Les buts/passes fictifs et les inscriptions/affectations dépendantes sont supprimés ; les comptes utilisateurs réels restent intacts. Aucun nettoyage réel n’a été exécuté pendant la livraison.

Sauvegarde GitHub : backup/v43.76-before-journal-test-players.
Tests SQL avec rollback : droits, auteur, valeurs sensibles, provenance, suppression et préservation d’un joueur réel. Tests navigateur : filtres, pagination, échappement, confirmation/annulation et erreurs de suppression.
