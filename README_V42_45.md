# SWÉ Tournament 5/5 — V42.45

## Offre organisateur gratuite

- 15 joueurs enregistrés maximum.
- 1 Ligue active à la fois.
- 1 saison active à la fois.
- Classements de base disponibles.
- Tournois et modules premium désactivés hors essai/abonnement/accès spécial.
- Paiements désactivés en offre gratuite.
- Les Swés gratuits sont destinés aux complexes référencés SWÉ ; la gestion des lieux personnalisés sera rattachée aux offres payantes.

## Résiliation / retour au gratuit

Lors du passage d'une offre payante vers FREE, la date de résiliation et une échéance de conservation à 30 jours sont enregistrées. Seuls les 15 joueurs actifs les plus récents sont exposés à l'organisateur. Si l'abonnement est réactivé avant l'échéance, l'accès complet est restauré. Après l'échéance, les données privées des joueurs excédentaires sont supprimées et leur fiche est anonymisée/désactivée afin de conserver la cohérence des anciens résultats, buts et classements.

## Authentification

Le front V42.45 utilise le flux Supabase de confirmation d'e-mail lors de la création d'un compte et affiche clairement l'étape de validation. La vérification du téléphone nécessite un fournisseur SMS externe Supabase (Twilio, Vonage, MessageBird, etc.) et n'est pas activée tant qu'un fournisseur n'est pas configuré.

## Super administration

Ajout d'une simulation de vue client en lecture seule pour comparer rapidement les droits FREE / essai / abonnement sans agir au nom de l'utilisateur.

## Présentation des offres

La page de connexion affiche désormais un comparatif simple : Gratuit / Abonnement / Options à l'unité, avec la règle des 30 jours après résiliation.
