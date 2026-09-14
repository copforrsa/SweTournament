Le paiement d'une invitation co-gestionnaire échouait avant Stripe : la fonction
déployée refusait OPTIONS lorsque SWE_ALLOWED_ORIGINS n'était pas défini et ne
renvoyait donc aucun en-tête CORS. La version d'achat administrateur avait déjà
le repli vers l'origine canonique, contrairement à celle des invitations.

Cette révision déploie le helper partagé à jour et utilise l'adresse canonique
de l'application comme retour par défaut. La session est vérifiée par
auth.getUser(token) dans le handler, puis l'e-mail, le type et l'état de
l'invitation sont contrôlés. Le réglage de passerelle verify_jwt=false ne
supprime pas l'authentification applicative.

L'invitation payante est distincte de l'acceptation gratuite et n'écrase plus les
autres invitations. Elle présente clairement un abonnement au rôle de
co-gestionnaire du groupe concerné, avec un profil joueur gratuit. Les doubles
clics sont bloqués et les nouvelles tentatives réutilisent la clé d'idempotence.
Le retour n'annonce l'activation qu'après lecture de payment_status=paid ET
accepted_at, puis sélectionne le bon espace. Le webhook déployé prend déjà en
charge activate_paid_coorganizer_invite ; aucune migration ni modification de
ce webhook n'est nécessaire.

Le profil conserve ses statistiques et actions joueur. Les informations,
préférences, état physique et historique deviennent des sections repliables.
Les éléments de formulaire sont déplacés sans être recréés et l'état ouvert
reste conservé. Aucun observateur permanent supplémentaire n'est ajouté.
L'achat générique d'accès reste réservé à l'administrateur de l'espace.

Validation : tests CORS, authentification, destinataire, invitation payante,
mensuel/annuel (199/1990 centimes), idempotence, erreurs réseau, coexistence des
invitations et conservation des formulaires. Les appels Stripe sont simulés
dans les tests : aucun paiement réel n'est exécuté.

Commandes :
    node --test tests/coorganizer-checkout.test.cjs tests/invite-checkout-r1.test.cjs
    SWE_TEST_JSDOM=/chemin/vers/jsdom node --test tests/player-invite-ui-r1.test.cjs

Destination application : dépôt copforrsa/SweTournament, branche main,
https://app.swetournament.fr/. Ne pas installer sur la vitrine OVH.
Fonction : stripe-create-invite-coorganizer-checkout, projet fbppesfxkvledwjemwsn,
inclure _shared/security.ts et utiliser le réglage présent dans config.toml.

Limite : l'aperçu local dans le navigateur distant a été refusé ; le rendu
connecté sur mobile et le paiement réel nécessitent une vérification utilisateur.
