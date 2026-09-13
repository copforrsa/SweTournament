# SWÉ Tournament V43.89

Cette version sépare l’origine financière d’un accès co-organisateur de l’état de son invitation.

- Les 11 co-organisateurs actifs historiques sont classés **Offerts**.
- Une invitation offerte ou payée reste dans cette catégorie même tant que le destinataire ne l’a pas acceptée.
- **En attente de paiement** est réservé aux invitations dont le co-organisateur doit réellement régler son propre accès.
- Le Super Admin voit l’email, le groupe, l’organisateur, le membre rattaché et le cycle de l’invitation.
- Le Super Admin peut reclasser un accès non personnel entre **Offert** et **Payé par l’organisateur**.
- Un abonnement personnel Stripe actif ne peut pas être reclassé manuellement.

La migration est additive et ne modifie aucune donnée de tournoi, d’équipe, de vote, de match ou de score.
